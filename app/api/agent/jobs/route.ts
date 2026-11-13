
import { NextResponse, connection } from "next/server";
import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

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
    const agent = await authenticateAgent(request);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: "Agente no autorizado.",
        },
        { status: 401 },
      );
    }

    const now = new Date();
    const leaseExpiresAt = new Date(
      now.getTime() + LEASE_DURATION_MINUTES * 60 * 1000,
    );

    // Si este dispositivo ya tiene una tarea activa,
    // renovamos su asignación y devolvemos esa tarea.
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

    // Buscar una solicitud pendiente o una asignación vencida.
    const candidate = await prisma.downloadRequest.findFirst({
      where: {
        licenseId: agent.licenseId,
        OR: [
          {
            status: "PENDING",
          },
          {
            status: "PROCESSING",
            leaseExpiresAt: {
              lte: now,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!candidate) {
      return NextResponse.json({
        success: true,
        job: null,
        message: "No hay trabajos pendientes.",
      });
    }

    // Reclamo atómico: solamente un agente podrá ganar
    // la asignación de esta solicitud.
    const claimed = await prisma.downloadRequest.updateMany({
      where: {
        id: candidate.id,
        licenseId: agent.licenseId,
        OR: [
          {
            status: "PENDING",
          },
          {
            status: "PROCESSING",
            leaseExpiresAt: {
              lte: now,
            },
          },
        ],
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
      job: job ? formatJob(job, false) : null,
      resumed: false,
    });
  } catch (error) {
    console.error("Error consultando trabajos del agente:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible consultar los trabajos.",
      },
      { status: 500 },
    );
  }
}
