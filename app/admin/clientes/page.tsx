
import { redirect } from "next/navigation";

import prisma from "@/utils/prisma";
import { requireAdmin } from "@/utils/auth/permissions";
import ClientsClient from "@/components/clients/ClientsClient";

export const instant = false;

export default async function ClientsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }

  const clients = await prisma.rfcLicense.findMany({
    where: {
      isAdmin: false,
    },
    select: {
      id: true,
      rfc: true,
      name: true,
      isActive: true,
      expiresAt: true,
      lastLoginAt: true,
      createdAt: true,
      notes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const serializedClients = clients.map((client) => ({
    ...client,
    expiresAt: client.expiresAt?.toISOString() ?? null,
    lastLoginAt: client.lastLoginAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
  }));

  return <ClientsClient clients={serializedClients} />;
}
