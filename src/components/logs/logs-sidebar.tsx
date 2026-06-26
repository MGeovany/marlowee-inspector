"use client";

import Image from "next/image";
import { LayoutDashboard, LogOut, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppStats } from "@/lib/log-stats";
import type { ContainerApp } from "@/lib/types";
import brandIcon from "@/app/icon.png";

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

  const initials = userInitials(userEmail);

  return (
    <aside className="sidebar-shell flex w-[252px] shrink-0 flex-col">
      {/* Brand */}
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-glass backdrop-blur-sm">
            <Image src={brandIcon} alt="" width={20} height={20} className="h-5 w-5 rounded-sm object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-[15px] font-semibold leading-tight text-fg">
              Marlowee
            </p>
            <p className="text-[11px] text-fg-subtle">Inspector · Development</p>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <nav aria-label="Sections" className="px-3 pb-2">
        <NavItem icon={ScrollText} label="Log Explorer" active />
        <NavItem icon={LayoutDashboard} label="Dashboards" disabled soon />
      </nav>

      <div className="mx-4 my-2 h-px bg-border" />

      {/* Services */}
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">
            Services
          </p>
          {totalErrors > 0 && (
            <span className="rounded-full bg-[rgba(242,77,77,0.14)] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-level-error">
              {totalErrors} err
            </span>
          )}
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto pb-2">
          {allowedApps.length === 0 && (
            <p className="px-2 py-3 text-[12px] text-fg-muted">No apps for your role.</p>
          )}

          {allowedApps.length > 0 && (
            <ServiceRow
              label="All services"
              shortLabel="All"
              errors={totalErrors}
              active={selectedApp === "all"}
              onClick={() => onSelectApp("all")}
            />
          )}

          {allowedApps.map((app) => {
            const stats = statsByApp.get(app);
            return (
              <ServiceRow
                key={app}
                label={app}
                shortLabel={shortAppName(app)}
                errors={stats?.errors ?? 0}
                active={selectedApp === app}
                onClick={() => onSelectApp(app)}
              />
            );
          })}
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-bright to-accent text-[11px] font-bold text-black"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-fg">{userEmail ?? "unknown"}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.05em] text-fg-subtle">
              {role ?? "no role"}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-glass hover:text-fg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  disabled,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={cn(
        "sidebar-nav-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        active && "sidebar-nav-item-active",
        !active && !disabled && "text-fg-muted hover:bg-glass hover:text-fg",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent-bright" : "text-fg-subtle")} />
      <span className={cn("flex-1 text-[13px]", active ? "font-semibold text-fg" : "font-medium")}>
        {label}
      </span>
      {soon && (
        <span className="rounded-full border border-border px-1.5 py-px text-[9px] uppercase tracking-wide text-fg-subtle">
          soon
        </span>
      )}
    </button>
  );
}

function ServiceRow({
  label,
  shortLabel,
  errors,
  active,
  onClick,
}: {
  label: string;
  shortLabel: string;
  errors: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn("sidebar-service-row group w-full", active && "sidebar-service-row-active")}
    >
      <span
        className={cn(
          "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          errors > 0
            ? "bg-level-error shadow-[0_0_6px_rgba(242,77,77,0.45)]"
            : active
              ? "bg-accent-bright"
              : "bg-fg-subtle/40 group-hover:bg-fg-subtle",
        )}
      />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-mono text-[12px] text-fg">{shortLabel}</span>
        {shortLabel !== label && (
          <span className="block truncate font-mono text-[10px] text-fg-subtle">{label}</span>
        )}
      </span>
      {errors > 0 && (
        <span className="shrink-0 rounded-md bg-[rgba(242,77,77,0.12)] px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-level-error">
          {errors}
        </span>
      )}
    </button>
  );
}

function shortAppName(app: ContainerApp): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}

function userInitials(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
