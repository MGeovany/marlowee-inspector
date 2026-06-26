"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useErrorNotifications } from "@/hooks/use-error-notifications";
import {
  filterLogRows,
  relatedLogs,
  summaryToSidePanel,
} from "@/lib/log-stats";
import {
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
  type LogsSummaryResponse,
  type LogMetricsResponse,
  type TimeRange,
  TIME_RANGES,
} from "@/lib/types";
import {
  sessionTimeWindow,
  type TestSession,
} from "@/lib/test-session";
import {
  EMPTY_ISSUE_STORE,
  addIssueNote,
  buildIssueFingerprint,
  collectHiddenLogs,
  collectManagedIssues,
  hideLog,
  isLogHidden,
  issueStatusFor,
  notesForIssue,
  notesForLog,
  reopenLog,
  setIssueStatus,
  shouldSuppressEntry,
  type IssueStatus,
  type IssueStore,
  type NoteTarget,
} from "@/lib/issues";
import {
  fetchStoreInit,
  setIssueStatusApi,
  upsertIssueApi,
  addNoteApi,
  createSessionApi,
  updateSessionApi,
  hideLogEntryApi,
  reopenLogEntryApi,
  fetchSessionsApi,
} from "@/lib/api";
import { LogDetailPanel } from "./log-detail-panel";
import { LogFilters, type LogStream } from "./log-filters";
import { LogsHeader } from "./logs-header";
import { LogsSidebar, type AppSelection } from "./logs-sidebar";
import { LogsSummaryCards, type SummaryCardSparklines } from "./logs-summary-cards";
import { LogsTable, type LogsStatus } from "./logs-table";
import { RecentSignalsPanel } from "./recent-signals-panel";
import { TestSessionBar } from "./test-session-bar";

