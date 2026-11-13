
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
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

function verifyDownloadToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        ok: false,
        error: "Falta autorización para descargar archivos.",
      });
      return;
    }

    const token = authorization.slice(7);
    const parts = token.split(".");

    if (parts.length !== 2) {
      res.status(401).json({
        ok: false,
        error: "Token de descarga inválido.",
      });
      return;
    }

    const [encodedPayload, encodedSignature] = parts;

    const expectedSignature = createHmac(
      "sha256",
      config.downloadTokenSecret
    )
      .update(encodedPayload)
      .digest();

    const receivedSignature = Buffer.from(
      encodedSignature,
      "base64url"
    );

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      res.status(401).json({
        ok: false,
        error: "Firma del token inválida.",
      });
      return;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as DownloadTokenPayload;

    const requestedJobId = req.params.jobId;

    if (
      !payload.jobId ||
      !payload.licenseId ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      typeof requestedJobId !== "string" ||
      payload.jobId !== requestedJobId
    ) {
      res.status(401).json({
        ok: false,
        error: "El token expiró o no corresponde a esta solicitud.",
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: "No fue posible validar el token de descarga.",
    });
  }
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
