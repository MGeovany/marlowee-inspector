import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { ResolvedView } from "@/components/logs/resolved-view";

export default async function ResolvedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ResolvedView
      role={highestRole(session.user.roles)}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
