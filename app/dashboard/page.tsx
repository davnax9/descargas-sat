
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentLicense } from "@/utils/auth/session";
import AgentDevicesClient from "@/components/agent/AgentDevicesClient";

export const instant = false;

function getDaysUntilExpiration(expiresAt: Date | null) {
  if (!expiresAt) return null;

  const now = Date.now();

  return Math.max(
    0,
    Math.ceil(
      (expiresAt.getTime() - now) /
        (1000 * 60 * 60 * 24)
    )
  );
}

export default async function DashboardPage() {
  const account = await getCurrentLicense();

  if (!account) {
    redirect("/login");
  }

  if (account.isAdmin) {
    redirect("/admin");
  }

  const daysRemaining = getDaysUntilExpiration(account.expiresAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido a CFDI Local
        </h1>

        <p className="mt-2 text-gray-600">
          Hola, {account.name || account.rfc}.
          Desde aquí podrás administrar tus comprobantes fiscales.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* RFC registrado */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            RFC registrado
          </p>

          <p className="mt-2 text-xl font-bold text-gray-900">
            {account.rfc}
          </p>
        </div>

        {/* Estado de licencia */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Estado de licencia
          </p>

          <p className="mt-2 font-semibold text-emerald-700">
            Activa
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {daysRemaining === null
              ? "Sin fecha de vencimiento"
              : `${daysRemaining} días restantes`}
          </p>
        </div>

        {/* Equipos vinculados */}
        <div className="rounded-xl border bg-white p-6 shadow-sm md:col-span-2">
          <AgentDevicesClient />
        </div>
      </div>

      {/* Configuración de e.firma */}
      <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">
                Configuración de e.firma
              </h2>

              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                SAT
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Configura y administra tu certificado digital para
              realizar consultas de CFDI directamente ante el SAT.
            </p>
          </div>

          <Link
            href="/dashboard/configuracion/fiel"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Configurar e.firma
          </Link>
        </div>
      </div>

      {/* Descargas CFDI */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">
          Descarga de CFDI
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Consulta y descarga tus comprobantes emitidos y recibidos
          directamente desde el SAT.
        </p>

        <Link
          href="/dashboard/descargas"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-white transition hover:bg-emerald-800"
        >
          Ir a descargas
        </Link>
      </div>
    </div>
  );
}
