import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { HiddenSuppressedView } from "@/components/logs/hidden-suppressed-view";

export default async function HiddenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <HiddenSuppressedView
      role={highestRole(session.user.roles)}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
