
// import { Router, type Request, type Response } from "express";
// import { z } from "zod";

// import {
//   mkdir,
//   writeFile,
//   rm,
// } from "node:fs/promises";

// import { existsSync } from "node:fs";
// import path from "node:path";
// import { homedir } from "node:os";
// import { randomUUID } from "node:crypto";

// import {
//   getAgentCredentials,
//   getFielCredentials,
//   saveFielCredentials,
// } from "../security/credentials.js";

// import {
//   getFielInfo,
//   getFielInfoFromFiles,
// } from "../services/fiel-info.js";

// import { getRemoteConfig } from "../config/remote.js";

// const router = Router();

// const configureSchema = z.object({
//   certFileName: z.string().min(1).max(255),
//   keyFileName: z.string().min(1).max(255),
//   certBase64: z.string().min(1).max(1_500_000),
//   keyBase64: z.string().min(1).max(1_500_000),
//   password: z.string().min(1).max(1024),
// });

// type LicenseIdentity = {
//   rfc?: string;
//   error?: string;
// };

// function decodeBase64(value: string, label: string) {
//   const normalized = value.replace(/\s/g, "");

//   if (
//     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
//       normalized
//     )
//   ) {
//     throw new Error(`${label}: contenido Base64 inválido.`);
//   }

//   const buffer = Buffer.from(normalized, "base64");

//   if (buffer.length === 0 || buffer.length > 1024 * 1024) {
//     throw new Error(
//       `${label}: el archivo está vacío o supera el tamaño permitido de 1 MB.`
//     );
//   }

//   return buffer;
// }

// function getFielStorageRoot() {
//   const localAppData =
//     process.env.LOCALAPPDATA || homedir();

//   return path.join(
//     localAppData,
//     "CFDI Local",
//     "Fiel"
//   );
// }

// async function getLicenseIdentity(): Promise<string> {
//   const agent = getAgentCredentials();

//   if (!agent) {
//     throw new Error(
//       "El agente todavía no está vinculado a una licencia."
//     );
//   }

//   const { baseUrl } = getRemoteConfig();

//   const response = await fetch(
//     `${baseUrl}/api/agent/identity`,
//     {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${agent.token}`,
//       },
//       signal: AbortSignal.timeout(15000),
//     }
//   );

//   const result =
//     await response.json() as LicenseIdentity;

//   if (!response.ok || !result.rfc) {
//     throw new Error(
//       result.error || "No fue posible consultar el RFC de la licencia."
//     );
//   }

//   return result.rfc.toUpperCase();
// }

// /**
//  * POST /fiel/configure
//  *
//  * Recibe los archivos de e.firma, valida su identidad
//  * y guarda las credenciales localmente.
//  */
// router.post(
//   "/configure",
//   async (req: Request, res: Response) => {
//     let storageDirectory: string | null = null;
//     let savedCredentials = false;

//     try {
//       if (process.platform !== "win32") {
//         throw new Error(
//           "La configuración de e.firma está disponible únicamente en Windows."
//         );
//       }

//       const parsed = configureSchema.safeParse(req.body);

//       if (!parsed.success) {
//         res.status(400).json({
//           ok: false,
//           error: "Los datos recibidos son inválidos.",
//           details: parsed.error.issues.map(
//             (issue) => issue.message
//           ),
//         });
//         return;
//       }

//       const {
//         certFileName,
//         keyFileName,
//         certBase64,
//         keyBase64,
//         password,
//       } = parsed.data;

//       if (
//         path.extname(certFileName).toLowerCase() !== ".cer"
//       ) {
//         throw new Error(
//           "Debes seleccionar un certificado con extensión .cer."
//         );
//       }

//       if (
//         path.extname(keyFileName).toLowerCase() !== ".key"
//       ) {
//         throw new Error(
//           "Debes seleccionar una llave privada con extensión .key."
//         );
//       }

//       const certBuffer = decodeBase64(
//         certBase64,
//         "Certificado"
//       );

//       const keyBuffer = decodeBase64(
//         keyBase64,
//         "Llave privada"
//       );

//       const directoryName = randomUUID();

//       storageDirectory = path.join(
//         getFielStorageRoot(),
//         directoryName
//       );

//       await mkdir(storageDirectory, {
//         recursive: true,
//       });

