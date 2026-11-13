
import "server-only";

import { createHash } from "node:crypto";
import prisma from "@/utils/prisma";

function hashValue(value: string) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function authenticateAgent(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token || token.length > 200) {
    return null;
  }

  const tokenHash = hashValue(token);

  const device = await prisma.agentDevice.findUnique({
    where: {
      tokenHash,
    },
    include: {
      license: {
        select: {
          id: true,
          isActive: true,
          isAdmin: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!device || !device.isActive || device.revokedAt) {
    return null;
  }

  const now = new Date();

  if (!device.license.isActive) {
    return null;
  }

  if (
    !device.license.isAdmin &&
    (!device.license.expiresAt || device.license.expiresAt <= now)
  ) {
    return null;
  }

  await prisma.agentDevice.update({
    where: {
      id: device.id,
    },
    data: {
      lastSeenAt: now,
    },
  });

  return {
    id: device.id,
    licenseId: device.licenseId,
  };
}
