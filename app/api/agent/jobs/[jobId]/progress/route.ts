
import { NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

const progressSchema = z.object({
  satRequestId: z.string().min(1).max(200),
});

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const agent = await authenticateAgent(request, {
      allowGrace: true,
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agente no autorizado." },
        { status: 401 }
      );
    }

    const { jobId } = await context.params;

    const body = await request.json().catch(() => null);
    const validation = progressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Identificador SAT inválido." },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.downloadRequest.updateMany({
      where: {
        id: jobId,
        assignedDeviceId: agent.id,
        licenseId: agent.licenseId,
        status: "PROCESSING",
        leaseExpiresAt: {
          gt: now,
        },
      },
      data: {
        satRequestId: validation.data.satRequestId,
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        {
          error: "No se pudo guardar el identificador. El trabajo ya no pertenece a este dispositivo o venció su lease.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      satRequestId: validation.data.satRequestId,
    });
  } catch (error) {
    console.error("Error guardando progreso SAT:", error);

    return NextResponse.json(
      { error: "No fue posible guardar el progreso SAT." },
      { status: 500 }
    );
  }
}
