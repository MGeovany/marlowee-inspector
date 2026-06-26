import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { AuditView } from "@/components/logs/audit-view";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = highestRole(session.user.roles);
  if (role !== "Admin") redirect("/logs");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <AuditView signOutAction={signOutAction} />;
}
