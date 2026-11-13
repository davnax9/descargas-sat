
import {
  QueryParameters,
  DateTimePeriod,
  DownloadType,
  RequestType,
  CfdiPackageReader,
  DocumentStatus,
} from "@nodecfdi/sat-ws-descarga-masiva";
import { generateCfdiExcel } from "../services/excel-service.js";
import {
  AgentJob,
  AgentJobResult,
  saveSatRequestId,
} from "../services/api-client.js";

import { createSatService } from "../services/sat-service.js";

import {
  saveZipPackage,
  saveXmlDocument,
} from "../services/download-storage.js";

const VERIFY_INTERVAL_MS = 30000;
const MAX_VERIFY_ATTEMPTS = 120;

function sleep(
  ms: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("El trabajo fue cancelado."));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      reject(new Error("El trabajo fue cancelado."));
    }

    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  });
}

function checkAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new Error("El trabajo fue cancelado.");
  }
}

async function createSatRequest(
  job: AgentJob,
  service: ReturnType<typeof createSatService>,
  signal: AbortSignal
) {
  checkAborted(signal);

  const downloadType =
    job.requestType === "ISSUED"
      ? new DownloadType("issued")
      : new DownloadType("received");

  let parameters = QueryParameters.create()
    .withPeriod(
      DateTimePeriod.createFromValues(
        `${job.startDate} 00:00:00`,
        `${job.endDate} 23:59:59`
      )
    )
    .withDownloadType(downloadType)
    .withRequestType(new RequestType("xml"));

  // El SAT no permite consultar XML recibidos
  // incluyendo comprobantes cancelados.
  // Por eso solicitamos únicamente CFDI vigentes.
  if (job.requestType === "RECEIVED") {
    parameters = parameters.withDocumentStatus(
      new DocumentStatus("active")
    );

    console.log(
      "[SAT] Consulta de recibidos: únicamente CFDI vigentes."
    );
  }

  const validationErrors = parameters.validate();

  if (validationErrors.length > 0) {
    throw new Error(
      `La consulta no es válida: ${validationErrors.join("; ")}`
    );
  }

  console.log("[SAT] Enviando solicitud de descarga...");

  const response = await service.query(parameters);

  checkAborted(signal);

  if (!response.getStatus().isAccepted()) {
    throw new Error(
      `SAT rechazó la solicitud: ${response.getStatus().getMessage()}`
    );
  }

  const requestId = response.getRequestId();

  if (!requestId) {
    throw new Error(
      "SAT no devolvió un identificador de solicitud."
    );
  }

  console.log("[SAT] Solicitud aceptada:", requestId);

  // Guardar inmediatamente el identificador en Neon.
  await saveSatRequestId(job.id, requestId);

  console.log("[SAT] Identificador guardado en CFDI Local.");

  return requestId;
}

async function waitForSatPackages(
  service: ReturnType<typeof createSatService>,
  requestId: string,
  signal: AbortSignal
): Promise<string[]> {
  console.log("[SAT] Esperando generación de paquetes...");

  for (
    let attempt = 1;
    attempt <= MAX_VERIFY_ATTEMPTS;
    attempt++
  ) {
    checkAborted(signal);

    const response = await service.verify(requestId);

    checkAborted(signal);

    if (!response.getStatus().isAccepted()) {
      throw new Error(
        `Error verificando solicitud SAT: ${response.getStatus().getMessage()}`
      );
    }

    const status = response.getStatusRequest();

    if (
      status.isTypeOf("Expired") ||
      status.isTypeOf("Failure") ||
      status.isTypeOf("Rejected")
    ) {
      throw new Error(
        `SAT no pudo completar la solicitud. Estado: ${status.toString()}`
      );
    }

    if (status.isTypeOf("Finished")) {
      const packageIds = response.getPackageIds();

      console.log(
        `[SAT] Solicitud finalizada. Paquetes encontrados: ${packageIds.length}`
      );

      return packageIds;
    }

    console.log(
      `[SAT] Solicitud en proceso. Intento ${attempt}/${MAX_VERIFY_ATTEMPTS}`
    );

    await sleep(VERIFY_INTERVAL_MS, signal);
  }

  throw new Error(
    "La solicitud SAT superó el tiempo máximo de espera de 60 minutos."
  );
}

