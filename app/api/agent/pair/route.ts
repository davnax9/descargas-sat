
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { getLicenseStatus } from "@/utils/auth/license-status";

const pairSchema = z.object({
  code: z.string().min(30).max(100),
  deviceName: z.string().trim().min(1).max(100),
  platform: z.enum(["WINDOWS_10", "WINDOWS_11"]),
  agentVersion: z.string().trim().min(1).max(30),
});

function hashValue(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = pairSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Los datos de emparejamiento no son válidos.",
        },
        { status: 400 },
      );
    }

    const { code, deviceName, platform, agentVersion } = validation.data;

    const codeHash = hashValue(code);
    const now = new Date();

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashValue(token);

    const result = await prisma.$transaction(async (tx) => {
      const pairingCode = await tx.agentPairingCode.findUnique({
        where: { codeHash },
        include: {
          license: true,
        },
      });

      if (
        !pairingCode ||
        pairingCode.consumedAt ||
        pairingCode.expiresAt <= now
      ) {
        throw new Error("INVALID_PAIRING_CODE");
      }

      const license = pairingCode.license;

      const licenseStatus = getLicenseStatus(license, now);

      if (licenseStatus === "DISABLED") {
        throw new Error("INACTIVE_LICENSE");
      }

      if (licenseStatus !== "ACTIVE") {
        throw new Error(
          licenseStatus === "GRACE_PERIOD"
            ? "GRACE_PERIOD_LICENSE"
            : "EXPIRED_LICENSE"
        );
      }

      const consumed = await tx.agentPairingCode.updateMany({
        where: {
          id: pairingCode.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          consumedAt: now,
        },
      });

      if (consumed.count !== 1) {
        throw new Error("INVALID_PAIRING_CODE");
      }

      const device = await tx.agentDevice.create({
        data: {
          licenseId: license.id,
          name: deviceName,
          platform,
          agentVersion,
          tokenHash,
          lastSeenAt: now,
        },
        select: {
          id: true,
          name: true,
          platform: true,
          agentVersion: true,
          createdAt: true,
        },
      });

      return device;
    });

    return NextResponse.json({
      success: true,
      message: "Computadora vinculada correctamente.",
      device: result,
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_PAIRING_CODE":
          return NextResponse.json(
            {
              success: false,
              message: "El código es inválido, ya fue utilizado o ha vencido.",
            },
            { status: 401 },
          );

        case "INACTIVE_LICENSE":
          return NextResponse.json(
            {
              success: false,
              message: "La licencia se encuentra desactivada.",
            },
            { status: 403 },
          );

        case "EXPIRED_LICENSE":
          return NextResponse.json(
            {
              success: false,
              message: "La licencia ha vencido.",
            },
            { status: 403 },
          );

        case "GRACE_PERIOD_LICENSE":
          return NextResponse.json(
            {
              success: false,
              message:
                "Tu licencia está en periodo de gracia. No puedes vincular nuevas computadoras hasta renovarla.",
            },
            { status: 403 }
          );
      }
    }

    console.error("Error vinculando agente:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No fue posible vincular la computadora.",
      },
      { status: 500 },
    );
  }
}