//       const certPath = path.join(
//         storageDirectory,
//         "certificado.cer"
//       );

//       const keyPath = path.join(
//         storageDirectory,
//         "llave.key"
//       );

//       await writeFile(certPath, certBuffer, {
//         flag: "wx",
//       });

//       await writeFile(keyPath, keyBuffer, {
//         flag: "wx",
//       });

//       // 1. Validar criptográficamente la e.firma
//       // 2. Obtener RFC, nombre y número de serie.

//       const fiel = getFielInfoFromFiles(
//         certPath,
//         keyPath,
//         password
//       );

//       // Consultar la identidad de la licencia.
//       const expectedRfc = await getLicenseIdentity();

//       if (fiel.rfc !== expectedRfc) {
//         throw new Error(
//           `El RFC del certificado (${fiel.rfc}) no corresponde al RFC de la licencia (${expectedRfc}).`
//         );
//       }

//       // Guardar las credenciales únicamente después
//       // de validar certificado, llave y RFC.
//       saveFielCredentials(
//         certPath,
//         keyPath,
//         password
//       );

//       savedCredentials = true;

//       res.status(200).json({
//         ok: true,
//         message: "La e.firma se configuró correctamente.",
//         fiel: {
//           rfc: fiel.rfc,
//           legalName: fiel.legalName,
//           serialNumber: fiel.serialNumber,
//           valid: true,
//         },
//       });
//     } catch (error) {
//       if (storageDirectory && !savedCredentials) {
//         await rm(storageDirectory, {
//           recursive: true,
//           force: true,
//         }).catch(() => undefined);
//       }

//       const message =
//         error instanceof Error
//           ? error.message
//           : "No fue posible configurar la e.firma.";

//       res.status(400).json({
//         ok: false,
//         error: message,
//       });
//     }
//   }
// );

// /**
//  * GET /fiel/status
//  *
//  * Consulta la e.firma que está configurada localmente.
//  */
// router.get(
//   "/status",
//   async (_req: Request, res: Response) => {
//     try {
//       const credentials = getFielCredentials();

//       if (!credentials) {
//         res.status(200).json({
//           ok: true,
//           configured: false,
//           message: "No hay una e.firma configurada.",
//         });
//         return;
//       }

//       if (
//         !existsSync(credentials.certPath) ||
//         !existsSync(credentials.keyPath)
//       ) {
//         res.status(200).json({
//           ok: true,
//           configured: false,
//           valid: false,
//           message: "No se encontraron los archivos de e.firma.",
//         });
//         return;
//       }

//       const fiel = getFielInfo();
//       const expectedRfc = await getLicenseIdentity();

//       const matchesLicense = fiel.rfc === expectedRfc;

//       res.status(200).json({
//         ok: true,
//         configured: true,
//         valid: matchesLicense,
//         fiel: {
//           rfc: fiel.rfc,
//           legalName: fiel.legalName,
//           serialNumber: fiel.serialNumber,
//         },
//         matchesLicense,
//         message: matchesLicense
//           ? "La e.firma está configurada y validada."
//           : "El RFC de la e.firma no corresponde a la licencia.",
//       });
//     } catch (error) {
//       res.status(400).json({
//         ok: false,
//         configured: false,
//         error:
//           error instanceof Error
//             ? error.message
//             : "No fue posible consultar la e.firma.",
//       });
//     }
//   }
// );

// export default router;



import {
  Router,
  type Request,
  type Response,
} from "express";

import { z } from "zod";

import {
  mkdir,
  writeFile,
  rm,
} from "node:fs/promises";

import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

import {
  getAgentCredentials,
  getFielCredentials,
  saveFielCredentials,
  deleteFielCredentials,
} from "../security/credentials.js";

import {
  getFielInfo,
  getFielInfoFromFiles,
} from "../services/fiel-info.js";

import { getRemoteConfig } from "../config/remote.js";

import {
  verifyFielTicket,
  type FielAction,
  type FielTicketPayload,
} from "../security/fiel-ticket.js";

const router = Router();

const configureSchema = z.object({
  certFileName: z.string().min(1).max(255),
  keyFileName: z.string().min(1).max(255),
  certBase64: z.string().min(1).max(1_500_000),
  keyBase64: z.string().min(1).max(1_500_000),
  password: z.string().min(1).max(1024),
});