async function downloadPackages(
  job: AgentJob,
  service: ReturnType<typeof createSatService>,
  packageIds: string[],
  signal: AbortSignal
) {
  const packages: NonNullable<
    AgentJobResult["packages"]
  > = [];

  let documentsDownloaded = 0;

  for (const packageId of packageIds) {
    checkAborted(signal);

    console.log("[SAT] Descargando paquete:", packageId);

    try {
      const response = await service.download(packageId);

      checkAborted(signal);

      if (!response.getStatus().isAccepted()) {
        throw new Error(
          response.getStatus().getMessage()
        );
      }

      const content = response.getPackageContent();

      const { zipPath } = await saveZipPackage(
        job.id,
        packageId,
        content
      );

      console.log("[LOCAL] ZIP guardado:", zipPath);

      const reader =
        await CfdiPackageReader.createFromFile(zipPath);

      let documentCount = 0;

      for await (const map of reader.cfdis()) {
        checkAborted(signal);

        for (const [name, xmlContent] of map) {
          await saveXmlDocument(
            job.id,
            `${name}.xml`,
            xmlContent
          );

          documentCount++;
        }
      }

      documentsDownloaded += documentCount;

      packages.push({
        satPackageId: packageId,
        status: "DOWNLOADED",
        documentCount,
      });

      console.log(
        `[LOCAL] Paquete procesado. XML encontrados: ${documentCount}`
      );
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      console.error(
        `[SAT] Error procesando paquete ${packageId}:`,
        error
      );

      packages.push({
        satPackageId: packageId,
        status: "FAILED",
        documentCount: 0,
      });
    }
  }

  return {
    packages,
    documentsDownloaded,
  };
}

export async function processSatJob(
  job: AgentJob,
  signal: AbortSignal
): Promise<AgentJobResult> {
  console.log("[WORKER] Procesando solicitud:", {
    id: job.id,
    requestType: job.requestType,
    startDate: job.startDate,
    endDate: job.endDate,
    attempts: job.attempts,
    resumed: job.resumed,
  });

  checkAborted(signal);

  const service = createSatService();

  let satRequestId = job.satRequestId ?? null;

  // Si el trabajo ya tiene identificador SAT,
  // recuperamos la solicitud en lugar de crear otra.
  if (!satRequestId) {
    satRequestId = await createSatRequest(
      job,
      service,
      signal
    );
  } else {
    console.log(
      "[SAT] Recuperando solicitud existente:",
      satRequestId
    );
  }

  checkAborted(signal);

  const packageIds = await waitForSatPackages(
    service,
    satRequestId,
    signal
  );

  checkAborted(signal);

  if (packageIds.length === 0) {
    return {
      status: "COMPLETED",
      documentsDownloaded: 0,
      satRequestId,
      packages: [],
    };
  }

  const result = await downloadPackages(
    job,
    service,
    packageIds,
    signal
  );

  checkAborted(signal);

  const failedPackages = result.packages.filter(
    (item) => item.status === "FAILED"
  );

  let excelError: string | null = null;

  if (result.documentsDownloaded > 0) {
    try {
      const excelResult = await generateCfdiExcel(job.id);

      console.log("[EXCEL] Generación finalizada:", {
        documentsProcessed: excelResult.documentsProcessed,
        invalidDocuments: excelResult.invalidDocuments,
        excelPath: excelResult.excelPath,
      });

      if (excelResult.invalidDocuments > 0) {
        excelError =
          `${excelResult.invalidDocuments} XML no pudieron interpretarse.`;
      }
    } catch (error) {
      console.error(
        "[EXCEL] No fue posible generar el reporte:",
        error
      );

      excelError =
        "Los XML se descargaron, pero no fue posible generar el Excel.";
    }
  }

  const errorMessages: string[] = [];

  if (failedPackages.length > 0) {
    errorMessages.push(
      `${failedPackages.length} paquete(s) no pudieron descargarse o extraerse.`
    );
  }

  if (excelError) {
    errorMessages.push(excelError);
  }

  const isPartial =
    failedPackages.length > 0 ||
    excelError !== null;

  return {
    status: isPartial ? "PARTIAL" : "COMPLETED",

    documentsDownloaded: result.documentsDownloaded,

    satRequestId,

    packages: result.packages,

    errorMessage:
      errorMessages.length > 0
        ? errorMessages.join(" ")
        : null,
  };
}
