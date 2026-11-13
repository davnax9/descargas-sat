
import Link from "next/link";
import { requireAdmin } from "@/utils/auth/permissions";
import { redirect } from "next/navigation";

export const instant = false;

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de administración
        </h1>

        <p className="mt-2 text-gray-600">
          Administra clientes, licencias y operaciones de CFDI Local.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/clientes"
          className="rounded-xl border bg-white p-6 shadow-sm transition hover:border-emerald-700 hover:shadow-md"
        >
          <div className="mb-3 text-emerald-700">
            <span className="text-3xl">♙</span>
          </div>

          <h2 className="font-semibold text-gray-900">
            Clientes
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Registrar, editar y administrar clientes.
          </p>

          <p className="mt-4 text-sm font-medium text-emerald-700">
            Administrar clientes →
          </p>
        </Link>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            Licencias
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Control de vigencias y accesos.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            Actividad
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Historial de solicitudes y descargas.
          </p>
        </div>
      </div>
    </div>
  );
}
