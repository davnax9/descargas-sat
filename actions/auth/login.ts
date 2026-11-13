
"use server";

import argon2 from "argon2";
import { z } from "zod";

import prisma from "@/utils/prisma";
import { createSession } from "@/utils/auth/session";

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

  if (
    !account.isAdmin &&
    (!account.expiresAt || account.expiresAt <= new Date())
  ) {
    return {
      success: false,
      message: "Tu licencia ha vencido. Contacta al administrador.",
    };
  }

  await prisma.rfcLicense.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(account.id);

  return {
    success: true,
    isAdmin: account.isAdmin,
    message: "Inicio de sesión correcto.",
  };
}
