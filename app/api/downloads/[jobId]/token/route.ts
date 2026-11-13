
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

import prisma from "@/utils/prisma";
import { getCurrentLicense } from "@/utils/auth/session";

export const instant = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const license = await getCurrentLicense();

    if (!license || license.isAdmin) {
      return NextResponse.json(
        { error: "No tienes autorización para descargar estos archivos." },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    const request = await prisma.downloadRequest.findFirst({
      where: {
        id: jobId,
        licenseId: license.id,
        status: {
          in: ["COMPLETED", "PARTIAL"],
        },
        documentsDownloaded: {
          gt: 0,
        },
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "La solicitud no existe o no tiene archivos disponibles." },
        { status: 404 }
      );
    }

    const secret = process.env.DOWNLOAD_TOKEN_SECRET;

    if (!secret || secret.length < 32) {
      console.error("DOWNLOAD_TOKEN_SECRET no está configurado correctamente.");

      return NextResponse.json(
        { error: "La autorización de descargas no está configurada." },
        { status: 500 }
      );
    }

    const payload = {
      jobId: request.id,
      licenseId: license.id,
      exp: Math.floor(Date.now() / 1000) + 300,
    };

    const encodedPayload = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64url");

    const signature = createHmac("sha256", secret)
      .update(encodedPayload)
      .digest("base64url");

    const token = `${encodedPayload}.${signature}`;

    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error generando token de descarga:", error);

    return NextResponse.json(
      { error: "No fue posible autorizar la descarga." },
      { status: 500 }
    );
  }
}
