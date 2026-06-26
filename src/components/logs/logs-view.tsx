"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeAppStats,
  computeSidePanel,
  computeSummary,
  filterLogRows,
  relatedLogs,
} from "@/lib/log-stats";
import {
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
  type TimeRange,
  TIME_RANGES,
} from "@/lib/types";
import { LogDetailPanel } from "./log-detail-panel";
import { LogFilters, type LogStream } from "./log-filters";
import { LogsHeader } from "./logs-header";
import { LogsSidebar, type AppSelection } from "./logs-sidebar";
import { LogsSummaryCards } from "./logs-summary-cards";
import { LogsTable, type LogsStatus } from "./logs-table";
import { RecentSignalsPanel } from "./recent-signals-panel";

interface LogsViewProps {
  allowedApps: ContainerApp[];
  role: string | null;
  userEmail: string | null;
  canSeeRaw: boolean;
  maxRange: TimeRange;
  signOutAction: () => Promise<void>;
}

const LIVE_INTERVAL_MS = 15_000;

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
  const [selectedApp, setSelectedApp] = useState<AppSelection>("all");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [stream, setStream] = useState<LogStream>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>(clampRange("24h", maxRange));
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [raw, setRaw] = useState(false);
  const [live, setLive] = useState(true);

  const [status, setStatus] = useState<LogsStatus>("idle");
  const [allRows, setAllRows] = useState<LogEntry[]>([]);
  const [masked, setMasked] = useState(true);
  const [source, setSource] = useState<"mock" | "azure">("mock");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [queryLatencyMs, setQueryLatencyMs] = useState(0);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [nonce, setNonce] = useState(0);

  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    if (allowedApps.length === 0) return;
    setStatus("loading");
    const started = performance.now();

    try {
      const results = await Promise.all(
        allowedApps.map(async (app) => {
          const res = await fetch("/api/logs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              app,
              range: timeRange,
              stream,
              raw,
              limit: 300,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Request failed (${res.status})`);
          }
          return res.json() as Promise<LogsResponse>;
        }),
      );

      const merged = results.flatMap((r) => r.rows);
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setAllRows(merged);
      setMasked(results[0]?.masked ?? true);
      setSource(results[0]?.source ?? "mock");
      setQueryLatencyMs(Math.round(performance.now() - started));
      setLatencyHistory((prev) => [...prev.slice(-13), Math.round(performance.now() - started)]);
      setLastRefresh(new Date());
      setError(null);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setStatus("error");
    }
  }, [allowedApps, timeRange, stream, raw]);

  useEffect(() => {
    const t = setTimeout(() => void fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs, nonce]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), LIVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live, fetchLogs]);

  const tableRows = useMemo(
    () =>
      filterLogRows(allRows, {
        app: selectedApp,
        search,
        level,
        stream,
        errorsOnly,
      }),
    [allRows, selectedApp, search, level, stream, errorsOnly],
  );

  const appStats = useMemo(
    () => allowedApps.map((app) => computeAppStats(allRows, app)),
    [allRows, allowedApps],
  );

  const summary = useMemo(
    () => computeSummary(allRows, timeRange, queryLatencyMs, latencyHistory),
    [allRows, timeRange, queryLatencyMs, latencyHistory],
  );

  const sidePanel = useMemo(() => computeSidePanel(allRows), [allRows]);

  const related = useMemo(
    () => (detailEntry ? relatedLogs(detailEntry, allRows) : []),
    [detailEntry, allRows],
  );

  if (allowedApps.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-panel text-accent mx-auto">
            <span className="font-mono text-xs">403</span>
          </div>
          <p className="text-micro font-medium text-fg">No access</p>
          <p className="mt-1 max-w-xs text-[11px] text-fg-subtle">
            Your account has no role that grants log access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar
        allowedApps={allowedApps}
        selectedApp={selectedApp}
        onSelectApp={setSelectedApp}
        appStats={appStats}
        userEmail={userEmail}
        role={role}
        signOutAction={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <LogsHeader
          lastRefresh={lastRefresh}
          live={live}
          onLiveToggle={() => setLive((v) => !v)}
          onRefresh={() => setNonce((n) => n + 1)}
          loading={status === "loading"}
          source={source}
          masked={masked}
        />

        <LogsSummaryCards summary={summary} loading={status === "loading"} live={live} />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <LogFilters
              search={search}
              onSearchChange={setSearch}
              level={level}
              onLevelChange={setLevel}
              stream={stream}
              onStreamChange={setStream}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              maxRange={maxRange}
              errorsOnly={errorsOnly}
              onErrorsOnlyChange={setErrorsOnly}
              raw={raw}
              onRawChange={setRaw}
              canSeeRaw={canSeeRaw}
            />

            <div className="min-h-0 flex-1 bg-workspace workspace-grid">
              <LogsTable
                status={status}
                rows={tableRows}
                error={error}
                timeRange={timeRange}
                selectedId={detailEntry?.id ?? null}
                onRowClick={setDetailEntry}
                onRetry={() => setNonce((n) => n + 1)}
              />
            </div>
          </div>

          <RecentSignalsPanel
            data={sidePanel}
            onSelectLog={setDetailEntry}
            selectedId={detailEntry?.id ?? null}
          />

          {detailEntry && (
            <LogDetailPanel
              entry={detailEntry}
              related={related}
              timeRange={timeRange}
              masked={masked}
              onClose={() => setDetailEntry(null)}
              onSelectRelated={setDetailEntry}
            />
          )}
        </div>
      </div>
    </div>
  );
}
