
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientAction, updateClientAction, toggleClientStatusAction, } from "@/actions/clientes";

type Client = {
  id: string;
  rfc: string;
  name: string | null;
  isActive: boolean;
  expiresAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  notes: string | null;
};

export default function ClientsClient({
  clients,
}: {
  clients: Client[];
}) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [form, setForm] = useState({
    rfc: "",
    name: "",
    password: "",
    expiresAt: "",
    notes: "",
  });

  function openCreate() {
    setEditing(null);
    setMessage("");
    setForm({
      rfc: "",
      name: "",
      password: "",
      expiresAt: "",
      notes: "",
    });
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setMessage("");

    setForm({
      rfc: client.rfc,
      name: client.name ?? "",
      password: "",
      expiresAt: client.expiresAt
        ? client.expiresAt.slice(0, 10)
        : "",
      notes: client.notes ?? "",
    });

    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const formData = new FormData();

    if (editing) {
        formData.set("id", editing.id);
        formData.set("name", form.name);
        formData.set("expiresAt", form.expiresAt);
        formData.set("notes", form.notes);
        formData.set("password", form.password);
    } else {
        formData.set("rfc", form.rfc);
        formData.set("name", form.name);
        formData.set("password", form.password);
        formData.set("expiresAt", form.expiresAt);
        formData.set("notes", form.notes);
    }

    startTransition(async () => {
        const result = editing
        ? await updateClientAction(formData)
        : await createClientAction(formData);

        setMessage(result.message);

        if (result.success) {
        setShowModal(false);
        router.refresh();
        }
    });
  }


  async function toggleStatus(client: Client) {
    const result = await toggleClientStatusAction(client.id);

    setMessage(result.message);
    router.refresh();
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.rfc.toLowerCase().includes(search.toLowerCase()) ||
      (client.name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      status === "ALL" ||
      (status === "ACTIVE" && client.isActive) ||
      (status === "INACTIVE" && !client.isActive);

    return matchesSearch && matchesStatus;
  });

  const activeCount = clients.filter((c) => c.isActive).length;
  const inactiveCount = clients.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra RFC, accesos y vigencias de tus clientes.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800"
        >
          + Nuevo cliente
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total clientes" value={clients.length} />
        <StatCard title="Activos" value={activeCount} />
        <StatCard title="Inactivos" value={inactiveCount} />
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por RFC o nombre..."
            className="flex-1 rounded-lg border px-4 py-2 outline-none focus:border-emerald-700"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border px-4 py-2"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">RFC</th>
                <th className="p-3">Vencimiento</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredClients.map((client) => {
                const expired =
                  !client.expiresAt ||
                  new Date(client.expiresAt) <= new Date();

                return (
                  <tr key={client.id}>
                    <td className="p-3 font-medium text-gray-800">
                      {client.name || "Sin nombre"}
                    </td>

                    <td className="p-3">{client.rfc}</td>

                    <td className="p-3">
                      {client.expiresAt
                        ? new Date(client.expiresAt).toLocaleDateString("es-MX")
                        : "Sin vigencia"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          !client.isActive
                            ? "bg-gray-100 text-gray-600"
                            : expired
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {!client.isActive
                          ? "Inactivo"
                          : expired
                            ? "Vencido"
                            : "Activo"}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          Editar
                        </button>

                        <button
                          disabled={isPending}
                          onClick={() => toggleStatus(client)}
                          className="font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          {client.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editing ? "Editar cliente" : "Registrar cliente"}
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="RFC">
                <input
                  name="rfc"
                  required
                  disabled={!!editing}
                  maxLength={13}
                  value={form.rfc}
                  onChange={(e) =>
                    setForm({ ...form, rfc: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border p-2.5 uppercase"
                  placeholder="RFC DEL CLIENTE"
                />
              </Field>

              <Field label="Nombre del cliente">
                <input
                  name="name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-lg border p-2.5"
                  placeholder="Nombre o razón social"
                />
              </Field>

              <Field label={editing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}>
                <input
                  name="password"
                  type="password"
                  required={!editing}
                  minLength={8}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full rounded-lg border p-2.5"
                  placeholder={editing ? "Dejar vacío para conservar" : "Mínimo 8 caracteres"}
                />
              </Field>

              <Field label="Vigencia de licencia">
                <input
                  name="expiresAt"
                  type="date"
                  required
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value })
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </Field>

              <Field label="Observaciones">
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  className="w-full rounded-lg border p-2.5"
                  rows={3}
                  maxLength={500}
                />
              </Field>

              {message && (
                <p className="text-sm text-red-600">{message}</p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border px-4 py-2 text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-700 px-5 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isPending
                    ? "Guardando..."
                    : editing
                      ? "Guardar cambios"
                      : "Registrar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
