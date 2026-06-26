"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
  type TimeRange,
  TIME_RANGES,
} from "@/lib/types";
import brandIcon from "@/app/icon.png";
import { LogFilters } from "./log-filters";
import { LogsTable, type LogsStatus } from "./logs-table";
import { LogDetailSheet } from "./log-detail-sheet";

interface LogsViewProps {
  allowedApps: ContainerApp[];
  role: string | null;
  userEmail: string | null;
  canSeeRaw: boolean;
  maxRange: TimeRange;
  signOutAction: () => Promise<void>;
}

function clampRange(desired: TimeRange, max: TimeRange): TimeRange {
  return TIME_RANGES.indexOf(desired) > TIME_RANGES.indexOf(max) ? max : desired;
}

export function LogsView({
  allowedApps,
  role,
  userEmail,
  canSeeRaw,
  maxRange,
  signOutAction,
}: LogsViewProps) {
  const [selectedApp, setSelectedApp] = useState<ContainerApp | null>(allowedApps[0] ?? null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>(clampRange("24h", maxRange));
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [raw, setRaw] = useState(false);

  const [status, setStatus] = useState<LogsStatus>("idle");
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [masked, setMasked] = useState(true);
  const [source, setSource] = useState<"mock" | "azure">("mock");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!selectedApp) return;
    const ctrl = new AbortController();
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            app: selectedApp,
            range: timeRange,
            search: search.trim() || undefined,
            level: level === "ALL" ? undefined : level,
            errorsOnly,
            raw,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data: LogsResponse = await res.json();
        setRows(data.rows);
        setMasked(data.masked);
        setSource(data.source);
        setTotal(data.total);
        setError(null);
        setStatus("success");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setStatus("error");
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [selectedApp, search, level, timeRange, errorsOnly, raw, nonce]);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="border-b border-border px-4 pb-6 pt-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src={brandIcon}
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px] shrink-0 rounded-sm object-cover"
              />
              <span className="truncate font-heading text-[13px] tracking-tight text-fg">
                Marlowee Inspector
              </span>
            </div>
            {status === "success" && (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                {total}/{rows.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-7">
          <p className="section-label mb-3">Container apps</p>
          <div className="space-y-1">
            {allowedApps.length === 0 && (
              <p className="px-1 text-micro text-fg-muted">No apps for your role.</p>
            )}
            {allowedApps.map((app) => {
              const active = app === selectedApp;
              return (
                <button
                  key={app}
                  type="button"
                  onClick={() => setSelectedApp(app)}
                  className={cn(
                    "flex w-full items-center rounded-sm border border-transparent border-l-[3px] px-3 py-2.5 text-left font-mono text-micro transition-colors",
                    active
                      ? "border-l-accent bg-accent-soft text-fg"
                      : "border-l-transparent text-fg-muted hover:bg-sidebar-hover hover:text-fg",
                  )}
                >
                  <span className="truncate">{app}</span>
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

      <main className="flex min-w-0 flex-1 flex-col bg-workspace">
        {selectedApp ? (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sidebar px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="section-label">Logs</span>
                <span className="font-mono text-micro text-fg">{selectedApp}</span>
              </div>
              <div className="flex items-center gap-2">
                {source === "mock" && <Badge variant="warn">mock</Badge>}
                {masked && <Badge variant="neutral">masked</Badge>}
              </div>
            </header>

            <LogFilters
              search={search}
              onSearchChange={setSearch}
              level={level}
              onLevelChange={setLevel}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              maxRange={maxRange}
              errorsOnly={errorsOnly}
              onErrorsOnlyChange={setErrorsOnly}
              raw={raw}
              onRawChange={setRaw}
              canSeeRaw={canSeeRaw}
            />

            <div className="min-h-0 flex-1">
              <LogsTable
                status={status}
                rows={rows}
                error={error}
                timeRange={timeRange}
                onRowClick={(entry) => {
                  setDetailEntry(entry);
                  setSheetOpen(true);
                }}
                onRetry={() => setNonce((n) => n + 1)}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-panel text-accent">
              <span className="font-mono text-xs">403</span>
            </div>
            <p className="text-micro font-medium text-fg">No access</p>
            <p className="max-w-xs text-[11px] leading-relaxed text-fg-subtle">
              Your account has no role that grants log access. Ask an admin to assign a role.
            </p>
          </div>
        )}
      </main>

      <LogDetailSheet
        entry={detailEntry}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        masked={masked}
      />
    </div>
  );
}
