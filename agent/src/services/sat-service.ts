import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  Fiel,
  FielRequestBuilder,
  HttpsWebClient,
  Service,
} from "@nodecfdi/sat-ws-descarga-masiva";

import { getFielCredentials } from "../security/credentials.js";

export function validateFielFiles(
  certPath: string,
  keyPath: string,
  password: string
) {
  if (!existsSync(certPath)) {
    throw new Error("No se encontró el archivo de certificado .cer.");
  }

  if (!existsSync(keyPath)) {
    throw new Error("No se encontró el archivo de llave privada .key.");
  }

  if (path.extname(certPath).toLowerCase() !== ".cer") {
    throw new Error("El certificado debe tener extensión .cer.");
  }

  if (path.extname(keyPath).toLowerCase() !== ".key") {
    throw new Error("La llave privada debe tener extensión .key.");
  }

  let fiel: Fiel;

  try {
    fiel = Fiel.create(
      readFileSync(certPath, "binary"),
      readFileSync(keyPath, "binary"),
      password
    );
  } catch {
    throw new Error(
      "No fue posible abrir la e.firma. Verifica que los archivos y la contraseña sean correctos."
    );
  }

  if (!fiel.isValid()) {
    throw new Error(
      "La e.firma no es válida o se encuentra fuera de su periodo de vigencia."
    );
  }

  return {
    valid: true,
    message: "La e.firma es válida y está lista para utilizarse.",
  };
}

export function createSatService() {
  const credentials = getFielCredentials();

  if (!credentials) {
    throw new Error(
      "Primero debes configurar la e.firma en este equipo."
    );
  }

  validateFielFiles(
    credentials.certPath,
    credentials.keyPath,
    credentials.password
  );

  const fiel = Fiel.create(
    readFileSync(credentials.certPath, "binary"),
    readFileSync(credentials.keyPath, "binary"),
    credentials.password
  );

  const requestBuilder = new FielRequestBuilder(fiel);
  const webClient = new HttpsWebClient();

  return new Service(requestBuilder, webClient);
}