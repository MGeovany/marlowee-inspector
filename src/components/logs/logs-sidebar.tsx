"use client";

import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppStats } from "@/lib/log-stats";
import type { ContainerApp } from "@/lib/types";

export type AppSelection = ContainerApp | "all";

interface LogsSidebarProps {
  allowedApps: ContainerApp[];
  selectedApp: AppSelection;
  onSelectApp: (app: AppSelection) => void;
  appStats: AppStats[];
  userEmail: string | null;
  role: string | null;
  signOutAction: () => Promise<void>;
}

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
  const totalErrors = appStats.reduce((sum, s) => sum + s.errors, 0);

  return (
    <aside className="glass-sidebar flex w-[240px] shrink-0 flex-col">
      <div className="border-b border-border px-3 py-3">
        <p className="section-label mb-2">Facets</p>
        <p className="text-[12px] font-medium text-fg">Service</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {allowedApps.length === 0 && (
          <p className="px-2 py-1 text-micro text-fg-muted">No apps for your role.</p>
        )}

        {allowedApps.length > 0 && (
          <FacetRow
            label="All services"
            count={totalErrors > 0 ? totalErrors : undefined}
            countTone="error"
            active={selectedApp === "all"}
            onClick={() => onSelectApp("all")}
          />
        )}

        {allowedApps.map((app) => {
          const stats = statsByApp.get(app);
          const errors = stats?.errors ?? 0;
          return (
            <FacetRow
              key={app}
              label={app}
              count={errors > 0 ? errors : undefined}
              countTone="error"
              active={selectedApp === app}
              onClick={() => onSelectApp(app)}
              mono
            />
          );
        })}
      </div>

      <div className="mt-auto border-t border-border p-3">
        <div className="glass-card rounded-md px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-fg">{userEmail ?? "unknown"}</p>
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
                className="rounded-sm p-1 text-fg-subtle transition-colors hover:bg-sidebar-hover hover:text-fg"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FacetRow({
  label,
  count,
  countTone,
  active,
  onClick,
  mono,
}: {
  label: string;
  count?: number;
  countTone?: "error" | "neutral";
  active: boolean;
  onClick: () => void;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("facet-row mb-0.5", active && "facet-row-active")}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
          active ? "border-accent bg-gradient-to-br from-accent-bright to-accent text-[9px] text-black" : "border-border bg-glass",
        )}
      >
        {active && "✓"}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-fg", mono && "font-mono text-[11px]")}>
        {label}
      </span>
      {count != null && count > 0 && (
        <span
          className={cn(
            "shrink-0 rounded-sm px-1 font-mono text-[10px] tabular-nums",
            countTone === "error"
              ? "bg-[rgba(242,77,77,0.14)] text-level-error"
              : "text-fg-subtle",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
