
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

function Icon({
  children,
  className = "h-6 w-6",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
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
    <div className="mx-auto max-w-7xl space-y-8 pb-8">

      {/* Bienvenida */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-6 py-8 text-white shadow-xl sm:px-9 sm:py-10">

        <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 -z-10 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="absolute right-8 top-8 hidden opacity-10 sm:block">
          <Icon className="h-44 w-44">
            <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
            <path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" />
            <path d="m8 5.3 8 4.5" />
          </Icon>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-50 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Plataforma CFDI Local
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ¡Hola, {account.name || account.rfc}!
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base">
            Bienvenido a tu espacio de trabajo. Administra tu e.firma,
            vincula tus dispositivos y descarga tus comprobantes fiscales
            de manera sencilla y segura.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/dashboard/descargas"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <Icon className="h-5 w-5">
                <path d="M12 3v12m-5-5 5 5 5-5" />
                <path d="M5 17v3h14v-3" />
              </Icon>
              Ir a descargas
            </Link>

            <Link
              href="/dashboard/configuracion/fiel"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Icon className="h-5 w-5">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <path d="M12 14v3" />
              </Icon>
              Configurar e.firma
            </Link>
          </div>
        </div>
      </section>

      {/* Información de la cuenta */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Resumen de tu cuenta
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Información general de tu licencia CFDI Local.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">

          {/* RFC */}
          <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  RFC registrado
                </p>
                <p className="mt-3 break-all text-xl font-bold tracking-wide text-gray-900">
                  {account.rfc}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Identificador de tu cuenta
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-700 transition group-hover:bg-blue-100">
                <Icon className="h-6 w-6">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h6M7 16h4" />
                </Icon>
              </div>
            </div>
          </div>

          {/* Licencia */}
          <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Estado de licencia
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    Activa
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {daysRemaining === null
                    ? "Sin fecha de vencimiento"
                    : daysRemaining === 0
                      ? "Vencimiento alcanzado"
                      : `${daysRemaining} días restantes`}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition group-hover:bg-emerald-100">
                <Icon className="h-6 w-6">
                  <path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </Icon>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Accesos principales */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Herramientas disponibles
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Accede rápidamente a las funciones principales de la plataforma.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* Descargas */}
          <Link
            href="/dashboard/descargas"
            className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
          >
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-50 transition duration-300 group-hover:scale-150" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
                  <Icon className="h-7 w-7">
                    <path d="M12 3v12m-5-5 5 5 5-5" />
                    <path d="M5 17v3h14v-3" />
                  </Icon>
                </div>

                <Icon className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-emerald-700">
                  <path d="m9 18 6-6-6-6" />
                </Icon>
              </div>

              <h3 className="mt-5 text-xl font-bold text-gray-900">
                Descarga de CFDI
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                Consulta y descarga tus comprobantes emitidos y recibidos
                directamente desde el SAT. Genera archivos XML, metadata
                y reportes de Excel.
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Abrir módulo
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>

          {/* e.firma */}
          <Link
            href="/dashboard/configuracion/fiel"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-50 transition duration-300 group-hover:scale-150" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <Icon className="h-7 w-7">
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    <path d="M12 14v3" />
                  </Icon>
                </div>

                <Icon className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-blue-700">
                  <path d="m9 18 6-6-6-6" />
                </Icon>
              </div>

              <h3 className="mt-5 text-xl font-bold text-gray-900">
                Configuración de e.firma
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                Administra tu certificado digital y configura las
                credenciales necesarias para realizar solicitudes
                de descarga ante el SAT.
              </p>

              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                Administrar e.firma
                <span className="transition group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>

        </div>
      </section>

      {/* Equipos vinculados */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Icon className="h-6 w-6">
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path d="M8 21h8M12 17v4" />
                <path d="M7 8h10" />
              </Icon>
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Equipos vinculados
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Administra las computadoras autorizadas para realizar
                descargas de CFDI.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <AgentDevicesClient />
        </div>
      </section>

      {/* Pie */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-200 pt-5 text-center text-xs text-gray-400 sm:flex-row sm:text-left">
        <p>CFDI Local · Administración de comprobantes fiscales</p>
        <p>Tu información y archivos permanecen en tu equipo.</p>
      </div>

    </div>
  );
}