type LicenseIdentity = {
  rfc?: string;
  error?: string;
};

function decodeBase64(value: string, label: string) {
  const normalized = value.replace(/\s/g, "");

  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      normalized
    )
  ) {
    throw new Error(`${label}: contenido Base64 inválido.`);
  }

  const buffer = Buffer.from(normalized, "base64");

  if (buffer.length === 0 || buffer.length > 1024 * 1024) {
    throw new Error(
      `${label}: el archivo está vacío o supera el tamaño permitido de 1 MB.`
    );
  }

  return buffer;
}

function getFielStorageRoot() {
  const localAppData =
    process.env.LOCALAPPDATA || homedir();

  return path.resolve(
    localAppData,
    "CFDI Local",
    "Fiel"
  );
}

async function getLicenseIdentity(): Promise<string> {
  const agent = getAgentCredentials();

  if (!agent) {
    throw new Error(
      "El agente todavía no está vinculado a una licencia."
    );
  }

  const { baseUrl } = getRemoteConfig();

  const response = await fetch(
    `${baseUrl}/api/agent/identity`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${agent.token}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  const result =
    await response.json() as LicenseIdentity;

  if (!response.ok || !result.rfc) {
    throw new Error(
      result.error || "No fue posible consultar el RFC de la licencia."
    );
  }

  return result.rfc.toUpperCase();
}

function getBearerToken(req: Request) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Falta el ticket de autorización.");
  }

  return authorization.slice(7).trim();
}

async function authorizeFielAction(
  req: Request,
  action: FielAction
): Promise<FielTicketPayload> {
  const ticket = verifyFielTicket(
    getBearerToken(req),
    action
  );

  const agent = getAgentCredentials();

  if (!agent) {
    throw new Error("El agente no está vinculado.");
  }

  if (agent.deviceId !== ticket.deviceId) {
    throw new Error(
      "El dispositivo no corresponde a la autorización."
    );
  }

  const expectedRfc = await getLicenseIdentity();

  if (
    expectedRfc !== ticket.rfc.toUpperCase()
  ) {
    throw new Error(
      "El RFC de la licencia no corresponde al ticket."
    );
  }

  return ticket;
}

