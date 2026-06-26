import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { capabilitiesFor, highestRole } from "@/lib/authz";
import { SystemLogsView } from "@/components/logs/system-logs-view";
import type { ContainerApp, TimeRange } from "@/lib/types";

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = highestRole(session.user.roles);
  const caps = capabilitiesFor(session.user.roles);
  const { app } = await searchParams;
  const allowedApps = (caps?.apps ?? []) as ContainerApp[];
  const initialApp =
    app && allowedApps.includes(app as ContainerApp) ? (app as ContainerApp) : undefined;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <SystemLogsView
      allowedApps={allowedApps}
      role={role}
      userEmail={session.user.email ?? null}
      maxRange={(caps?.maxRange ?? "1h") as TimeRange}
      signOutAction={signOutAction}
      initialApp={initialApp}
    />
  );
}
