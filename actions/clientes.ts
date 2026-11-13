
"use server";

import "server-only";

import argon2 from "argon2";
import { z } from "zod";

import prisma from "@/utils/prisma";
import { requireAdmin } from "@/utils/auth/permissions";

const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const createClientSchema = z.object({
  rfc: z.string().trim().toUpperCase().regex(rfcRegex, "RFC inválido"),
  name: z.string().trim().min(2, "Ingresa el nombre del cliente").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(200),
  expiresAt: z.string().min(1, "Selecciona la vigencia"),
  notes: z.string().max(500).optional(),
});

const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  expiresAt: z.string().min(1),
  notes: z.string().max(500).optional(),
  password: z.string().max(200).optional(),
});

function parseExpiration(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

export async function createClientAction(formData: FormData) {
  try {
    await requireAdmin();

    const validation = createClientSchema.safeParse({
      rfc: formData.get("rfc"),
      name: formData.get("name"),
      password: formData.get("password"),
      expiresAt: formData.get("expiresAt"),
      notes: formData.get("notes") || "",
    });

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0].message,
      };
    }

    const data = validation.data;
    const expiresAt = parseExpiration(data.expiresAt);

    if (!expiresAt || expiresAt <= new Date()) {
      return {
        success: false,
        message: "La fecha de vencimiento debe ser futura.",
      };
    }

    const passwordHash = await argon2.hash(data.password);

    await prisma.rfcLicense.create({
      data: {
        rfc: data.rfc,
        name: data.name,
        passwordHash,
        passwordChangedAt: new Date(),
        expiresAt,
        notes: data.notes,
        isAdmin: false,
        isActive: true,
      },
    });

    return {
      success: true,
      message: "Cliente registrado correctamente.",
    };
  } catch (error) {
    console.error("Error creating client:", error);

    return {
      success: false,
      message: "No fue posible registrar el cliente. Verifica que el RFC no esté registrado.",
    };
  }
}

export async function updateClientAction(formData: FormData) {
  try {
    await requireAdmin();

    const validation = updateClientSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      expiresAt: formData.get("expiresAt"),
      notes: formData.get("notes") || "",
      password: formData.get("password") || "",
    });

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0].message,
      };
    }

    const data = validation.data;
    const expiresAt = parseExpiration(data.expiresAt);

    if (!expiresAt) {
      return {
        success: false,
        message: "Fecha de vencimiento inválida.",
      };
    }

    const client = await prisma.rfcLicense.findUnique({
      where: { id: data.id },
    });

    if (!client || client.isAdmin) {
      return {
        success: false,
        message: "Cliente no encontrado.",
      };
    }

    const passwordHash = data.password
      ? await argon2.hash(data.password)
      : undefined;

    await prisma.rfcLicense.update({
      where: { id: data.id },
      data: {
        name: data.name,
        notes: data.notes,
        expiresAt,
        ...(passwordHash
          ? {
              passwordHash,
              passwordChangedAt: new Date(),
            }
          : {}),
      },
    });

    return {
      success: true,
      message: "Cliente actualizado correctamente.",
    };
  } catch (error) {
    console.error("Error updating client:", error);

    return {
      success: false,
      message: "No fue posible actualizar el cliente.",
    };
  }
}

export async function toggleClientStatusAction(id: string) {
  try {
    await requireAdmin();

    if (!z.string().uuid().safeParse(id).success) {
      return {
        success: false,
        message: "Identificador inválido.",
      };
    }

    const client = await prisma.rfcLicense.findUnique({
      where: { id },
    });

    if (!client || client.isAdmin) {
      return {
        success: false,
        message: "Cliente no encontrado.",
      };
    }

    await prisma.rfcLicense.update({
      where: { id },
      data: {
        isActive: !client.isActive,
      },
    });

    return {
      success: true,
      message: client.isActive
        ? "Cliente desactivado correctamente."
        : "Cliente activado correctamente.",
    };
  } catch (error) {
    console.error("Error changing client status:", error);

    return {
      success: false,
      message: "No fue posible modificar el estado del cliente.",
    };
  }
}
