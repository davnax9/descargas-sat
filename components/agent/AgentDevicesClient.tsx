
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  createAgentPairingCode,
  getAgentDevices,
  revokeAgentDevice,
} from "@/actions/agent";

type AgentDevice = {
  id: string;
  name: string;
  platform: string;
  agentVersion: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type PairingResult = {
  success: boolean;
  message?: string;
};

const LOCAL_AGENT_URL = "http://127.0.0.1:4317";

export default function AgentDevicesClient() {
  const [devices, setDevices] = useState<AgentDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadDevices = useCallback(async () => {
    try {
      setError("");

      const result = await getAgentDevices();
      setDevices(result);
    } catch {
      setError("No fue posible consultar los dispositivos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  async function pairComputer() {
    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        // 1. Generar autorización temporal en el servidor.
        const pairing = await createAgentPairingCode();

        if (
          !pairing.success ||
          !pairing.code
        ) {
          throw new Error(
            pairing.message ||
              "No fue posible generar la autorización.",
          );
        }

        // 2. Enviar el código directamente al agente local.
        let response: Response;

        try {
          response = await fetch(`${LOCAL_AGENT_URL}/pair`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: pairing.code,
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(25000),
          });
        } catch {
          throw new Error(
            "No se pudo conectar con el agente local. Verifica que CFDI Local esté instalado y ejecutándose en esta computadora.",
          );
        }

        const result =
          (await response.json().catch(() => null)) as
            | PairingResult
            | null;

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
              "No fue posible vincular esta computadora.",
          );
        }

        // 3. Confirmar la vinculación en pantalla.
        setMessage(
          result.message ||
            "Computadora vinculada correctamente.",
        );

        // 4. Actualizar los dispositivos.
        await loadDevices();
      } catch (error) {
        console.error("Error de vinculación:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error durante la vinculación.",
        );
      }
    });
  }

  async function handleRevoke(deviceId: string) {
    const confirmed = window.confirm(
      "¿Deseas revocar el acceso de esta computadora?",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    startTransition(async () => {
      try {
        const result = await revokeAgentDevice(deviceId);

        if (!result.success) {
          setError("No fue posible revocar el dispositivo.");
          return;
        }

        setMessage("Dispositivo revocado correctamente.");

        await loadDevices();
      } catch {
        setError("Ocurrió un error al revocar el dispositivo.");
      }
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "Nunca";

    return new Date(value).toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Computadoras vinculadas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Administra los equipos autorizados para realizar descargas.
          </p>
        </div>

        <button
          type="button"
          onClick={pairComputer}
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Vinculando computadora..."
            : "Vincular computadora"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">
            Cargando dispositivos...
          </p>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-700">
              No tienes computadoras vinculadas.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Vincula tu primera computadora para comenzar a trabajar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {device.name}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        device.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {device.isActive ? "Activo" : "Revocado"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {device.platform}
                    {device.agentVersion
                      ? ` · Agente ${device.agentVersion}`
                      : ""}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Última conexión: {formatDate(device.lastSeenAt)}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Vinculado: {formatDate(device.createdAt)}
                  </p>
                </div>

                {device.isActive && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(device.id)}
                    disabled={isPending}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Revocar acceso
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
