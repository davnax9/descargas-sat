
import { NextResponse } from "next/server";
import {
  createPrivateKey,
  sign,
} from "node:crypto";

import prisma from "@/utils/prisma";
import { getCurrentLicense } from "@/utils/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const license = await getCurrentLicense();

    if (!license || license.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    const downloadRequest = await prisma.downloadRequest.findFirst({
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

    if (!downloadRequest) {
      return NextResponse.json(
        { error: "Descarga no encontrada o no autorizada." },
        { status: 404 }
      );
    }

    const privateKeyBase64 =
      process.env.DOWNLOAD_TOKEN_PRIVATE_KEY?.trim();

    if (!privateKeyBase64) {
      console.error(
        "Falta configurar DOWNLOAD_TOKEN_PRIVATE_KEY."
      );

      return NextResponse.json(
        { error: "Error de configuración del servidor." },
        { status: 500 }
      );
    }

    const privateKey = createPrivateKey({
      key: Buffer.from(privateKeyBase64, "base64"),
      format: "der",
      type: "pkcs8",
    });

    if (privateKey.asymmetricKeyType !== "ed25519") {
      throw new Error(
        "DOWNLOAD_TOKEN_PRIVATE_KEY no es una clave Ed25519."
      );
    }

    const payload = {
      jobId: downloadRequest.id,
      licenseId: license.id,
      exp: Math.floor(Date.now() / 1000) + 300,
    };

    const encodedPayload = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64url");

    const signature = sign(
      null,
      Buffer.from(encodedPayload),
      privateKey
    ).toString("base64url");

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
    console.error(
      "Error generando token de descarga:",
      error
    );

    return NextResponse.json(
      { error: "No fue posible generar el token de descarga." },
      { status: 500 }
    );
  }
}
