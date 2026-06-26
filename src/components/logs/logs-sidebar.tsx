"use client";

import Image from "next/image";
import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppStats } from "@/lib/log-stats";
import type { ContainerApp } from "@/lib/types";
import brandIcon from "@/app/icon.png";

interface LogsSidebarProps {
  allowedApps: ContainerApp[];
  selectedApp: ContainerApp | null;
  onSelectApp: (app: ContainerApp) => void;
  appStats: AppStats[];
  userEmail: string | null;
  role: string | null;
  signOutAction: () => Promise<void>;
}

const HEALTH: Record<AppStats["health"], { label: string; variant: "info" | "warn" | "error" }> = {
  healthy: { label: "healthy", variant: "info" },
  warning: { label: "warning", variant: "warn" },
  error: { label: "error", variant: "error" },
};

export function LogsSidebar({
  allowedApps,
  selectedApp,
  onSelectApp,
  appStats,
  userEmail,
  role,
  signOutAction,
}: LogsSidebarProps) {
  const statsByApp = new Map(appStats.map((s) => [s.app, s]));

  return (
    <aside className="flex w-[292px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-4 pb-5 pt-5">
        <div className="flex items-center gap-2.5">
          <Image
            src={brandIcon}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] shrink-0 rounded-sm object-cover"
          />
          <div>
            <span className="font-heading text-[13px] tracking-tight text-fg">Marlowee Inspector</span>
            <p className="font-mono text-[10px] text-fg-subtle">observability · dev</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-8">
        <p className="section-label mb-3">Container apps</p>
        <div className="space-y-1.5">
          {allowedApps.length === 0 && (
            <p className="px-1 text-micro text-fg-muted">No apps for your role.</p>
          )}
          {allowedApps.map((app) => {
            const active = app === selectedApp;
            const stats = statsByApp.get(app);
            const health = stats ? HEALTH[stats.health] : HEALTH.healthy;

            return (
              <button
                key={app}
                type="button"
                onClick={() => onSelectApp(app)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-sm border border-transparent border-l-[3px] px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-l-accent bg-accent-soft"
                    : "border-l-transparent hover:bg-sidebar-hover",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-micro text-fg">{app}</span>
                  <Badge variant={health.variant} className="shrink-0">
                    {health.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] tabular-nums text-fg-subtle">
                  <span>{stats?.total ?? 0} logs</span>
                  <span className="text-level-error">{stats?.errors ?? 0} err</span>
                  <span className="text-level-warn">{stats?.warnings ?? 0} warn</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] text-fg">{userEmail ?? "unknown"}</p>
            {role ? (
              <Badge variant="accent" className="mt-1">
                {role}
              </Badge>
            ) : (
              <Badge variant="warn" className="mt-1">
                no role
              </Badge>
            )}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-sm border border-transparent p-1 text-fg-subtle transition-colors hover:border-border hover:bg-sidebar-hover hover:text-fg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
