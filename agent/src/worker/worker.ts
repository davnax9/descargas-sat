
import {
  getNextJob,
  sendHeartbeat,
  reportJobResult,
  AgentJob,
  AgentJobResult,
  AgentApiError,
} from "../services/api-client.js";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 60000;

type JobHandler = (
  job: AgentJob,
  signal: AbortSignal
) => Promise<AgentJobResult>;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const timer = setTimeout(finish, ms);

    signal.addEventListener("abort", finish, { once: true });
  });
}

export async function startAgentWorker(
  processJob: JobHandler,
  shutdownSignal: AbortSignal
): Promise<void> {
  console.log("[WORKER] Agente iniciado. Esperando trabajos...");

  while (!shutdownSignal.aborted) {
    try {
      console.log("[WORKER] Consultando trabajos pendientes...");

      const job = await getNextJob();

      if (shutdownSignal.aborted) {
        if (job) {
          console.warn(
            "[WORKER] Se reclamó un trabajo durante el cierre. Se permitirá que expire su lease."
          );
        }

        break;
      }

      if (!job) {
        await sleep(POLL_INTERVAL_MS, shutdownSignal);
        continue;
      }

      console.log("[WORKER] Trabajo recibido:", {
        id: job.id,
        requestType: job.requestType,
        startDate: job.startDate,
        endDate: job.endDate,
        attempts: job.attempts,
        resumed: job.resumed,
        satRequestId: job.satRequestId,
      });

      const controller = new AbortController();

      const abortCurrentJob = () => {
        console.log(
          "[WORKER] Solicitando interrupción del trabajo actual..."
        );

        controller.abort();
      };

      shutdownSignal.addEventListener(
        "abort",
        abortCurrentJob,
        { once: true }
      );

      let heartbeatRunning = false;
      let leaseLost = false;

      const heartbeatTimer = setInterval(async () => {
        if (
          heartbeatRunning ||
          leaseLost ||
          shutdownSignal.aborted
        ) {
          return;
        }

        heartbeatRunning = true;

        try {
          const result = await sendHeartbeat(job.id);

          console.log("[WORKER] Heartbeat:", result);

          if (!result.renewed) {
            console.error(
              "[WORKER] El servidor no renovó el lease."
            );

            leaseLost = true;
            controller.abort();
          }
        } catch (error) {
          console.error(
            "[WORKER] Error en heartbeat:",
            error
          );

          if (
            error instanceof AgentApiError &&
            (error.status === 401 || error.status === 409)
          ) {
            console.error(
              "[WORKER] El dispositivo perdió autorización o propiedad del trabajo."
            );

            leaseLost = true;
            controller.abort();
          }
        } finally {
          heartbeatRunning = false;
        }
      }, HEARTBEAT_INTERVAL_MS);

      try {
        console.log(
          "[WORKER] Iniciando procesamiento:",
          job.id
        );

        const result = await processJob(
          job,
          controller.signal
        );

        if (shutdownSignal.aborted) {
          console.warn(
            `[WORKER] Cierre solicitado. No se reportará el resultado de ${job.id}.`
          );

          continue;
        }

        if (leaseLost || controller.signal.aborted) {
          console.warn(
            `[WORKER] Se perdió la propiedad del trabajo ${job.id}. No se reportará el resultado.`
          );

          continue;
        }

        await reportJobResult(job.id, result);

        console.log("[WORKER] Trabajo finalizado:", {
          id: job.id,
          status: result.status,
          documentsDownloaded: result.documentsDownloaded,
          satRequestId: result.satRequestId,
        });
      } catch (error) {
        if (shutdownSignal.aborted) {
          console.warn(
            `[WORKER] Trabajo ${job.id} interrumpido por cierre del agente.`
          );

          continue;
        }

        if (leaseLost || controller.signal.aborted) {
          console.warn(
            `[WORKER] Trabajo ${job.id} interrumpido por pérdida del lease.`
          );

          continue;
        }

        console.error(
          "[WORKER] Error procesando trabajo:",
          error
        );

        const failureResult: AgentJobResult = {
          status: "FAILED",
          documentsDownloaded: 0,
          satRequestId: job.satRequestId ?? undefined,
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : "Error desconocido durante el procesamiento.",
        };

        await reportJobResult(
          job.id,
          failureResult
        );

        console.log(
          "[WORKER] Se reportó el trabajo como FAILED:",
          job.id
        );
      } finally {
        clearInterval(heartbeatTimer);

        shutdownSignal.removeEventListener(
          "abort",
          abortCurrentJob
        );
      }
    } catch (error) {
      if (shutdownSignal.aborted) {
        break;
      }

      console.error(
        "[WORKER] Error en el ciclo del agente:",
        error
      );

      if (
        error instanceof AgentApiError &&
        error.status === 401
      ) {
        console.error(
          "[WORKER] Dispositivo no autorizado. Se esperará una nueva vinculación."
        );

        await sleep(15000, shutdownSignal);
        continue;
      }

      await sleep(POLL_INTERVAL_MS, shutdownSignal);
    }
  }

  console.log("[WORKER] Agente detenido correctamente.");
}
