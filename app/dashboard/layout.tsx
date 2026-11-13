import { redirect } from "next/navigation";
import { getCurrentLicense } from "@/utils/auth/session";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = await getCurrentLicense();

  if (!account) {
    redirect("/login");
  }

  if (account.isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            CFDI Local
          </h1>
          <p className="text-sm text-gray-500">
            Portal de clientes
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">
            {account.rfc}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>
    </div>
  );
}