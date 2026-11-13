import { redirect } from "next/navigation";
import { getCurrentLicense } from "@/utils/auth/session";

export const instant = false;

export default async function HomePage() {
  const account = await getCurrentLicense();

  if (!account) {
    redirect("/login");
  }

  redirect(account.isAdmin ? "/admin" : "/dashboard");
}