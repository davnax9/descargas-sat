
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type FielAction = "status" | "configure" | "unlink";

export type FielTicketPayload = {
  sub: string;
  rfc: string;
  deviceId: string;
  action: FielAction;
  exp: number;
  iat: number;
  jti: string;
};

const usedTickets = new Map<string, number>();

function getSecret() {
  const secret = process.env.FIEL_ACTION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "FIEL_ACTION_SECRET no está configurada en el agente."
    );
  }

  return secret;
}

function decodePart(value: string) {
  return JSON.parse(
    Buffer.from(value, "base64url").toString("utf8")
  );
}

function cleanupUsedTickets() {
  const now = Math.floor(Date.now() / 1000);

  for (const [jti, expiresAt] of usedTickets.entries()) {
    if (expiresAt <= now) {
      usedTickets.delete(jti);
    }
  }
}

export function verifyFielTicket(
  token: string,
  expectedAction: FielAction
): FielTicketPayload {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Ticket de autorización inválido.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Algoritmo de ticket no permitido.");
  }

  const expectedSignature = createHmac(
    "sha256",
    getSecret()
  )
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  const receivedSignature = Buffer.from(
    signature,
    "base64url"
  );

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new Error("Firma del ticket inválida.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    typeof payload.iat !== "number" ||
    payload.iat > now + 10
  ) {
    throw new Error("El ticket ha vencido o no es válido.");
  }

  if (
    payload.action !== expectedAction ||
    typeof payload.sub !== "string" ||
    typeof payload.rfc !== "string" ||
    typeof payload.deviceId !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("El ticket no autoriza esta operación.");
  }

  cleanupUsedTickets();

  if (usedTickets.has(payload.jti)) {
    throw new Error("Este ticket ya fue utilizado.");
  }

  usedTickets.set(payload.jti, payload.exp);

  return payload as FielTicketPayload;
}
