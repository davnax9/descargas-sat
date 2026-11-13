import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

const HEARTBEAT_DURATION_MINUTES = 5;

const heartbeatSchema = z.object({
  jobId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const agent = await authenticateAgent(request);

    if (!agent) {
      return NextResponse.json(
        { error: "Agente no autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = heartbeatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos de heartbeat inválidos." },
        { status: 400 }
      );
    }

    const now = new Date();

    const leaseExpiresAt = new Date(
      now.getTime() + HEARTBEAT_DURATION_MINUTES * 60 * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      await tx.agentDevice.update({
        where: {
          id: agent.id,
        },
        data: {
          lastSeenAt: now,
        },
      });

      if (!validation.data.jobId) {
        return { renewed: false };
      }

      const updated = await tx.downloadRequest.updateMany({
        where: {
          id: validation.data.jobId,
          assignedDeviceId: agent.id,
          status: "PROCESSING",
          leaseExpiresAt: {
            gt: now,
          },
        },
        data: {
          leaseExpiresAt,
        },
      });

      return {
        renewed: updated.count > 0,
      };
    });

    if (validation.data.jobId && !result.renewed) {
      return NextResponse.json(
        {
          error: "El trabajo ya no está asignado a este dispositivo.",
          renewed: false,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      renewed: result.renewed,
      leaseExpiresAt: validation.data.jobId
        ? leaseExpiresAt.toISOString()
        : null,
    });
  } catch (error) {
    console.error("Heartbeat error:", error);

    return NextResponse.json(
      { error: "Error procesando heartbeat." },
      { status: 500 }
    );
  }
}