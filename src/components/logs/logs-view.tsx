"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeAppStats,
  computeSidePanel,
  filterLogRows,
  relatedLogs,
} from "@/lib/log-stats";
import {
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
  type LogsSummaryResponse,
  type TimeRange,
  TIME_RANGES,
} from "@/lib/types";
import {
  loadTestSession,
  saveTestSession,
  sessionTimeWindow,
  type TestSession,
} from "@/lib/test-session";
import { LogDetailPanel } from "./log-detail-panel";
import { LogFilters, type LogStream } from "./log-filters";
import { LogsHeader } from "./logs-header";
import { LogsSidebar, type AppSelection } from "./logs-sidebar";
import { LogsSummaryCards } from "./logs-summary-cards";
import { LogsTable, type LogsStatus } from "./logs-table";
import { RecentSignalsPanel } from "./recent-signals-panel";
import { TestSessionBar } from "./test-session-bar";

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

function appendTimeWindow(params: URLSearchParams, session: TestSession | null) {
  const window = sessionTimeWindow(session);
  if (window.since) params.set("since", window.since);
  if (window.until) params.set("until", window.until);
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

  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [requestIdFilter, setRequestIdFilter] = useState("");
  const [testSessionIdFilter, setTestSessionIdFilter] = useState("");

  const [status, setStatus] = useState<LogsStatus>("idle");
  const [allRows, setAllRows] = useState<LogEntry[]>([]);
  const [masked, setMasked] = useState(true);
  const [source, setSource] = useState<"mock" | "azure">("azure");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [summary, setSummary] = useState<LogsSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);

  useEffect(() => {
    setTestSession(loadTestSession());
  }, []);

  const sessionActive = testSession?.status === "active";

  const fetchSummary = useCallback(async () => {
    if (allowedApps.length === 0) return;
    setSummaryLoading(true);

    try {
      const params = new URLSearchParams({ timeRange });
      if (selectedApp !== "all") params.set("app", selectedApp);
      appendTimeWindow(params, testSession);

      const res = await fetch(`/api/logs/summary?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Summary request failed (${res.status})`);
      }
      setSummary((await res.json()) as LogsSummaryResponse);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [allowedApps, selectedApp, testSession, timeRange]);

  const fetchLogs = useCallback(async () => {
    if (allowedApps.length === 0) return;
    setStatus("loading");

    try {
      const responses = await Promise.all(
        allowedApps.map(async (app) => {
          const params = new URLSearchParams({
            app,
            range: timeRange,
            stream,
            raw: String(raw),
            errorsOnly: String(errorsOnly),
            limit: "300",
          });
          if (search.trim()) params.set("search", search.trim());
          if (level !== "ALL") params.set("level", level);
          if (requestIdFilter.trim()) params.set("requestId", requestIdFilter.trim());
          if (testSessionIdFilter.trim()) params.set("testSessionId", testSessionIdFilter.trim());
          appendTimeWindow(params, testSession);

          const res = await fetch(`/api/logs?${params.toString()}`);
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Request failed (${res.status})`);
          }
          return res.json() as Promise<LogsResponse>;
        }),
      );

      const merged = responses.flatMap((r) => r.rows);
      merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setAllRows(merged);
      setMasked(responses[0]?.masked ?? true);
      setSource(responses[0]?.source ?? "azure");
      setLastRefresh(new Date());
      setError(null);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setStatus("error");
    }
  }, [
    allowedApps,
    timeRange,
    stream,
    raw,
    errorsOnly,
    level,
    search,
    testSession,
    requestIdFilter,
    testSessionIdFilter,
  ]);

  useEffect(() => {
    const t = setTimeout(() => void fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs, nonce]);

  useEffect(() => {
    const t = setTimeout(() => void fetchSummary(), 250);
    return () => clearTimeout(t);
  }, [fetchSummary, nonce]);

  useEffect(() => {
    if (!live || !sessionActive) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), LIVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live, sessionActive]);

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

  const sidePanel = useMemo(() => computeSidePanel(allRows), [allRows]);

  const related = useMemo(
    () => (detailEntry ? relatedLogs(detailEntry, allRows) : []),
    [detailEntry, allRows],
  );

  function handleSessionChange(session: TestSession | null) {
    setTestSession(session);
    saveTestSession(session);
    setAllRows([]);
    setDetailEntry(null);
    if (session?.status === "active") setLive(true);
    if (session?.status === "stopped") setLive(false);
    setNonce((n) => n + 1);
  }

  function handleClearView() {
    setAllRows([]);
    setDetailEntry(null);
    setNonce((n) => n + 1);
  }

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
          live={live && sessionActive}
          onLiveToggle={() => setLive((v) => !v)}
          onRefresh={() => setNonce((n) => n + 1)}
          loading={status === "loading"}
          source={source}
          masked={masked}
          testSession={testSession}
        />

        <TestSessionBar
          session={testSession}
          onSessionChange={handleSessionChange}
          onClearView={handleClearView}
          logCount={tableRows.length}
          requestIdFilter={requestIdFilter}
          onRequestIdFilterChange={setRequestIdFilter}
          testSessionIdFilter={testSessionIdFilter}
          onTestSessionIdFilterChange={setTestSessionIdFilter}
        />

        <LogsSummaryCards
          summary={summary}
          loading={status === "loading" || summaryLoading}
          live={live && sessionActive}
          sessionActive={Boolean(testSession)}
        />

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
              sessionMode={Boolean(testSession)}
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
                emptyHint={
                  testSession
                    ? "No logs captured in this session yet. Trigger your test flow — new Azure logs will appear here."
                    : undefined
                }
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
