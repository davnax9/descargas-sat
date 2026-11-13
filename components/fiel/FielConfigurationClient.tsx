
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

const AGENT_URL = "http://127.0.0.1:4317";

type FielInfo = {
  rfc: string;
  legalName: string;
  serialNumber: string;
};

type AgentStatus = {
  ok: boolean;
  configured: boolean;
  valid?: boolean;
  matchesLicense?: boolean;
  message?: string;
  error?: string;
  fiel?: FielInfo;
};

type TicketAction = "status" | "configure" | "unlink";

type Props = {
  expectedRfc: string;
};

async function getTicket(action: TicketAction): Promise<string> {
  const response = await fetch("/api/agent/fiel-ticket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.ok || !data.token) {
    throw new Error(
      data.error || "No fue posible autorizar la operación."
    );
  }

  return data.token;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("No fue posible leer el archivo."));
        return;
      }

      resolve(result.split(",")[1]);
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo."));
    };

    reader.readAsDataURL(file);
  });
}

export default function FielConfigurationClient({
  expectedRfc,
}: Props) {
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkStatus = useCallback(async () => {
    setChecking(true);
    setError("");

    try {
      const ticket = await getTicket("status");

      const response = await fetch(`${AGENT_URL}/fiel/status`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${ticket}`,
        },
        cache: "no-store",
      });

      const data = (await response.json()) as AgentStatus;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || data.message || "No fue posible consultar el agente."
        );
      }

      setStatus(data);
    } catch (err) {
      setStatus(null);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el agente local."
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!cerFile || !keyFile || !password.trim()) {
      setError("Selecciona ambos archivos e ingresa la contraseña.");
      return;
    }

    if (!cerFile.name.toLowerCase().endsWith(".cer")) {
      setError("El certificado debe tener extensión .cer.");
      return;
    }

    if (!keyFile.name.toLowerCase().endsWith(".key")) {
      setError("La llave privada debe tener extensión .key.");
      return;
    }

    const maxFileSize = 1024 * 1024;

    if (cerFile.size > maxFileSize || keyFile.size > maxFileSize) {
      setError("Cada archivo debe pesar como máximo 1 MB.");
      return;
    }

    setSaving(true);

    try {
      const ticket = await getTicket("configure");

      const [certBase64, keyBase64] = await Promise.all([
        fileToBase64(cerFile),
        fileToBase64(keyFile),
      ]);

      const response = await fetch(`${AGENT_URL}/fiel/configure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${ticket}`,
        },
        body: JSON.stringify({
          certFileName: cerFile.name,
          keyFileName: keyFile.name,
          certBase64,
          keyBase64,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No fue posible configurar la e.firma."
        );
      }

      setSuccess(data.message || "La e.firma se configuró correctamente.");

      setPassword("");
      setCerFile(null);
      setKeyFile(null);

      event.currentTarget.reset();

      await checkStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al configurar la e.firma."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    const confirmed = window.confirm(
      "¿Deseas desvincular la e.firma de este agente? Se eliminarán las credenciales guardadas y los archivos administrados por CFDI Local. No se eliminarán tus archivos originales."
    );

    if (!confirmed) return;

    setUnlinking(true);
    setError("");
    setSuccess("");

    try {
      const ticket = await getTicket("unlink");

      const response = await fetch(`${AGENT_URL}/fiel/unlink`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${ticket}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No fue posible desvincular la e.firma."
        );
      }

      setSuccess(data.message || "La e.firma se desvinculó correctamente.");

      setStatus({
        ok: true,
        configured: false,
        valid: false,
      });

      setPassword("");
      setCerFile(null);
      setKeyFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al desvincular la e.firma."
      );
    } finally {
      setUnlinking(false);
    }
  }

  const configured = status?.configured === true;
  const valid = status?.valid === true;
  const matchesLicense = status?.matchesLicense !== false;
  const fiel = status?.fiel;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Configuración de e.firma
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Administra el certificado que utilizará el agente local para
          consultar tus comprobantes ante el SAT.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Estado de la e.firma
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              RFC de tu licencia: {expectedRfc}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={checking || saving || unlinking}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {checking ? "Consultando..." : "Actualizar estado"}
          </button>
        </div>

        <div className="mt-5">
          {checking ? (
            <p className="text-sm text-gray-500">
              Consultando el agente local...
            </p>
          ) : error && !status ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
              <p className="mt-2 text-xs">
                Verifica que CFDI Local Agent esté ejecutándose y que el
                dispositivo esté vinculado a tu licencia.
              </p>
            </div>
          ) : configured && fiel ? (
            <div
              className={`rounded-lg border p-4 ${
                valid && matchesLicense
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p
                className={`font-semibold ${
                  valid && matchesLicense
                    ? "text-green-800"
                    : "text-amber-800"
                }`}
              >
                {valid && matchesLicense
                  ? "e.firma configurada y validada"
                  : "e.firma configurada, pero requiere atención"}
              </p>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-gray-500">RFC del certificado</p>
                  <p className="font-semibold text-gray-900">{fiel.rfc}</p>
                </div>

                <div>
                  <p className="text-gray-500">Titular</p>
                  <p className="font-semibold text-gray-900">
                    {fiel.legalName}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-gray-500">Número de serie</p>
                  <p className="break-all font-mono text-xs text-gray-800">
                    {fiel.serialNumber}
                  </p>
                </div>
              </div>

              {!valid || !matchesLicense ? (
                <p className="mt-3 text-sm text-amber-800">
                  {status?.message ||
                    "La e.firma no coincide con la licencia o no pudo validarse."}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void handleUnlink()}
                disabled={unlinking || saving}
                className="mt-5 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {unlinking ? "Desvinculando..." : "Desvincular e.firma"}
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-800">
                No hay una e.firma configurada
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Selecciona tus archivos para realizar la configuración.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900">
          {configured ? "Reemplazar e.firma" : "Configurar e.firma"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Necesitas los archivos originales que proporciona el SAT.
          Al reemplazarla, la configuración anterior se sustituirá después
          de validar la nueva.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="cerFile"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Certificado (.cer)
            </label>

            <input
              id="cerFile"
              type="file"
              accept=".cer"
              onChange={(event) =>
                setCerFile(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="keyFile"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Llave privada (.key)
            </label>

            <input
              id="keyFile"
              type="file"
              accept=".key"
              onChange={(event) =>
                setKeyFile(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-lg border border-gray-300 p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Contraseña de la e.firma
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa la contraseña de tu llave privada"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">Importante</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Los archivos se procesan en tu computadora.</li>
              <li>La contraseña no se almacena en la aplicación web.</li>
              <li>El agente valida que el RFC coincida con tu licencia.</li>
              <li>La desvinculación no elimina tus archivos originales.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={saving || checking || unlinking || !status}
            className="w-full rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Validando y configurando..."
              : configured
                ? "Reemplazar e.firma"
                : "Configurar e.firma"}
          </button>
        </form>
      </section>
    </div>
  );
}
