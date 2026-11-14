
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentLicense } from "@/utils/auth/session";

export const instant = false;

export default async function LoginPage() {
  const account = await getCurrentLicense();

  if (account) {
    redirect(account.isAdmin ? "/admin" : "/dashboard");
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#071A17]">

      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "45px 45px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] lg:grid-cols-2">

        {/* Panel tecnológico */}
        <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-20">

          {/* Identidad */}
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 shadow-lg shadow-emerald-500/10">
                <svg
                  className="h-7 w-7 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                  <path d="M14 3v6h5M9 14h7M9 17h7" />
                  <path d="m9 10 1.5 1.5L13 9" />
                </svg>
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-wide text-white">
                  CFDI <span className="text-emerald-400">LOCAL</span>
                </h1>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-200/50">
                  Intelligent fiscal management
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje principal */}
          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Gestión fiscal inteligente
            </div>

            <h2 className="text-5xl font-bold leading-[1.15] tracking-tight text-white xl:text-6xl">
              Tus CFDI,
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                bajo control.
              </span>
            </h2>

            <p className="mt-7 max-w-md text-base leading-8 text-slate-300/70">
              Simplifica la descarga, organización y consulta de tus
              comprobantes fiscales desde una plataforma diseñada para
              trabajar de forma inteligente y eficiente.
            </p>

            {/* Elemento gráfico */}
            <div className="relative mt-12 max-w-md">
              <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      CENTRO DE OPERACIONES
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      Administración de CFDI
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-400/10 p-3 text-emerald-300">
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path d="M4 19V5M4 19h17" />
                      <path d="m7 15 4-4 3 2 6-7" />
                    </svg>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-slate-400">
                        EMITIDOS
                      </span>
                    </div>
                    <div className="h-2 w-20 rounded-full bg-emerald-400/40" />
                    <div className="mt-2 h-1.5 w-14 rounded-full bg-white/10" />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span className="text-[10px] text-slate-400">
                        RECIBIDOS
                      </span>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-cyan-400/40" />
                    <div className="mt-2 h-1.5 w-16 rounded-full bg-white/10" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-200">
                      Información organizada
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Control y consulta desde un solo lugar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>CFDI Local · Plataforma fiscal</span>
          </div>
        </section>

        {/* Panel de acceso */}
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:bg-white/[0.025] lg:px-12">

          <div className="w-full max-w-md">

            {/* Logo móvil */}
            <div className="mb-10 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-400">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                  <path d="M14 3v6h5M9 14h7M9 17h7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">
                CFDI <span className="text-emerald-400">LOCAL</span>
              </h1>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white p-7 shadow-2xl shadow-black/30 sm:p-10">

              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 15v2M6 10V7a6 6 0 0 1 12 0v3" />
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                  </svg>
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Bienvenido de nuevo
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  Iniciar sesión
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Ingresa tus credenciales para acceder a tu espacio de
                  administración fiscal.
                </p>
              </div>

              <LoginForm />

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Acceso privado a tu cuenta
                </div>
              </div>
            </div>

            <p className="mt-7 text-center text-xs leading-6 text-slate-400">
              Plataforma de administración y descarga de CFDI.
              <br />
              Simplifica tu gestión fiscal.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
