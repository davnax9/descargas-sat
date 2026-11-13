
import "dotenv/config";

import { input, password } from "@inquirer/prompts";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está configurada");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("\n=== CREAR ADMINISTRADOR CFDI LOCAL ===\n");

  const existingAdmin = await prisma.rfcLicense.findFirst({
    where: { isAdmin: true },
    select: { id: true, rfc: true },
  });

  if (existingAdmin) {
    throw new Error(
      `Ya existe un administrador registrado: ${existingAdmin.rfc}`
    );
  }

  const rfc = (
    await input({
      message: "RFC del administrador:",
      transformer: (value) => value.toUpperCase(),
      validate: (value) =>
        /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(
          value.trim().toUpperCase()
        ) || "El RFC no tiene un formato válido",
    })
  ).trim().toUpperCase();

  const adminPassword = await password({
    message: "Contraseña del administrador:",
    mask: "*",
    validate: (value) =>
      value.length >= 12 ||
      "La contraseña debe tener al menos 12 caracteres",
  });

  const passwordConfirmation = await password({
    message: "Confirma la contraseña:",
    mask: "*",
  });

  if (adminPassword !== passwordConfirmation) {
    throw new Error("Las contraseñas no coinciden");
  }

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  const admin = await prisma.rfcLicense.create({
    data: {
      rfc,
      passwordHash,
      isAdmin: true,
      isActive: true,
      expiresAt: null,
    },
  });

  console.log("\nAdministrador creado correctamente.");
  console.log(`RFC: ${admin.rfc}`);
  console.log(`ID: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error("\nError al crear administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
