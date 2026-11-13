// import { Credential } from "@nodecfdi/credentials/node";

// import { getFielCredentials } from "../security/credentials.js";
// import { validateFielFiles } from "./sat-service.js";

// export function getFielInfo() {
//   const credentials = getFielCredentials();

//   if (!credentials) {
//     throw new Error("No hay una e.firma configurada.");
//   }

//   validateFielFiles(
//     credentials.certPath,
//     credentials.keyPath,
//     credentials.password
//   );

//   const fiel = Credential.openFiles(
//     credentials.certPath,
//     credentials.keyPath,
//     credentials.password
//   );

//   const certificate = fiel.certificate();

//   return {
//     rfc: certificate.rfc().toUpperCase(),
//     legalName: certificate.legalName(),
//     serialNumber: certificate.serialNumber().bytes(),
//   };
// }


import { Credential } from "@nodecfdi/credentials/node";

import { getFielCredentials } from "../security/credentials.js";
import { validateFielFiles } from "./sat-service.js";

export function getFielInfoFromFiles(
  certPath: string,
  keyPath: string,
  password: string
) {
  validateFielFiles(certPath, keyPath, password);

  const fiel = Credential.openFiles(
    certPath,
    keyPath,
    password
  );

  const certificate = fiel.certificate();

  return {
    rfc: certificate.rfc().toUpperCase(),
    legalName: certificate.legalName(),
    serialNumber: certificate.serialNumber().bytes(),
  };
}

export function getFielInfo() {
  const credentials = getFielCredentials();

  if (!credentials) {
    throw new Error("No hay una e.firma configurada.");
  }

  return getFielInfoFromFiles(
    credentials.certPath,
    credentials.keyPath,
    credentials.password
  );
}