
"use server";

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import prisma from "@/utils/prisma";
import { requireClient } from "@/utils/auth/permissions";

const PAIRING_DURATION_MINUTES = 10;

export async function createAgentPairingCode() {
  try {
    const account = await requireClient();

    const code = randomBytes(32).toString("base64url");

    const codeHash = createHash("sha256")
      .update(code)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + PAIRING_DURATION_MINUTES * 60 * 1000,
    );

    await prisma.agentPairingCode.create({
      data: {
        licenseId: account.id,
        codeHash,
        expiresAt,
      },
    });

    return {
      success: true,
      code,
      expiresAt,
    };
  } catch (error) {
    console.error("Error creando código de emparejamiento:", error);

    return {
      success: false,
      message: "No fue posible generar el código de emparejamiento.",
    };
  }
}

export async function getAgentDevices() {
  const account = await requireClient();

  const devices = await prisma.agentDevice.findMany({
    where: {
      licenseId: account.id,
    },
    select: {
      id: true,
      name: true,
      platform: true,
      agentVersion: true,
      isActive: true,
      lastSeenAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return devices.map((device) => ({
    ...device,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
  }));
}

export async function revokeAgentDevice(deviceId: string) {
  const account = await requireClient();

  const result = await prisma.agentDevice.updateMany({
    where: {
      id: deviceId,
      licenseId: account.id,
      isActive: true,
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  });

  return {
    success: result.count > 0,
  };
}