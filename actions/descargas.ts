
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/utils/prisma";
import { requireActiveClient } from "@/utils/auth/permissions";

type DownloadActionResult =
  | {
      success: true;
      message: string;
      request: {
        id: string;
        requestType: "ISSUED" | "RECEIVED";
        downloadFormat: "XML" | "METADATA";
        startDate: string;
        endDate: string;
        status:
          | "PENDING"
          | "PROCESSING"
          | "COMPLETED"
          | "PARTIAL"
          | "FAILED";
        createdAt: string;
      };
    }
  | {
      success: false;
      error: string;
    };

const downloadSchema = z.object({
  requestType: z.enum(["ISSUED", "RECEIVED"]),
  downloadFormat: z.enum(["XML", "METADATA"]).default("XML"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inicial inválida."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha final inválida."),
});

export async function createDownloadRequest(input: {
  requestType: "ISSUED" | "RECEIVED";
  downloadFormat?: "XML" | "METADATA";
  startDate: string;
  endDate: string;
}): Promise<DownloadActionResult> {
  try {
    // Solo permite crear solicitudes con licencia vigente.
    const license = await requireActiveClient();

    const parsed = downloadSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Los datos de la solicitud no son válidos.",
      };
    }

    const {
      requestType,
      downloadFormat,
      startDate,
      endDate,
    } = parsed.data;

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (start > end) {
      return {
        success: false,
        error: "La fecha inicial no puede ser posterior a la fecha final.",
      };
    }

    if (end > today) {
      return {
        success: false,
        error: "No puedes solicitar comprobantes de fechas futuras.",
      };
    }

    const activeDevice = await prisma.agentDevice.findFirst({
      where: {
        licenseId: license.id,
        isActive: true,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!activeDevice) {
      return {
        success: false,
        error:
          "No tienes un agente local vinculado. Vincula tu equipo antes de solicitar descargas.",
      };
    }

    const request = await prisma.downloadRequest.create({
      data: {
        licenseId: license.id,
        requestType,
        downloadFormat,
        startDate: start,
        endDate: end,
        status: "PENDING",
      },
      select: {
        id: true,
        requestType: true,
        downloadFormat: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
      },
    });

    revalidatePath("/dashboard/descargas");

    return {
      success: true,
      message:
        "La solicitud se creó correctamente. El agente local podrá procesarla.",
      request: {
        ...request,
        startDate: request.startDate.toISOString().slice(0, 10),
        endDate: request.endDate.toISOString().slice(0, 10),
        createdAt: request.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("createDownloadRequest:", error);

    const message =
      error instanceof Error &&
      error.message.includes("licencia no está vigente")
        ? error.message
        : "Tu sesión ha expirado o no tienes permisos para crear solicitudes.";

    return {
      success: false,
      error: message,
    };
  }
}
