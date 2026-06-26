import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { capabilitiesFor, highestRole } from "@/lib/authz";
import { OverviewView } from "@/components/logs/overview-view";
import type { ContainerApp, TimeRange } from "@/lib/types";

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = highestRole(session.user.roles);
  const caps = capabilitiesFor(session.user.roles);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <OverviewView
      allowedApps={(caps?.apps ?? []) as ContainerApp[]}
      role={role}
      userEmail={session.user.email ?? null}
      maxRange={(caps?.maxRange ?? "1h") as TimeRange}
      signOutAction={signOutAction}
    />
  );
}
