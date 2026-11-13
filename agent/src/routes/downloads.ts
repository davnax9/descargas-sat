
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createPublicKey, verify } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import { config } from "../config/env.js";
import {
  getExcelPath,
  getXmlDocumentPaths,
  readMetadataRecords,
} from "../services/download-storage.js";

import {
  generateCfdiExcel,
  generateMetadataExcel,
} from "../services/excel-service.js";

const router = Router();


type DownloadTokenPayload = {
  jobId: string;
  licenseId: string;
  exp: number;
};

function getJobId(req: Request): string {
  const jobId = req.params.jobId;

  if (typeof jobId !== "string") {
    throw new Error("Identificador de solicitud inválido.");
  }

  return jobId;
}

/**
 * Verifica la firma Ed25519 y el contenido del token.
 */
function validateDownloadToken(
  token: string,
  jobId: string
): DownloadTokenPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, encodedSignature] = parts;

    if (!encodedPayload || !encodedSignature) {
      return null;
    }

    const publicKey = createPublicKey({
      key: Buffer.from(config.downloadTokenPublicKey, "base64"),
      format: "der",
      type: "spki",
    });

    if (publicKey.asymmetricKeyType !== "ed25519") {
      return null;
    }

    const signature = Buffer.from(
      encodedSignature,
      "base64url"
    );

    // Las firmas Ed25519 siempre tienen 64 bytes.
    if (signature.length !== 64) {
      return null;
    }

    const isValid = verify(
      null,
      Buffer.from(encodedPayload),
      publicKey,
      signature
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as DownloadTokenPayload;

    if (
      typeof payload.jobId !== "string" ||
      typeof payload.licenseId !== "string" ||
      !payload.licenseId ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      payload.jobId !== jobId
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware de Express para proteger las descargas.
 */
function verifyDownloadToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      ok: false,
      error: "Token de descarga no proporcionado.",
    });
    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    res.status(401).json({
      ok: false,
      error: "Token de descarga inválido.",
    });
    return;
  }

  const jobId = req.params.jobId;

  if (typeof jobId !== "string") {
    res.status(400).json({
      ok: false,
      error: "Identificador de solicitud inválido.",
    });
    return;
  }

  const payload = validateDownloadToken(token, jobId);

  if (!payload) {
    res.status(401).json({
      ok: false,
      error: "Token de descarga inválido o expirado.",
    });
    return;
  }

  next();
}

function validateJobId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const jobId = req.params.jobId;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof jobId !== "string" || !uuidRegex.test(jobId)) {
    res.status(400).json({
      ok: false,
      error: "Identificador de solicitud inválido.",
    });
    return;
  }

  next();
}

// =====================================================
// DESCARGAR EXCEL
// =====================================================


router.get(
  "/:jobId/excel",
  validateJobId,
  verifyDownloadToken,
  async (req: Request, res: Response) => {
    try {
      const jobId = getJobId(req);

      const xmlPaths = await getXmlDocumentPaths(jobId);
      const metadataRecords = await readMetadataRecords(jobId);

      const hasXml = xmlPaths.length > 0;
      const hasMetadata = metadataRecords.length > 0;

      if (!hasXml && !hasMetadata) {
        res.status(404).json({
          ok: false,
          error:
            "No hay archivos XML ni Metadata locales para generar el Excel.",
        });
        return;
      }

      const excelPath = getExcelPath(jobId);

      try {
        await access(excelPath);
      } catch {
        console.log(
          "[DOWNLOAD] Excel inexistente. Regenerando desde archivos locales:",
          jobId
        );

        const result = hasMetadata
          ? await generateMetadataExcel(jobId)
          : await generateCfdiExcel(jobId);

        if (!result.excelPath) {
          res.status(404).json({
            ok: false,
            error: "No fue posible generar el Excel.",
          });
          return;
        }
      }

      res.download(
        excelPath,
        `CFDI_${jobId}.xlsx`,
        (error) => {
          if (error && !res.headersSent) {
            console.error(
              "[DOWNLOAD] Error enviando Excel:",
              error
            );

            res.status(500).json({
              ok: false,
              error: "No fue posible entregar el archivo Excel.",
            });
          }
        }
      );
    } catch (error) {
      console.error(
        "[DOWNLOAD] Error preparando Excel:",
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          ok: false,
          error: "Error preparando el archivo Excel.",
        });
      }
    }
  }
);


// =====================================================
// DESCARGAR XML EN ZIP
// =====================================================

router.get(
  "/:jobId/xml",
  validateJobId,
  verifyDownloadToken,
  async (req: Request, res: Response) => {
    try {
      const jobId = getJobId(req);

      const xmlPaths = await getXmlDocumentPaths(jobId);

      if (xmlPaths.length === 0) {
        res.status(404).json({
          ok: false,
          error: "No hay archivos XML locales para esta solicitud.",
        });
        return;
      }

      const archive = new ZipArchive({
        zlib: { level: 6 },
      });

      archive.on("error", (error: Error) => {
        console.error("[DOWNLOAD] Error creando ZIP XML:", error);

        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            error: "No fue posible crear el ZIP de XML.",
          });
        } else {
          res.destroy(error);
        }
      });

      res.setHeader("Content-Type", "application/zip");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="CFDI_XML_${jobId}.zip"`
      );

      archive.pipe(res);

      for (const xmlPath of xmlPaths) {
        archive.file(xmlPath, {
          name: path.basename(xmlPath),
        });
      }

      await archive.finalize();
    } catch (error) {
      console.error("[DOWNLOAD] Error preparando ZIP XML:", error);

      if (!res.headersSent) {
        res.status(500).json({
          ok: false,
          error: "Error preparando el ZIP de XML.",
        });
      }
    }
  }
);

export default router;
