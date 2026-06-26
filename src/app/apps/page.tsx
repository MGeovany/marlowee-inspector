import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { capabilitiesFor, highestRole } from "@/lib/authz";
import { ContainerAppsView } from "@/components/logs/container-apps-view";

export default async function AppsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ContainerAppsView
      role={highestRole(session.user.roles)}
      roles={session.user.roles ?? []}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
