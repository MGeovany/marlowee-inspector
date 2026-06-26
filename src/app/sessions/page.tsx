import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { TestSessionsView } from "@/components/logs/test-sessions-view";

export default async function SessionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = highestRole(session.user.roles);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <TestSessionsView
      role={role}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
