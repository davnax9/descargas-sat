
import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "@/utils/prisma";

import {
  getGraceDaysRemaining,
  getLicenseStatus,
} from "@/utils/auth/license-status";

const COOKIE_NAME = "cfdi_session";
const SESSION_DURATION = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET no está configurado correctamente");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    return typeof payload.sub === "string"
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

export async function getCurrentLicense() {
  const userId = await getSessionUserId();

  if (!userId) return null;

  const account = await prisma.rfcLicense.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rfc: true,
      name: true,
      isAdmin: true,
      isActive: true,
      expiresAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!account || !account.isActive) {
    return null;
  }

  const licenseStatus = getLicenseStatus(account);

  if (
    licenseStatus === "EXPIRED" ||
    licenseStatus === "DISABLED"
  ) {
    return null;
  }

  const graceDaysRemaining =
    licenseStatus === "GRACE_PERIOD" && account.expiresAt
      ? getGraceDaysRemaining(account.expiresAt)
      : null;

  return {
    ...account,
    licenseStatus,
    graceDaysRemaining,
  };
}