interface LogsViewProps {
  allowedApps: ContainerApp[];
  role: string | null;
  userEmail: string | null;
  maxRange: TimeRange;
  signOutAction: () => Promise<void>;
  initialSessionId?: string;
  initialApp?: ContainerApp;
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
  maxRange,
  signOutAction,
  initialSessionId,
  initialApp,
}: LogsViewProps) {
  const [selectedApp, setSelectedApp] = useState<AppSelection>(() => {
    if (initialApp && allowedApps.includes(initialApp)) return initialApp;
    return "all";
  });
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [stream, setStream] = useState<LogStream>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>(clampRange("24h", maxRange));
  const [live, setLive] = useState(true);

  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [requestIdFilter, setRequestIdFilter] = useState("");
  const [testSessionIdFilter, setTestSessionIdFilter] = useState("");

  const [status, setStatus] = useState<LogsStatus>("idle");
  const [allRows, setAllRows] = useState<LogEntry[]>([]);
  const [masked, setMasked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [summary, setSummary] = useState<LogsSummaryResponse | null>(null);
  const [cardSparklines, setCardSparklines] = useState<SummaryCardSparklines | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [issueStore, setIssueStoreState] = useState<IssueStore>(EMPTY_ISSUE_STORE);

  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);

  useEffect(() => {
    fetchStoreInit().then((data) => {
      setIssueStoreState({
        issues: data.issues,
        hiddenLogs: data.hiddenLogs,
        notes: data.notes,
      });
      if (!initialSessionId && data.activeSession) {
        setTestSession(data.activeSession);
      }
    }).catch(() => {
      setIssueStoreState(EMPTY_ISSUE_STORE);
    });
  }, [initialSessionId]);

  useEffect(() => {
    if (!initialSessionId) return;
    fetchSessionsApi()
      .then(({ sessions }) => {
        const found = sessions.find((s) => s.id === initialSessionId);
        if (found) {
          setTestSession(found);
          setLive(found.status === "active");
          setNonce((n) => n + 1);
        }
      })
      .catch(() => {});
  }, [initialSessionId]);

  const sessionActive = testSession?.status === "active";

  const fetchSummary = useCallback(async () => {
    if (allowedApps.length === 0) return;
    setSummaryLoading(true);

    try {
      const params = new URLSearchParams({ timeRange });
      if (selectedApp !== "all") params.set("app", selectedApp);
      appendTimeWindow(params, testSession);

      const [summaryRes, metricsRes] = await Promise.all([
        fetch(`/api/logs/summary?${params.toString()}`),
        fetch(`/api/logs/metrics?${params.toString()}`),
      ]);

      if (!summaryRes.ok) {
        const body = await summaryRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Summary request failed (${summaryRes.status})`);
      }

      setSummary((await summaryRes.json()) as LogsSummaryResponse);

      if (metricsRes.ok) {
        const metrics = (await metricsRes.json()) as LogMetricsResponse;
        setCardSparklines({
          totalLogs: metrics.sparklines.totalLogs,
          errorsCount: metrics.sparklines.openErrors,
          warningsCount: metrics.sparklines.warnings,
          logsPerMinute: metrics.sparklines.logsPerMin,
        });
      } else {
        setCardSparklines(null);
      }
    } catch {
      setSummary(null);
      setCardSparklines(null);
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
            errorsOnly: "false",
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
    if (!live) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), LIVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live]);

  const visibleRows = useMemo(
    () => allRows.filter((row) => !shouldSuppressEntry(issueStore, row)),
    [allRows, issueStore],
  );

  const tableRows = useMemo(
    () =>
      filterLogRows(visibleRows, {
        app: selectedApp,
        search,
        level,
        stream,
      }),
    [visibleRows, selectedApp, search, level, stream],
  );

  const errorNotifyResetKey = useMemo(
    () =>
      [
        timeRange,
        selectedApp,
        stream,
        level,
        search,
        testSession?.id ?? "",
        testSession?.startedAt ?? "",
        requestIdFilter,
        testSessionIdFilter,
      ].join("|"),
    [
      timeRange,
      selectedApp,
      stream,
      level,
      search,
      testSession?.id,
      testSession?.startedAt,
      requestIdFilter,
      testSessionIdFilter,
    ],
  );

  useErrorNotifications({
    rows: allRows,
    enabled: live && status === "success",
    resetKey: errorNotifyResetKey,
    onView: setDetailEntry,
  });

  const sidePanel = useMemo(() => summaryToSidePanel(summary), [summary]);
  const resolvedIssues = useMemo(
    () => collectManagedIssues(allRows, issueStore, ["resolved"]),
    [allRows, issueStore],
  );
  const suppressedIssues = useMemo(
    () => collectManagedIssues(allRows, issueStore, ["suppressed", "hidden"]),
    [allRows, issueStore],
  );
  const hiddenLogs = useMemo(
    () => collectHiddenLogs(allRows, issueStore),
    [allRows, issueStore],
  );
  const notesHistory = useMemo(
    () => issueStore.notes.slice(0, 8),
    [issueStore.notes],
  );

  const related = useMemo(
    () => (detailEntry ? relatedLogs(detailEntry, visibleRows) : []),
    [detailEntry, visibleRows],
  );
  const detailFingerprint = detailEntry ? buildIssueFingerprint(detailEntry) : null;
  const detailIssueStatus = detailFingerprint ? issueStatusFor(issueStore, detailFingerprint) : "open";
  const detailIssueNotes = detailFingerprint ? notesForIssue(issueStore, detailFingerprint) : [];
  const detailLogNotes = detailEntry ? notesForLog(issueStore, detailEntry.id) : [];
  const detailLogHidden = detailEntry ? isLogHidden(issueStore, detailEntry) : false;

  function handleIssueStatus(entry: LogEntry, status: IssueStatus) {
    const next = setIssueStatus(issueStore, entry, status);
    setIssueStoreState(next);
    const fp = buildIssueFingerprint(entry);
    setIssueStatusApi(fp, status).catch(() => {});
  }

  function handleAddNote(entry: LogEntry, target: NoteTarget, text: string) {
    const next = addIssueNote(issueStore, entry, target, text);
    setIssueStoreState(next);
    const fp = buildIssueFingerprint(entry);
    addNoteApi({
      target,
      targetId: target === "issue" ? fp : entry.id,
      fingerprint: fp,
      logId: entry.id,
      text,
    }).catch(() => {});
  }

  function handleHideLog(entry: LogEntry) {
    const next = hideLog(issueStore, entry);
    setIssueStoreState(next);
    const fp = buildIssueFingerprint(entry);
    hideLogEntryApi({
      logId: entry.id,
      fingerprint: fp,
      app: entry.app,
      level: entry.level,
      label: entry.message.slice(0, 96),
    }).catch(() => {});
  }

  function handleReopenLog(logId: string) {
    const next = reopenLog(issueStore, logId);
    setIssueStoreState(next);
    reopenLogEntryApi(logId).catch(() => {});
  }

  function handleSessionChange(session: TestSession | null) {
    setTestSession(session);
    setAllRows([]);
    setDetailEntry(null);
    if (session?.status === "active") {
      setLive(true);
      createSessionApi({
        id: session.id,
        name: session.name,
        startedAt: session.startedAt,
      }).catch(() => {});
    } else if (session?.status === "stopped") {
      setLive(false);
      updateSessionApi(session.id, {
        status: "stopped",
        stoppedAt: session.stoppedAt,
      }).catch(() => {});
    }
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
    <div className="ambient-bg flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar
        userEmail={userEmail}
        role={role}
        signOutAction={signOutAction}
      />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <LogsHeader
          lastRefresh={lastRefresh}
          live={live && sessionActive}
          onLiveToggle={() => setLive((v) => !v)}
          onRefresh={() => setNonce((n) => n + 1)}
          loading={status === "loading"}
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
          sparklines={cardSparklines}
          loading={status === "loading" || summaryLoading}
          live={live && sessionActive}
          sessionActive={Boolean(testSession)}
        />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <LogFilters
              search={search}
              onSearchChange={setSearch}
              allowedApps={allowedApps}
              selectedApp={selectedApp}
              onAppChange={setSelectedApp}
              level={level}
              onLevelChange={setLevel}
              stream={stream}
              onStreamChange={setStream}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              maxRange={maxRange}
              sessionMode={Boolean(testSession)}
            />

            <div className="glass-workspace min-h-0 flex-1">
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
            resolvedIssues={resolvedIssues}
            suppressedIssues={suppressedIssues}
            hiddenLogs={hiddenLogs}
            notesHistory={notesHistory}
            onSelectLog={setDetailEntry}
            selectedId={detailEntry?.id ?? null}
          />

          {detailEntry && (
            <LogDetailPanel
              entry={detailEntry}
              related={related}
              timeRange={timeRange}
              masked={masked}
              fingerprint={detailFingerprint ?? ""}
              issueStatus={detailIssueStatus}
              issueNotes={detailIssueNotes}
              logNotes={detailLogNotes}
              logHidden={detailLogHidden}
              onClose={() => setDetailEntry(null)}
              onSelectRelated={setDetailEntry}
              onAddNote={handleAddNote}
              onSetIssueStatus={handleIssueStatus}
              onHideLog={handleHideLog}
              onReopenLog={handleReopenLog}
            />
          )}
        </div>
      </div>
    </div>
  );
}
