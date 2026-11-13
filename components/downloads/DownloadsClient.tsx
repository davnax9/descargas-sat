
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDownloadRequest } from "@/actions/descargas";

type DownloadRequestItem = {
  id: string;
  requestType: "ISSUED" | "RECEIVED";
  downloadFormat: "XML" | "METADATA";
  startDate: string;
  endDate: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
  documentsDownloaded: number;
  errorMessage: string | null;
  createdAt: string;
  satRequestId?: string | null;
  attempts?: number;
};

type Props = {
  requests: DownloadRequestItem[];
  hasActiveAgent: boolean;
};

type StatusFilter = "ALL" | DownloadRequestItem["status"];

const statusLabels: Record<DownloadRequestItem["status"], string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  COMPLETED: "Completada",
  PARTIAL: "Parcial",
  FAILED: "Fallida",
};

const statusStyles: Record<DownloadRequestItem["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  PROCESSING: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  PARTIAL: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  FAILED: "bg-red-100 text-red-800 ring-1 ring-red-200",
};

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "es-MX",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DownloadsClient({
  requests,
  hasActiveAgent,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [requestType, setRequestType] = useState<"ISSUED" | "RECEIVED">("ISSUED");
  const [downloadFormat, setDownloadFormat] = useState<"XML" | "METADATA">("XML");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [downloadingId, setDownloadingId] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const hasInProgress = requests.some(
    (item) => item.status === "PENDING" || item.status === "PROCESSING"
  );

  // Actualizar el historial mientras existan solicitudes activas.
  useEffect(() => {
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      router.refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [hasInProgress, router]);

  // El indicador se oculta cuando llegan nuevas propiedades del servidor.
  useEffect(() => {
    setIsRefreshing(false);
  }, [requests]);


  async function handleDownload(
    jobId: string,
    type: "excel" | "xml"
  ) {
    const downloadKey = `${jobId}:${type}`;

    setDownloadingId(downloadKey);
    setDownloadError("");

    try {
      // 1. Solicitar autorización a Next.js.
      const tokenResponse = await fetch(
        `/api/downloads/${encodeURIComponent(jobId)}/token`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.token) {
        throw new Error(
          tokenData.error || "No fue posible autorizar la descarga."
        );
      }

      // 2. Solicitar el archivo al agente local.
      const response = await fetch(
        `http://127.0.0.1:4317/downloads/${encodeURIComponent(jobId)}/${type}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);

        throw new Error(
          result?.error ||
            "No fue posible obtener el archivo desde el agente local."
        );
      }

      // 3. Descargar el archivo en el navegador.
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;

      link.download =
        type === "excel"
          ? `CFDI_${jobId}.xlsx`
          : `CFDI_XML_${jobId}.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando archivo:", error);

      setDownloadError(
        error instanceof Error
          ? error.message
          : "No fue posible descargar el archivo."
      );
    } finally {
      setDownloadingId("");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const result = await createDownloadRequest({
          requestType,
          downloadFormat,
          startDate,
          endDate,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setMessage(result.message);
        setStartDate("");
        setEndDate("");

        router.refresh();
      } catch {
        setError("No fue posible crear la solicitud. Intenta nuevamente.");
      }
    });
  }

  const pendingCount = requests.filter(
    (item) => item.status === "PENDING"
  ).length;

  const processingCount = requests.filter(
    (item) => item.status === "PROCESSING"
  ).length;

  const completedCount = requests.filter(
    (item) => item.status === "COMPLETED" || item.status === "PARTIAL"
  ).length;

  const failedCount = requests.filter(
    (item) => item.status === "FAILED"
  ).length;

  const filteredRequests = requests.filter(
    (item) => statusFilter === "ALL" || item.status === statusFilter
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Descargas CFDI
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              SAT
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Solicita comprobantes al SAT y consulta el avance de tus descargas.
          </p>
        </div>

        {hasInProgress && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {isRefreshing ? "Actualizando..." : "Seguimiento automático activo"}
          </div>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Solicitudes"
          value={requests.length}
          color="gray"
          description="Total registradas"
        />

        <SummaryCard
          label="Pendientes"
          value={pendingCount}
          color="amber"
          description="Esperando al agente"
        />

        <SummaryCard
          label="En proceso"
          value={processingCount}
          color="blue"
          description="Agente trabajando"
        />

        <SummaryCard
          label="Completadas"
          value={completedCount}
          color="emerald"
          description={`${failedCount} fallidas`}
        />
      </div>

      {/* Nueva solicitud */}
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                <path d="M5 17v3h14v-3" />
              </svg>
            </span>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Nueva solicitud
              </h2>
              <p className="text-sm text-gray-500">
                Selecciona el tipo de comprobantes y el periodo.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {!hasActiveAgent && (
            <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <span className="text-lg">⚠</span>
              <div>
                <p className="font-semibold">Agente local no vinculado</p>
                <p className="mt-1">
                  Necesitas vincular un agente local activo antes de solicitar
                  una descarga.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de comprobante */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Tipo de comprobantes
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={requestType === "ISSUED"}
                  onClick={() => setRequestType("ISSUED")}
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                    requestType === "ISSUED"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <span>
                    <span className="block font-bold">Emitidos</span>
                    <span className="mt-1 block text-xs opacity-75">
                      CFDI que tú expediste
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      requestType === "ISSUED"
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={requestType === "RECEIVED"}
                  onClick={() => setRequestType("RECEIVED")}
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                    requestType === "RECEIVED"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <span>
                    <span className="block font-bold">Recibidos</span>
                    <span className="mt-1 block text-xs opacity-75">
                      CFDI que otros emitieron a tu RFC
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      requestType === "RECEIVED"
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              </div>

              <p className="mt-2 text-xs font-medium text-emerald-800">
                Tipo seleccionado:{" "}
                {requestType === "ISSUED"
                  ? "CFDI emitidos"
                  : "CFDI recibidos"}
              </p>
            </div>
            
            {/* Formato de descarga */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                ¿Qué información deseas descargar?
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* XML */}
                <button
                  type="button"
                  aria-pressed={downloadFormat === "XML"}
                  onClick={() => setDownloadFormat("XML")}
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                    downloadFormat === "XML"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <span>
                    <span className="block font-bold">XML (CFDI)</span>
                    <span className="mt-1 block text-xs opacity-75">
                      Descarga los comprobantes completos en archivos XML.
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      downloadFormat === "XML"
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>

                {/* Metadata */}
                <button
                  type="button"
                  aria-pressed={downloadFormat === "METADATA"}
                  onClick={() => setDownloadFormat("METADATA")}
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                    downloadFormat === "METADATA"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-gray-50"
                  }`}
                >
                  <span>
                    <span className="block font-bold">Metadata</span>
                    <span className="mt-1 block text-xs opacity-75">
                      Consulta los datos generales de tus CFDI sin descargar cada XML.
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      downloadFormat === "METADATA"
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              </div>

              <p className="mt-2 text-xs font-medium text-emerald-800">
                Formato seleccionado:{" "}
                {downloadFormat === "XML" ? "XML (CFDI)" : "Metadata"}
              </p>
            </div>


            {/* Periodo */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Periodo de consulta
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1.5 block text-xs font-medium text-gray-600"
                  >
                    Fecha inicial
                  </label>

                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    max={endDate || today}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1.5 block text-xs font-medium text-gray-600"
                  >
                    Fecha final
                  </label>

                  <input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    min={startDate || undefined}
                    max={today}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-500">
                La descarga será procesada por tu agente local.
              </p>

              <button
                type="submit"
                disabled={
                  isPending ||
                  !hasActiveAgent ||
                  !startDate ||
                  !endDate ||
                  startDate > endDate
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                {isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creando solicitud...
                  </>
                ) : (
                  <>
                    <span className="text-lg">↓</span>
                    Solicitar descarga
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Historial */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Historial de solicitudes
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Consulta el estado y resultado de tus descargas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 sm:self-auto"
          >
            <span>↻</span>
            Actualizar
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-gray-500">
            {filteredRequests.length} de {requests.length} solicitudes
          </span>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-emerald-600"
            aria-label="Filtrar solicitudes por estado"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="PROCESSING">En proceso</option>
            <option value="COMPLETED">Completadas</option>
            <option value="PARTIAL">Parciales</option>
            <option value="FAILED">Fallidas</option>
          </select>
        </div>

        {requests.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
              ↓
            </div>
            <p className="font-semibold text-gray-800">
              Todavía no tienes solicitudes
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Cuando solicites una descarga, aparecerá aquí.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No hay solicitudes con el estado seleccionado.
          </div>
        ) : (
          <>
          {downloadError && (
            <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {downloadError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Periodo</th>
                  <th className="px-5 py-3 font-semibold">Solicitada</th>
                  <th className="px-5 py-3 font-semibold">Documentos</th>
                  <th className="px-5 py-3 font-semibold">Intentos</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Archivos</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-emerald-50/30"
                  >
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-800">
                        {item.requestType === "ISSUED"
                          ? "Emitidos"
                          : "Recibidos"}
                      </span>
                      <p className="mt-1 text-xs text-gray-400">
                        {item.requestType === "ISSUED"
                          ? "Expedidos"
                          : "Recibidos"}
                      </p>
                       <p className="mt-1 text-xs font-medium text-emerald-700">
                        {item.downloadFormat === "METADATA" ? "Metadata" : "XML"}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(item.startDate)} – {formatDate(item.endDate)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </td>

                    <td className="px-5 py-4 font-semibold tabular-nums text-gray-800">
                      {item.documentsDownloaded.toLocaleString("es-MX")}
                    </td>

                    <td className="px-5 py-4 tabular-nums text-gray-600">
                      {item.attempts ?? 0}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                      >
                        {statusLabels[item.status]}
                      </span>

                      {item.satRequestId && (
                        <p
                          className="mt-1 max-w-[190px] truncate text-xs text-gray-400"
                          title={item.satRequestId}
                        >
                          SAT: {item.satRequestId}
                        </p>
                      )}

                      {item.errorMessage && (
                        <p
                          className="mt-1 max-w-[220px] text-xs text-red-600"
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {(
                        item.status === "COMPLETED" ||
                        item.status === "PARTIAL"
                      ) && item.documentsDownloaded > 0 ? (
                        <div className="flex min-w-[170px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(item.id, "excel")}
                            disabled={Boolean(downloadingId)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50"
                          >
                            {downloadingId === `${item.id}:excel`
                              ? "Preparando Excel..."
                              : "↓ Descargar Excel"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(item.id, "xml")}
                            disabled={Boolean(downloadingId)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50"
                          >
                            {downloadingId === `${item.id}:xml`
                              ? "Preparando XML..."
                              : "↓ Descargar XML (ZIP)"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {item.status === "PENDING" ||
                          item.status === "PROCESSING"
                            ? "En espera"
                            : "Sin archivos"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>  
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: number;
  color: "gray" | "amber" | "blue" | "emerald";
  description: string;
}) {
  const styles = {
    gray: {
      border: "border-gray-200",
      icon: "bg-gray-100 text-gray-700",
      number: "text-gray-900",
    },
    amber: {
      border: "border-amber-200",
      icon: "bg-amber-100 text-amber-700",
      number: "text-amber-800",
    },
    blue: {
      border: "border-blue-200",
      icon: "bg-blue-100 text-blue-700",
      number: "text-blue-800",
    },
    emerald: {
      border: "border-emerald-200",
      icon: "bg-emerald-100 text-emerald-800",
      number: "text-emerald-800",
    },
  };

  const style = styles[color];

  return (
    <div className={`rounded-xl border ${style.border} bg-white p-4 shadow-sm sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500 sm:text-sm">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${style.number}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          <span className="text-lg font-bold">
            {color === "emerald"
              ? "✓"
              : color === "amber"
                ? "…"
                : color === "blue"
                  ? "↻"
                  : "#"}
          </span>
        </span>
      </div>
    </div>
  );
}
