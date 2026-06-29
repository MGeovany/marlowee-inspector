"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Pause, Play, RefreshCw, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogDetailPanel } from "@/components/logs/log-detail-panel";
import { LogFilters } from "@/components/logs/log-filters";
import { LogsSidebar, type AppSelection } from "@/components/logs/logs-sidebar";
import { LogsTable, type LogsStatus } from "@/components/logs/logs-table";
import { useNewRowIds } from "@/hooks/use-new-row-ids";
import { filterLogRows, relatedLogs } from "@/lib/log-stats";
import { buildIssueFingerprint, issueStatusFor, notesForIssue, notesForLog } from "@/lib/issues";
import { fetchStoreInit } from "@/lib/api";
import { EMPTY_ISSUE_STORE, type IssueStore } from "@/lib/issues";
import { cn } from "@/lib/utils";
import {
  TIME_RANGES,
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
  type TimeRange,
} from "@/lib/types";

const LIVE_INTERVAL_MS = 15_000;
const SYSTEM_TABLE = "ContainerAppSystemLogs_CL";

interface SystemLogsViewProps {
  allowedApps: ContainerApp[];
  role: string | null;
  userEmail: string | null;
  maxRange: TimeRange;
  signOutAction: () => Promise<void>;
  initialApp?: ContainerApp;
}

function clampRange(desired: TimeRange, max: TimeRange): TimeRange {
  return TIME_RANGES.indexOf(desired) > TIME_RANGES.indexOf(max) ? max : desired;
}

export function SystemLogsView({
  allowedApps,
  role,
  userEmail,
  maxRange,
  signOutAction,
  initialApp,
}: SystemLogsViewProps) {
  const defaultApp: AppSelection =
    initialApp && allowedApps.includes(initialApp) ? initialApp : allowedApps[0] ?? "all";

  const [selectedApp, setSelectedApp] = useState<AppSelection>(
    defaultApp === "all" && allowedApps.length === 1 ? allowedApps[0]! : defaultApp,
  );
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<LogLevel | "ALL">("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>(clampRange("24h", maxRange));
  const [live, setLive] = useState(true);
  const [status, setStatus] = useState<LogsStatus>("idle");
  const [allRows, setAllRows] = useState<LogEntry[]>([]);
  const [masked, setMasked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);
  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);
  const [issueStore, setIssueStore] = useState<IssueStore>(EMPTY_ISSUE_STORE);

  useEffect(() => {
    fetchStoreInit()
      .then((data) => {
        setIssueStore({
          issues: data.issues,
          hiddenLogs: data.hiddenLogs,
          notes: data.notes,
        });
      })
      .catch(() => setIssueStore(EMPTY_ISSUE_STORE));
  }, []);

  const appsToFetch = useMemo(() => {
    if (selectedApp !== "all") return [selectedApp];
    return allowedApps;
  }, [allowedApps, selectedApp]);

  const fetchLogs = useCallback(async () => {
    if (appsToFetch.length === 0) return;
    setStatus("loading");

    try {
      const responses = await Promise.all(
        appsToFetch.map(async (app) => {
          const params = new URLSearchParams({
            app,
            range: timeRange,
            stream: "system",
            errorsOnly: "false",
            limit: "300",
          });
          if (search.trim()) params.set("search", search.trim());
          if (level !== "ALL") params.set("level", level);

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
  }, [appsToFetch, timeRange, level, search]);

  useEffect(() => {
    const t = setTimeout(() => void fetchLogs(), 250);
    return () => clearTimeout(t);
  }, [fetchLogs, nonce]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), LIVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live]);

  const tableRows = useMemo(
    () =>
      filterLogRows(allRows, {
        app: selectedApp,
        search,
        level,
        stream: "system",
      }),
    [allRows, selectedApp, search, level],
  );

  const querySig = useMemo(
    () => [appsToFetch.join(","), timeRange, level, search].join("|"),
    [appsToFetch, timeRange, level, search],
  );
  const newIds = useNewRowIds(allRows, querySig, status === "success");

  const related = useMemo(
    () => (detailEntry ? relatedLogs(detailEntry, allRows) : []),
    [detailEntry, allRows],
  );

  const detailFingerprint = detailEntry ? buildIssueFingerprint(detailEntry) : null;

  if (allowedApps.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <p className="text-[11px] text-fg-subtle">No container app access for your role.</p>
      </div>
    );
  }

  return (
    <div className="ambient-bg flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar userEmail={userEmail} role={role} signOutAction={signOutAction} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-header shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <div className="dd-breadcrumb flex items-center">
                <span>Sources</span>
                <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
                <span className="text-fg-muted">System Logs</span>
              </div>
              <h1 className="dd-page-title mt-0.5">System Logs</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">stream: system</Badge>
              {masked && <Badge variant="neutral">MASKED</Badge>}
              <Button variant={live ? "live" : "outline"} size="sm" onClick={() => setLive((v) => !v)}>
                {live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {live ? "Live Tail" : "Paused"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNonce((n) => n + 1)}
                disabled={status === "loading"}
              >
                <RefreshCw className={cn("h-3 w-3", status === "loading" && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-1.5 font-mono text-[11px] text-fg-subtle">
            <span>Table {SYSTEM_TABLE}</span>
            <span>Last refresh {lastRefresh ? format(lastRefresh, "HH:mm:ss") : "—"}</span>
          </div>
        </header>

        <div className="mx-3 mt-2 rounded-[var(--radius-md)] border border-[rgba(69,217,255,0.2)] bg-[rgba(69,217,255,0.06)] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] text-fg-muted">
            <ScrollText className="h-3.5 w-3.5 shrink-0 text-level-info" />
            Platform events from Azure Container Apps (revisions, scaling, probes). Console stdout/stderr
            is on Live Logs.
          </div>
        </div>

        <LogFilters
          search={search}
          onSearchChange={setSearch}
          allowedApps={allowedApps}
          selectedApp={selectedApp}
          onAppChange={setSelectedApp}
          level={level}
          onLevelChange={setLevel}
          stream="system"
          onStreamChange={() => {}}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          maxRange={maxRange}
          hideStream
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
            newIds={newIds}
            emptyHint="No system log events in this window"
          />
        </div>

        {detailEntry && detailFingerprint && (
          <LogDetailPanel
            entry={detailEntry}
            related={related}
            timeRange={timeRange}
            masked={masked}
            fingerprint={detailFingerprint}
            issueStatus={issueStatusFor(issueStore, detailFingerprint)}
            issueNotes={notesForIssue(issueStore, detailFingerprint)}
            logNotes={notesForLog(issueStore, detailEntry.id)}
            logHidden={false}
            onClose={() => setDetailEntry(null)}
            onSelectRelated={setDetailEntry}
            onAddNote={() => {}}
            onSetIssueStatus={() => {}}
            onHideLog={() => {}}
            onReopenLog={() => {}}
          />
        )}
      </div>
    </div>
  );
}
