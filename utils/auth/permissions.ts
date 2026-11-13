
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
