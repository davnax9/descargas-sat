
import "server-only";

import { getCurrentLicense } from "@/utils/auth/session";

export async function requireAdmin() {
  const account = await getCurrentLicense();

  if (!account || !account.isAdmin) {
    throw new Error(
      "No tienes permisos para realizar esta acción."
    );
  }

  return account;
}

export async function requireClient() {
  const account = await getCurrentLicense();

  if (!account || account.isAdmin) {
    throw new Error(
      "No tienes permisos para acceder a esta sección."
    );
  }

  return account;
}

export async function requireActiveClient() {
  const account = await requireClient();

  if (account.licenseStatus !== "ACTIVE") {
    throw new Error(
      "Tu licencia no está vigente. Renueva tu licencia para realizar esta operación."
    );
  }

  return account;
}