function isManagedFielDirectory(
  certPath: string,
  keyPath: string
): boolean {
  const root = getFielStorageRoot();

  const certDirectory = path.resolve(
    path.dirname(certPath)
  );

  const keyDirectory = path.resolve(
    path.dirname(keyPath)
  );

  if (certDirectory !== keyDirectory) {
    return false;
  }

  const relative = path.relative(root, certDirectory);

  return (
    relative !== "" &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

async function removeManagedFielFiles(
  credentials: {
    certPath: string;
    keyPath: string;
  } | null
) {
  if (!credentials) return;

  // Nunca borrar archivos externos a la carpeta privada
  // administrada por CFDI Local.
  if (
    !isManagedFielDirectory(
      credentials.certPath,
      credentials.keyPath
    )
  ) {
    return;
  }

  await rm(
    path.dirname(credentials.certPath),
    {
      recursive: true,
      force: true,
    }
  );
}

function sendError(
  res: Response,
  error: unknown,
  status = 400
) {
  res.status(status).json({
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : "Ocurrió un error al procesar la operación.",
  });
}

/**
 * POST /fiel/configure
 */
router.post(
  "/configure",
  async (req: Request, res: Response) => {
    let storageDirectory: string | null = null;
    let savedCredentials = false;

    const previousCredentials = getFielCredentials();

    try {
      if (process.platform !== "win32") {
        throw new Error(
          "La configuración de e.firma está disponible únicamente en Windows."
        );
      }

      const ticket = await authorizeFielAction(req, "configure");

      const parsed = configureSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: "Los datos recibidos son inválidos.",
          details: parsed.error.issues.map(
            (issue) => issue.message
          ),
        });
        return;
      }

      const {
        certFileName,
        keyFileName,
        certBase64,
        keyBase64,
        password,
      } = parsed.data;

      if (
        path.extname(certFileName).toLowerCase() !== ".cer"
      ) {
        throw new Error(
          "Debes seleccionar un certificado con extensión .cer."
        );
      }

      if (
        path.extname(keyFileName).toLowerCase() !== ".key"
      ) {
        throw new Error(
          "Debes seleccionar una llave privada con extensión .key."
        );
      }

      const certBuffer = decodeBase64(
        certBase64,
        "Certificado"
      );

      const keyBuffer = decodeBase64(
        keyBase64,
        "Llave privada"
      );

      storageDirectory = path.join(
        getFielStorageRoot(),
        randomUUID()
      );

      await mkdir(storageDirectory, {
        recursive: true,
      });

      const certPath = path.join(
        storageDirectory,
        "certificado.cer"
      );

      const keyPath = path.join(
        storageDirectory,
        "llave.key"
      );

      await writeFile(certPath, certBuffer, {
        flag: "wx",
      });

      await writeFile(keyPath, keyBuffer, {
        flag: "wx",
      });

      const fiel = getFielInfoFromFiles(
        certPath,
        keyPath,
        password
      );

      if (fiel.rfc !== ticket.rfc.toUpperCase()) {
        throw new Error(
          "El RFC del certificado no corresponde al ticket."
        );
      }

      const expectedRfc = await getLicenseIdentity();

      if (fiel.rfc !== expectedRfc) {
        throw new Error(
          `El RFC del certificado (${fiel.rfc}) no corresponde al RFC de la licencia (${expectedRfc}).`
        );
      }

      try {
        saveFielCredentials(
          certPath,
          keyPath,
          password
        );

        savedCredentials = true;
      } catch (saveError) {
        // Recuperar la configuración anterior si existía.
        if (previousCredentials) {
          saveFielCredentials(
            previousCredentials.certPath,
            previousCredentials.keyPath,
            previousCredentials.password
          );
        } else {
          deleteFielCredentials();
        }

        throw saveError;
      }

      // Limpiar la configuración anterior solamente si
      // los archivos anteriores eran administrados por CFDI Local.
      await removeManagedFielFiles(previousCredentials);

      res.status(200).json({
        ok: true,
        message: "La e.firma se configuró correctamente.",
        fiel: {
          rfc: fiel.rfc,
          legalName: fiel.legalName,
          serialNumber: fiel.serialNumber,
          valid: true,
        },
      });
    } catch (error) {
      if (storageDirectory && !savedCredentials) {
        await rm(storageDirectory, {
          recursive: true,
          force: true,
        }).catch(() => undefined);
      }

      sendError(res, error);
    }
  }
);

/**
 * GET /fiel/status
 */
router.get(
  "/status",
  async (req: Request, res: Response) => {
    try {
      await authorizeFielAction(req, "status");

      const credentials = getFielCredentials();

      if (!credentials) {
        res.status(200).json({
          ok: true,
          configured: false,
          valid: false,
          message: "No hay una e.firma configurada.",
        });
        return;
      }

      if (
        !existsSync(credentials.certPath) ||
        !existsSync(credentials.keyPath)
      ) {
        res.status(200).json({
          ok: true,
          configured: false,
          valid: false,
          message: "No se encontraron los archivos de e.firma.",
        });
        return;
      }

      const fiel = getFielInfo();
      const expectedRfc = await getLicenseIdentity();

      const matchesLicense = fiel.rfc === expectedRfc;

      res.status(200).json({
        ok: true,
        configured: true,
        valid: matchesLicense,
        fiel: {
          rfc: fiel.rfc,
          legalName: fiel.legalName,
          serialNumber: fiel.serialNumber,
        },
        matchesLicense,
        message: matchesLicense
          ? "La e.firma está configurada y validada."
          : "El RFC de la e.firma no corresponde a la licencia.",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

/**
 * DELETE /fiel/unlink
 */
router.delete(
  "/unlink",
  async (req: Request, res: Response) => {
    try {
      await authorizeFielAction(req, "unlink");

      const credentials = getFielCredentials();

      if (!credentials) {
        res.status(200).json({
          ok: true,
          message: "No había una e.firma configurada.",
        });
        return;
      }

      // Eliminar primero las credenciales del Administrador
      // de credenciales de Windows.
      deleteFielCredentials();

      // Borrar solamente archivos que CFDI Local haya copiado
      // a su carpeta privada. No borrar archivos originales.
      await removeManagedFielFiles(credentials);

      res.status(200).json({
        ok: true,
        message: "La e.firma se desvinculó correctamente.",
      });
    } catch (error) {
      sendError(res, error);
    }
  }
);

export default router;
