"use server";

import { deleteSession } from "@/utils/auth/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}