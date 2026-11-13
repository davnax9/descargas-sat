
import os from "node:os";
import { getRemoteConfig } from "../config/remote.js";
import { saveAgentCredentials } from "../security/credentials.js";

const AGENT_VERSION = "0.1.0";

export class PairingError extends Error {
  constructor(
    message: string,
    public status: number = 502,
  ) {
    super(message);
    this.name = "PairingError";
  }
}

function getWindowsPlatform(): "WINDOWS_10" | "WINDOWS_11" {
  const build = Number(os.release().split(".")[2] ?? 0);

  return build >= 22000 ? "WINDOWS_11" : "WINDOWS_10";
}

export async function pairAgentWithCode(code: string) {
  if (process.platform !== "win32") {
    throw new PairingError(
      "Este agente está preparado para Windows.",
      400,
    );
  }

  const { baseUrl } = getRemoteConfig();

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/agent/pair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        deviceName: os.hostname(),
        platform: getWindowsPlatform(),
        agentVersion: AGENT_VERSION,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new PairingError(
      "No fue posible comunicarse con CFDI Local.",
      502,
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new PairingError(
      result?.message ||
        result?.error ||
        "No fue posible vincular la computadora.",
      response.status,
    );
  }

  if (
    result?.success !== true ||
    typeof result?.token !== "string" ||
    typeof result?.device?.id !== "string"
  ) {
    throw new PairingError(
      "El servidor devolvió una respuesta de vinculación inválida.",
      502,
    );
  }

  // El token nunca se devuelve al navegador.
  // Se almacena directamente en Windows Credential Manager.
  saveAgentCredentials(
    result.token,
    result.device.id,
  );

  return {
    device: result.device,
    message: result.message,
  };
}
