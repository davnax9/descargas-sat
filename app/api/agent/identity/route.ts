
import { connection, NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { authenticateAgent } from "@/utils/agent/auth";

export async function GET(request: Request) {
  await connection();

  const agent = await authenticateAgent(request);

  if (!agent) {
    return NextResponse.json(
      { error: "Agente no autorizado." },
      { status: 401 }
    );
  }

  const license = await prisma.rfcLicense.findUnique({
    where: { id: agent.licenseId },
    select: {
      rfc: true,
      isActive: true,
      isAdmin: true,
      expiresAt: true,
    },
  });

  if (!license) {
    return NextResponse.json(
      { error: "Licencia no disponible." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    rfc: license.rfc,
  });
}
