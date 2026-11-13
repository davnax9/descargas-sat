
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

const resultSchema = z.object({
  status: z.enum(["COMPLETED", "PARTIAL", "FAILED"]),
  documentsDownloaded: z.number().int().min(0),
  satRequestId: z.string().max(200).nullable().optional(),
  errorMessage: z.string().max(2000).nullable().optional(),
  packages: z.array(
    z.object({
      satPackageId: z.string().min(1).max(200),
      status: z.enum(["DOWNLOADED", "FAILED", "PENDING"]),
      documentCount: z.number().int().min(0),
    })
  ).max(1000).optional().default([]),
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
    const agent = await authenticateAgent(request);

    if (!agent) {
      return NextResponse.json(
        { error: "Agente no autorizado." },
        { status: 401 }
      );
    }

    const { jobId } = await context.params;

    const body = await request.json().catch(() => null);
    const validation = resultSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Resultado inválido.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const now = new Date();

    const success = await prisma.$transaction(async (tx) => {
      // Solo el dispositivo propietario del trabajo y con lease
      // vigente puede reportar el resultado.
      const updated = await tx.downloadRequest.updateMany({
        where: {
          id: jobId,
          assignedDeviceId: agent.id,
          status: "PROCESSING",
          leaseExpiresAt: {
            gt: now,
          },
        },
        data: {
          status: data.status,
          documentsDownloaded: data.documentsDownloaded,
          ...(data.satRequestId !== undefined
            ? { satRequestId: data.satRequestId }
            : {}),
          errorMessage: data.errorMessage ?? null,
          completedAt: now,
          leaseExpiresAt: null,
        },
      });

      if (updated.count === 0) {
        return false;
      }

      for (const item of data.packages) {
        const downloadedAt =
          item.status === "DOWNLOADED" ? now : null;

        await tx.downloadPackage.upsert({
          where: {
            requestId_satPackageId: {
              requestId: jobId,
              satPackageId: item.satPackageId,
            },
          },
          create: {
            requestId: jobId,
            satPackageId: item.satPackageId,
            status: item.status,
            documentCount: item.documentCount,
            downloadedAt,
          },
          update: {
            status: item.status,
            documentCount: item.documentCount,
            downloadedAt,
          },
        });
      }

      return true;
    });

    if (!success) {
      return NextResponse.json(
        {
          error: "El trabajo ya no está asignado a este dispositivo o su lease venció.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: data.status,
      documentsDownloaded: data.documentsDownloaded,
    });
  } catch (error) {
    console.error("Report result error:", error);

    return NextResponse.json(
      { error: "Error guardando el resultado del trabajo." },
      { status: 500 }
    );
  }
}
