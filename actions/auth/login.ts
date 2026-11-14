
"use server";

import argon2 from "argon2";
import { z } from "zod";

import prisma from "@/utils/prisma";
import { createSession } from "@/utils/auth/session";

import {
  getGraceDaysRemaining,
  getLicenseStatus,
} from "@/utils/auth/license-status";

const loginSchema = z.object({
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido"),

  password: z.string().min(1).max(200),
});

export async function loginAction(formData: FormData) {
  const validation = loginSchema.safeParse({
    rfc: formData.get("rfc"),
    password: formData.get("password"),
  });

  if (!validation.success) {
    return {
      success: false,
      message: "Verifica el RFC y la contraseña.",
    };
  }

  const { rfc, password } = validation.data;

  const account = await prisma.rfcLicense.findUnique({
    where: { rfc },
  });

  if (!account || !account.isActive) {
    return {
      success: false,
      message: "RFC o contraseña incorrectos, o cuenta inactiva.",
    };
  }

  const passwordValid = await argon2.verify(
    account.passwordHash,
    password
  );

  if (!passwordValid) {
    return {
      success: false,
      message: "RFC o contraseña incorrectos.",
    };
  }

  const licenseStatus = getLicenseStatus(account);

  if (licenseStatus === "EXPIRED") {
    return {
      success: false,
      message:
        "Tu periodo de gracia ha terminado. Contacta al administrador para reactivar tu licencia.",
    };
  }

  await prisma.rfcLicense.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(account.id);

  const graceDaysRemaining =
    licenseStatus === "GRACE_PERIOD" && account.expiresAt
      ? getGraceDaysRemaining(account.expiresAt)
      : null;

  return {
    success: true,
    isAdmin: account.isAdmin,
    licenseStatus,
    graceDaysRemaining,
    message:
      licenseStatus === "GRACE_PERIOD"
        ? `Tu licencia ha vencido. Te quedan ${graceDaysRemaining} días de periodo de gracia.`
        : "Inicio de sesión correcto.",
  };
}
