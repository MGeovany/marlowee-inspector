import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { capabilitiesFor, highestRole } from "@/lib/authz";
import { LogsView } from "@/components/logs/logs-view";
import type { ContainerApp, TimeRange } from "@/lib/types";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = highestRole(session.user.roles);
  const caps = capabilitiesFor(session.user.roles);
  const { sessionId } = await searchParams;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <LogsView
      allowedApps={(caps?.apps ?? []) as ContainerApp[]}
      role={role}
      userEmail={session.user.email ?? null}
      maxRange={(caps?.maxRange ?? "1h") as TimeRange}
      signOutAction={signOutAction}
      initialSessionId={sessionId}
    />
  );
}
