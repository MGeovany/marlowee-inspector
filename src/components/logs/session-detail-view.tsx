"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Copy,
  Radio,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/logs/level-badge";
import { LogsSidebar } from "@/components/logs/logs-sidebar";
import { cn } from "@/lib/utils";
import { fetchSessionSummaryApi } from "@/lib/api";
import { formatSessionDuration, type TestSession } from "@/lib/test-session";
import {
  LOG_LEVELS,
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type LogsSummaryResponse,
} from "@/lib/types";

interface SessionDetailViewProps {
  session: TestSession;
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
  onBack: () => void;
}

const LEVEL_TONE: Record<LogLevel, string> = {
  ERROR: "bg-level-error",
  WARN: "bg-level-warn",
  INFO: "bg-level-info",
  LOG: "bg-fg-subtle",
  DEBUG: "bg-fg-subtle",
};

export function SessionDetailView({
  session,
  role,
  userEmail,
  signOutAction,
  onBack,
}: SessionDetailViewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<LogsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSummary(await fetchSessionSummaryApi(session));
    } catch {
      setError(true);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (session.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session.status]);

  const durationMs =
    new Date(session.stoppedAt ?? now).getTime() - new Date(session.startedAt).getTime();

  const isActive = session.status === "active";

  async function copyId() {
    await navigator.clipboard.writeText(session.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function openInLiveLogs() {
    router.push(`/logs?sessionId=${encodeURIComponent(session.id)}`);
  }

  return (
    <div className="ambient-bg flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar userEmail={userEmail} role={role} signOutAction={signOutAction} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-header shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <div className="dd-breadcrumb flex items-center">
                <span>Monitor</span>
                <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
                <button type="button" onClick={onBack} className="hover:text-fg">
                  Test Sessions
                </button>
                <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
                <span className="truncate text-fg-muted">{session.name}</span>
              </div>
              <h1 className="dd-page-title mt-0.5 truncate">{session.name}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-3 w-3" />
                Back
              </Button>
              <Button variant="outline" size="sm" onClick={openInLiveLogs}>
                <Radio className="h-3 w-3" />
                Open in Live Logs
              </Button>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Session meta */}
          <section className="border-b border-border px-3 py-3">
            <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] p-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <MetaItem label="Status">
                  <Badge variant={isActive ? "success" : "neutral"}>
                    {isActive && <span className="live-dot mr-1" />}
                    {isActive ? "Recording" : "Stopped"}
                  </Badge>
                </MetaItem>
                <MetaItem label="Started">
                  <span className="font-mono text-[11px] text-fg">
                    {format(new Date(session.startedAt), "MMM d, HH:mm:ss")}
                  </span>
                </MetaItem>
                <MetaItem label={isActive ? "Elapsed" : "Duration"}>
                  <span className="font-mono text-[11px] tabular-nums text-fg">
                    {formatSessionDuration(durationMs)}
                  </span>
                </MetaItem>
                {session.stoppedAt && (
                  <MetaItem label="Stopped">
                    <span className="font-mono text-[11px] text-fg">
                      {format(new Date(session.stoppedAt), "MMM d, HH:mm:ss")}
                    </span>
                  </MetaItem>
                )}
                <MetaItem label="Session ID">
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-[10px] text-fg-subtle">{session.id}</code>
                    <button
                      type="button"
                      onClick={() => void copyId()}
                      className="text-fg-subtle hover:text-fg"
                      aria-label="Copy session ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {copied && <span className="text-[10px] text-accent-bright">Copied</span>}
                  </div>
                </MetaItem>
              </div>
            </div>
          </section>

          {/* Metric cards */}
          <section className="grid grid-cols-2 gap-2 px-3 py-3 xl:grid-cols-4">
            <StatCard label="Total logs" value={summary?.totalLogs} tone="info" loading={loading} />
            <StatCard label="Errors" value={summary?.errorsCount} tone="error" loading={loading} />
            <StatCard
              label="Warnings"
              value={summary?.warningsCount}
              tone="warn"
              loading={loading}
            />
            <StatCard
              label="Logs / min"
              value={summary?.logsPerMinute}
              tone="success"
              loading={loading}
            />
          </section>

          {error && (
            <p className="px-4 py-2 font-mono text-[11px] text-level-error">
              Could not load this session’s breakdown. Try refreshing.
            </p>
          )}

          {!loading && summary && summary.totalLogs === 0 && (
            <p className="px-4 py-8 text-center font-mono text-[12px] text-fg-subtle">
              No logs captured during this session window.
            </p>
          )}

          {summary && summary.totalLogs > 0 && (
            <div className="grid grid-cols-1 gap-3 px-3 pb-6 lg:grid-cols-2">
              <Panel title="Logs by level">
                <LevelBreakdown logsByLevel={summary.logsByLevel} total={summary.totalLogs} />
              </Panel>

              <Panel title="Errors by app">
                <AppBreakdown errorsByApp={summary.errorsByApp} />
              </Panel>

              <Panel title={`Top error patterns (${summary.errorPatterns.length})`}>
                <PatternList patterns={summary.errorPatterns} />
              </Panel>

              <Panel title="Latest errors">
                <LogList entries={summary.latestErrors} empty="No errors in this session" />
              </Panel>

              <Panel title="Recent activity" className="lg:col-span-2">
                <LogList entries={summary.recentActivity} empty="No recent activity" />
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number | undefined;
  tone: "error" | "warn" | "info" | "success";
  loading: boolean;
}) {
  return (
    <div className="metric-card shadow-panel">
      <p className="metric-label">{label}</p>
      <p className={cn("metric-value mt-1", toneClass(tone), loading && "opacity-50")}>
        {typeof value === "number" ? value.toLocaleString() : "--"}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-card overflow-hidden rounded-[var(--radius-md)]", className)}>
      <h2 className="section-label border-b border-border px-3 py-2">{title}</h2>
      <div className="p-3">{children}</div>
    </section>
  );
}

function LevelBreakdown({
  logsByLevel,
  total,
}: {
  logsByLevel: Partial<Record<LogLevel, number>>;
  total: number;
}) {
  const rows = LOG_LEVELS.map((level) => ({ level, count: logsByLevel[level] ?? 0 })).filter(
    (r) => r.count > 0,
  );
  if (rows.length === 0) {
    return <p className="font-mono text-[11px] text-fg-subtle">No data</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ level, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={level} className="flex items-center gap-2.5">
            <span className="w-12 shrink-0">
              <LevelBadge level={level} />
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-glass">
              <div
                className={cn("h-full rounded-full", LEVEL_TONE[level])}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-muted">
              {count.toLocaleString()} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AppBreakdown({
  errorsByApp,
}: {
  errorsByApp: Partial<Record<ContainerApp, number>>;
}) {
  const rows = Object.entries(errorsByApp)
    .map(([app, count]) => ({ app: app as ContainerApp, count: count ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const hasErrors = rows.some((r) => r.count > 0);

  if (!hasErrors) {
    return <p className="font-mono text-[11px] text-fg-subtle">No errors across apps 🎉</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ app, count }) => (
        <div key={app} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 truncate font-mono text-[11px] text-fg-muted">
            {shortAppName(app)}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-glass">
            <div
              className="h-full rounded-full bg-level-error"
              style={{ width: `${count > 0 ? Math.max((count / max) * 100, 4) : 0}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-muted">
            {count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function PatternList({ patterns }: { patterns: LogsSummaryResponse["errorPatterns"] }) {
  if (patterns.length === 0) {
    return <p className="font-mono text-[11px] text-fg-subtle">No recurring error patterns</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {patterns.slice(0, 8).map((pattern) => (
        <li key={pattern.key} className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-level-error" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11px] text-fg">{pattern.label}</p>
            <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
              {shortAppName(pattern.app)}
            </p>
          </div>
          <Badge variant="error" className="shrink-0">
            ×{pattern.count.toLocaleString()}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function LogList({ entries, empty }: { entries: LogEntry[]; empty: string }) {
  if (entries.length === 0) {
    return <p className="font-mono text-[11px] text-fg-subtle">{empty}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {entries.slice(0, 10).map((entry) => (
        <li key={entry.id} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
          <LevelBadge level={entry.level} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 break-words font-mono text-[11px] text-fg">
              {entry.message}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
              {shortAppName(entry.app)} · {format(new Date(entry.timestamp), "MMM d, HH:mm:ss")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function shortAppName(app: string): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}

function toneClass(tone: "error" | "warn" | "info" | "success"): string {
  if (tone === "error") return "text-level-error";
  if (tone === "warn") return "text-level-warn";
  if (tone === "success") return "text-[var(--green)]";
  return "text-fg";
}
