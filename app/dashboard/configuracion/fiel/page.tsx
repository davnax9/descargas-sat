
import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentLicense } from "@/utils/auth/session";
import FielConfigurationClient from "@/components/fiel/FielConfigurationClient";

export const instant = false;

export default async function FielConfigurationPage() {
  const license = await getCurrentLicense();

  if (!license) {
    redirect("/login");
  }

  if (license.isAdmin) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Regresar al dashboard
        </Link>
      </div>

      <FielConfigurationClient expectedRfc={license.rfc} />
    </main>
  );
}
