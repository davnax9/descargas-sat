
import { getAgentCredentials } from "../security/credentials.js";
import { getRemoteConfig } from "../config/remote.js";
import { getFielInfo } from "../services/fiel-info.js";

async function main() {
  try {
    const agent = getAgentCredentials();

    if (!agent) {
      throw new Error("El agente todavía no está vinculado.");
    }

    console.log("Leyendo identidad del certificado...");

    const fiel = getFielInfo();

    console.log("Consultando RFC de la licencia...");

    const { baseUrl } = getRemoteConfig();

    const response = await fetch(
      `${baseUrl}/api/agent/identity`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${agent.token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ?? "No fue posible consultar la licencia."
      );
    }

    const expectedRfc = String(result.rfc).toUpperCase();

    console.log("\nIdentidad del certificado:");
    console.log("RFC:", fiel.rfc);
    console.log("Titular:", fiel.legalName);
    console.log("Número de serie:", fiel.serialNumber);

    if (fiel.rfc !== expectedRfc) {
      throw new Error(
        `El RFC de la e.firma (${fiel.rfc}) no corresponde a la licencia (${expectedRfc}).`
      );
    }

    console.log("\n¡Verificación exitosa!");
    console.log("El RFC del certificado coincide con la licencia.");
    console.log("La e.firma está lista para utilizarse.");
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : "Error desconocido."
    );

    process.exitCode = 1;
  }
}

main();
