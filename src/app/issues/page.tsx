import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { IssuesView } from "@/components/logs/issues-view";

export default async function IssuesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <IssuesView
      role={highestRole(session.user.roles)}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
