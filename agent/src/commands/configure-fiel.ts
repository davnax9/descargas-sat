
import path from "node:path";
import process from "node:process";

import {
  saveFielCredentials,
} from "../security/credentials.js";

import {
  validateFielFiles,
} from "../services/sat-service.js";

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function askHiddenPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(
        new Error("Ejecuta este comando desde una terminal interactiva.")
      );
      return;
    }

    process.stdout.write("Contraseña de e.firma: ");

    let password = "";

    const finish = (value?: string, error?: Error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");

      if (error) {
        reject(error);
      } else {
        resolve(value ?? "");
      }
    };

    const onData = (chunk: Buffer | string) => {
      const input = chunk.toString();

      for (const char of input) {
        if (char === "\u0003") {
          finish(undefined, new Error("Operación cancelada."));
          return;
        }

        if (char === "\r" || char === "\n") {
          finish(password);
          return;
        }

        if (char === "\u007f" || char === "\b") {
          password = password.slice(0, -1);
          continue;
        }

        if (char >= " ") {
          password += char;
        }
      }
    };

    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function main() {
  try {
    if (process.platform !== "win32") {
      throw new Error("Este comando está preparado para Windows.");
    }

    const certArgument = getArgument("--cer");
    const keyArgument = getArgument("--key");

    if (!certArgument || !keyArgument) {
      throw new Error(
        'Uso: npm run configure:fiel -- --cer "C:\\ruta\\certificado.cer" --key "C:\\ruta\\llave.key"'
      );
    }

    const certPath = path.resolve(certArgument);
    const keyPath = path.resolve(keyArgument);

    const password = await askHiddenPassword();

    if (!password) {
      throw new Error("La contraseña no puede estar vacía.");
    }

    console.log("\nValidando e.firma...");

    const result = validateFielFiles(
      certPath,
      keyPath,
      password
    );

    saveFielCredentials(
      certPath,
      keyPath,
      password
    );

    console.log("\nConfiguración completada.");
    console.log(result.message);
    console.log("Certificado y llave configurados localmente.");
    console.log("La contraseña quedó almacenada en Windows.");
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : "Error desconocido."
    );

    process.exitCode = 1;
  }
}

main();
