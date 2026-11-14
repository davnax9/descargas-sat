
import { NextResponse, connection } from "next/server";
import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

const LEASE_DURATION_MINUTES = 5;

function formatJob(
  job: {
    id: string;
    startDate: Date;
    endDate: Date;
    requestType: "ISSUED" | "RECEIVED";
    downloadFormat: "XML" | "METADATA";
    attempts: number;
    satRequestId: string | null;
  },
  resumed = false
) {
  return {
    id: job.id,
    startDate: job.startDate.toISOString().slice(0, 10),
    endDate: job.endDate.toISOString().slice(0, 10),
    requestType: job.requestType,
    downloadFormat: job.downloadFormat,
    attempts: job.attempts,
    satRequestId: job.satRequestId,
    resumed,
  };
}

export async function GET(request: Request) {
  await connection();

  try {
    // Esta ruta sí admite agentes durante la gracia,
    // pero solamente para reanudar trabajos existentes.
    const agent = await authenticateAgent(request, {
      allowGrace: true,
    });

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: "Agente no autorizado o licencia vencida.",
        },
        { status: 401 }
      );
    }

    const isInGrace = agent.licenseStatus === "GRACE_PERIOD";

    const now = new Date();

    const leaseExpiresAt = new Date(
      now.getTime() + LEASE_DURATION_MINUTES * 60 * 1000
    );

    // Primero buscamos un trabajo que esta computadora
    // ya estaba procesando y cuya asignación sigue vigente.
    const activeJob = await prisma.downloadRequest.findFirst({
      where: {
        licenseId: agent.licenseId,
        assignedDeviceId: agent.id,
        status: "PROCESSING",
        leaseExpiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (activeJob) {
      await prisma.downloadRequest.update({
        where: {
          id: activeJob.id,
        },
        data: {
          leaseExpiresAt,
        },
      });

      return NextResponse.json({
        success: true,
        job: formatJob(activeJob, true),
        resumed: true,
      });
    }

    // Durante la gracia solamente se permite recuperar
    // un trabajo PROCESSING que pertenecía a este dispositivo.
    const candidate = await prisma.downloadRequest.findFirst({
      where: {
        licenseId: agent.licenseId,
        ...(isInGrace
          ? {
              status: "PROCESSING" as const,
              assignedDeviceId: agent.id,
              leaseExpiresAt: {
                lte: now,
              },
            }
          : {
              OR: [
                {
                  status: "PENDING" as const,
                },
                {
                  status: "PROCESSING" as const,
                  leaseExpiresAt: {
                    lte: now,
                  },
                },
              ],
            }),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!candidate) {
      return NextResponse.json({
        success: true,
        job: null,
        message: isInGrace
          ? "No hay trabajos anteriores que puedan reanudarse."
          : "No hay trabajos pendientes.",
      });
    }

    // Reclamo atómico del trabajo.
    const claimed = await prisma.downloadRequest.updateMany({
      where: {
        id: candidate.id,
        licenseId: agent.licenseId,
        ...(isInGrace
          ? {
              status: "PROCESSING" as const,
              assignedDeviceId: agent.id,
              leaseExpiresAt: {
                lte: now,
              },
            }
          : {
              OR: [
                {
                  status: "PENDING" as const,
                },
                {
                  status: "PROCESSING" as const,
                  leaseExpiresAt: {
                    lte: now,
                  },
                },
              ],
            }),
      },
      data: {
        status: "PROCESSING",
        assignedDeviceId: agent.id,
        attempts: {
          increment: 1,
        },
        startedAt: now,
        leaseExpiresAt,
        errorMessage: null,
      },
    });

    if (claimed.count !== 1) {
      return NextResponse.json({
        success: true,
        job: null,
        message: "El trabajo fue asignado a otro agente.",
      });
    }

    const job = await prisma.downloadRequest.findUnique({
      where: {
        id: candidate.id,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        requestType: true,
        downloadFormat: true,
        attempts: true,
        satRequestId: true,
      },
    });

    return NextResponse.json({
      success: true,
      job: job ? formatJob(job, true) : null,
      resumed: true,
    });
  } catch (error) {
    console.error("Error consultando trabajos del agente:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar los trabajos.",
      },
      { status: 500 }
    );
  }
}
