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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Descarga de CFDI
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Accede a tu cuenta para administrar y consultar tus CFDI.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-gray-400">
          Plataforma de administración y descarga de CFDI
        </p>
      </div>
    </main>
  );
}