
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";

import { getCurrentLicense } from "@/utils/auth/session";
import prisma from "@/utils/prisma";

// export const runtime = "nodejs";

const TICKET_DURATION = "60s";

function getTicketSecret() {
  const secret = process.env.FIEL_ACTION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "FIEL_ACTION_SECRET no está configurada correctamente."
    );
  }

  return new TextEncoder().encode(secret);
}

const allowedActions = ["status", "configure", "unlink"] as const;

type FielAction = (typeof allowedActions)[number];

export async function POST(request: NextRequest) {
  try {
    // Evitar solicitudes desde otros orígenes.
    const origin = request.headers.get("origin");
    const ownOrigin = new URL(request.url).origin;

    if (!origin || origin !== ownOrigin) {
      return NextResponse.json(
        { ok: false, error: "Origen no autorizado." },
        { status: 403 }
      );
    }

    const license = await getCurrentLicense();

    if (!license || license.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Sesión de cliente no válida." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const action = body?.action as FielAction;

    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Operación no válida." },
        { status: 400 }
      );
    }

    // Debe existir un dispositivo activo vinculado a esta licencia.
    const device = await prisma.agentDevice.findFirst({
      where: {
        licenseId: license.id,
        isActive: true,
        revokedAt: null,
      },
      select: {
        id: true,
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });

    if (!device) {
      return NextResponse.json(
        {
          ok: false,
          error: "No tienes un agente activo vinculado a esta licencia.",
        },
        { status: 409 }
      );
    }

    const token = await new SignJWT({
      rfc: license.rfc.toUpperCase(),
      deviceId: device.id,
      action,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(license.id)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(TICKET_DURATION)
      .sign(getTicketSecret());

    return NextResponse.json({
      ok: true,
      token,
      expiresIn: 60,
    });
  } catch (error) {
    console.error("Error al emitir ticket de e.firma:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "No fue posible autorizar la operación.",
      },
      { status: 500 }
    );
  }
}
