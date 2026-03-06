import { redirect } from "next/navigation";

import { getCurrentSessionUser } from "@/lib/auth/session";

export async function requireUser() {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
