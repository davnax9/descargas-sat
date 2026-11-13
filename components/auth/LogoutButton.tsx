"use client";

import { logoutAction } from "@/actions/auth/logout";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        Cerrar sesión
      </button>
    </form>
  );
}