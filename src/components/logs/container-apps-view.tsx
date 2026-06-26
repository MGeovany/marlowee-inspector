"use client";

import Link from "next/link";
import { Check, Database, Radio, ScrollText, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SourcesPageShell } from "@/components/logs/sources-page-shell";
import {
  CAPABILITIES,
  canReadApp,
  capabilitiesFor,
  rolesForApp,
  type Capabilities,
  type Role,
} from "@/lib/authz";
import { ALLOWED_APPS } from "@/lib/queries";
import type { ContainerApp } from "@/lib/types";

interface ContainerAppsViewProps {
  role: Role | null;
  roles: string[];
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

const APP_LABELS: Record<ContainerApp, string> = {
  "ca-data-api": "Data API",
  "ca-dashboard": "Dashboard",
  "ca-onboarding": "Onboarding",
  "ca-admin": "Admin",
};

export function ContainerAppsView({
  role,
  roles,
  userEmail,
  signOutAction,
}: ContainerAppsViewProps) {
  const caps = capabilitiesFor(roles);

  return (
    <SourcesPageShell title="Container Apps" userEmail={userEmail} role={role} signOutAction={signOutAction}>
      <section className="mx-3 mt-3 rounded-[var(--radius-lg)] border border-[rgba(69,217,255,0.22)] bg-gradient-to-r from-[rgba(69,217,255,0.08)] via-[rgba(255,255,255,0.03)] to-transparent px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(69,217,255,0.28)] bg-[rgba(69,217,255,0.1)] text-level-info">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-level-info">
                Azure Container Apps
              </p>
              <p className="font-heading text-[16px] font-semibold text-fg">Development workspace catalog</p>
              <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                law-savvly-dev-main · {ALLOWED_APPS.length} apps · role-based read access via authz.ts
              </p>
            </div>
          </div>
          {caps && role && <RoleCapsSummary role={role} caps={caps} />}
        </div>
      </section>

      <section className="px-3 py-3">
        <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-3 py-2 font-semibold">App</th>
                <th className="px-3 py-2 font-semibold">Resource ID</th>
                <th className="px-3 py-2 font-semibold">Your access</th>
                <th className="px-3 py-2 font-semibold">Roles with access</th>
                <th className="px-3 py-2 text-right font-semibold">Open logs</th>
              </tr>
            </thead>
            <tbody>
              {ALLOWED_APPS.map((app) => {
                const allowed = caps ? canReadApp(caps, app) : false;
                const appRoles = rolesForApp(app);
                return (
                  <tr key={app} className="border-b border-border/60 last:border-0 hover:bg-glass">
                    <td className="px-3 py-2.5">
                      <p className="font-sans text-[13px] font-medium text-fg">{APP_LABELS[app]}</p>
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted">{app}</td>
                    <td className="px-3 py-2.5">
                      {allowed ? (
                        <span className="inline-flex items-center gap-1 text-accent-bright">
                          <Check className="h-3 w-3" />
                          Allowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-fg-subtle">
                          <X className="h-3 w-3" />
                          Denied
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {appRoles.map((r) => (
                          <Badge
                            key={r}
                            variant={r === role ? "accent" : "neutral"}
                            className="normal-case"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {allowed ? (
                          <>
                            <Link
                              href={`/logs?app=${encodeURIComponent(app)}`}
                              className="motion-press inline-flex h-7 items-center gap-2 rounded-md border border-border bg-glass px-2.5 text-[11px] font-semibold text-fg backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised"
                            >
                              <Radio className="h-3 w-3" />
                              Console
                            </Link>
                            <Link
                              href={`/system-logs?app=${encodeURIComponent(app)}`}
                              className="motion-press inline-flex h-7 items-center gap-2 rounded-md border border-border bg-glass px-2.5 text-[11px] font-semibold text-fg backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised"
                            >
                              <ScrollText className="h-3 w-3" />
                              System
                            </Link>
                          </>
                        ) : (
                          <span className="text-[10px] text-fg-subtle">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-border px-3 py-3">
        <h2 className="section-label mb-2.5">Role capability matrix</h2>
        <div className="glass-card overflow-x-auto rounded-[var(--radius-md)]">
          <table className="w-full min-w-[640px] border-collapse font-mono text-[10px]">
            <thead>
              <tr className="border-b border-border bg-[#242526] text-left uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-3 py-2 font-semibold">Role</th>
                <th className="px-3 py-2 font-semibold">Apps</th>
                <th className="px-3 py-2 font-semibold">Max range</th>
                <th className="px-3 py-2 font-semibold">Raw logs</th>
                <th className="px-3 py-2 font-semibold">Rate/min</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(CAPABILITIES) as Role[]).map((r) => {
                const c = CAPABILITIES[r];
                return (
                  <tr
                    key={r}
                    className={`border-b border-border/60 last:border-0 ${r === role ? "bg-[rgba(0,217,115,0.06)]" : "hover:bg-glass"}`}
                  >
                    <td className="px-3 py-2.5 font-semibold text-fg">{r}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{c.apps.join(", ")}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{c.maxRange}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{c.canSeeRaw ? "yes" : "no"}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{c.rateLimitPerMinute}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </SourcesPageShell>
  );
}

function RoleCapsSummary({ role, caps }: { role: Role; caps: Capabilities }) {
  return (
    <div className="rounded-md border border-border bg-glass px-3 py-2 font-mono text-[10px] text-fg-muted">
      <p className="font-semibold uppercase tracking-[0.06em] text-fg-subtle">Your role</p>
      <p className="mt-0.5 text-[12px] font-semibold text-fg">{role}</p>
      <p className="mt-1">{caps.apps.length} apps · max {caps.maxRange} · {caps.rateLimitPerMinute}/min</p>
    </div>
  );
}
