
import { pairAgentWithCode } from "../services/pairing.js";

function getPairingCode() {
  const index = process.argv.indexOf("--code");

  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(
      "Uso: npm run pair -- --code CODIGO_DE_VINCULACION",
    );
  }

  return process.argv[index + 1];
}

async function main() {
  const code = getPairingCode();

  const result = await pairAgentWithCode(code);

  console.log("");
  console.log("Computadora vinculada correctamente.");
  console.log(`Dispositivo: ${result.device.id}`);
  console.log("Token almacenado de forma segura en Windows.");
  console.log("");
}

main().catch((error) => {
  console.error(
    "Error de vinculación:",
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});
