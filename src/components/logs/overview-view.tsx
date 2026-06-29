"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, Database, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { LogsSidebar } from "@/components/logs/logs-sidebar";
import { LogsSummaryCards, type SummaryCardSparklines } from "@/components/logs/logs-summary-cards";
import { Sparkline } from "@/components/logs/sparkline";
import { cn } from "@/lib/utils";
import {
  TIME_RANGES,
  TIME_RANGE_LABEL,
  type ContainerApp,
  type LogMetricsResponse,
  type LogsSummaryResponse,
  type TimeRange,
} from "@/lib/types";

const WORKSPACE_NAME = "law-savvly-dev-main";

interface OverviewViewProps {
  allowedApps: ContainerApp[];
  role: string | null;
  userEmail: string | null;
  maxRange: TimeRange;
  signOutAction: () => Promise<void>;
}

interface AppMetricsSnapshot {
  app: ContainerApp;
  summary: LogsSummaryResponse | null;
  sparkline: number[];
  loading: boolean;
}

function clampRange(desired: TimeRange, max: TimeRange): TimeRange {
  return TIME_RANGES.indexOf(desired) > TIME_RANGES.indexOf(max) ? max : desired;
}

export function OverviewView({
  allowedApps,
  role,
  userEmail,
  maxRange,
  signOutAction,
}: OverviewViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(clampRange("24h", maxRange));
  const [summary, setSummary] = useState<LogsSummaryResponse | null>(null);
  const [cardSparklines, setCardSparklines] = useState<SummaryCardSparklines | null>(null);
  const [appSnapshots, setAppSnapshots] = useState<AppMetricsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nonce, setNonce] = useState(0);

  const maxIdx = TIME_RANGES.indexOf(maxRange);

  const fetchOverview = useCallback(async () => {
    if (allowedApps.length === 0) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ timeRange });

      const [summaryRes, metricsRes] = await Promise.all([
        fetch(`/api/logs/summary?${params.toString()}`),
        fetch(`/api/logs/metrics?${params.toString()}`),
      ]);

      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) as LogsSummaryResponse);
      } else {
        setSummary(null);
      }

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

      // Only show placeholders on the first load; on refresh keep the previous
      // values visible until the new ones arrive (no flicker).
      setAppSnapshots((prev) =>
        prev.length === 0
          ? allowedApps.map((app) => ({
              app,
              summary: null,
              sparkline: [],
              loading: true,
            }))
          : prev,
      );

      const perApp = await Promise.all(
        allowedApps.map(async (app) => {
          const appParams = new URLSearchParams({ timeRange, app });
          const [appSummaryRes, appMetricsRes] = await Promise.all([
            fetch(`/api/logs/summary?${appParams.toString()}`),
            fetch(`/api/logs/metrics?${appParams.toString()}`),
          ]);

          let appSummary: LogsSummaryResponse | null = null;
          let sparkline: number[] = [];

          if (appSummaryRes.ok) {
            appSummary = (await appSummaryRes.json()) as LogsSummaryResponse;
          }
          if (appMetricsRes.ok) {
            const metrics = (await appMetricsRes.json()) as LogMetricsResponse;
            sparkline = metrics.sparklines.totalLogs;
          }

          return { app, summary: appSummary, sparkline, loading: false };
        }),
      );

      setAppSnapshots(perApp);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [allowedApps, timeRange]);

  useEffect(() => {
    const t = setTimeout(() => void fetchOverview(), 150);
    return () => clearTimeout(t);
  }, [fetchOverview, nonce]);

  const errorPatterns = useMemo(
    () => summary?.errorPatterns.slice(0, 8) ?? [],
    [summary?.errorPatterns],
  );

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
                <span className="text-fg-muted">Overview</span>
              </div>
              <h1 className="dd-page-title mt-0.5">Overview</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)} disabled={loading}>
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <WorkspaceBanner
            timeRange={timeRange}
            maxIdx={maxIdx}
            maxRange={maxRange}
            lastRefresh={lastRefresh}
            onTimeRangeChange={setTimeRange}
          />

          <LogsSummaryCards
            summary={summary}
            sparklines={cardSparklines}
            loading={loading && !summary}
            live={false}
          />

          <section className="border-b border-border px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="section-label">Volume by app</h2>
              <span className="font-mono text-[10px] text-fg-subtle">{TIME_RANGE_LABEL[timeRange]} window</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {appSnapshots.map((snap) => (
                <AppVolumeCard key={snap.app} snapshot={snap} loading={loading && snap.loading} />
              ))}
            </div>
          </section>

          <section className="px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="section-label">Top error patterns</h2>
              <span className="font-mono text-[10px] text-fg-subtle">Azure KQL aggregates</span>
            </div>
            <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
              {errorPatterns.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">
                  {loading ? "Loading patterns…" : "No error patterns in this window"}
                </p>
              ) : (
                <table className="w-full border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      <th className="px-3 py-2 font-semibold">Pattern</th>
                      <th className="px-3 py-2 font-semibold">App</th>
                      <th className="px-3 py-2 text-right font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorPatterns.map((pattern) => (
                      <tr key={pattern.key} className="border-b border-border/60 last:border-0 hover:bg-glass">
                        <td className="max-w-[420px] truncate px-3 py-2.5 text-fg">{pattern.label}</td>
                        <td className="px-3 py-2.5 text-fg-muted">{shortAppName(pattern.app)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-level-error">
                          {pattern.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WorkspaceBanner({
  timeRange,
  maxIdx,
  maxRange,
  lastRefresh,
  onTimeRangeChange,
}: {
  timeRange: TimeRange;
  maxIdx: number;
  maxRange: TimeRange;
  lastRefresh: Date | null;
  onTimeRangeChange: (range: TimeRange) => void;
}) {
  return (
    <div className="mx-3 mt-3 rounded-[var(--radius-lg)] border border-[rgba(0,217,115,0.22)] bg-gradient-to-r from-[rgba(0,217,115,0.1)] via-[rgba(255,255,255,0.03)] to-transparent px-4 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(0,217,115,0.28)] bg-[rgba(0,217,115,0.12)] text-accent-bright">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-bright">
              Log Analytics workspace
            </p>
            <p className="truncate font-heading text-[16px] font-semibold text-fg">{WORKSPACE_NAME}</p>
            <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
              Development · centralus · 30d retention
              {lastRefresh ? ` · updated ${format(lastRefresh, "HH:mm:ss")}` : ""}
            </p>
          </div>
        </div>

        <SegmentControl
          value={timeRange}
          onValueChange={onTimeRangeChange}
          mono
          options={TIME_RANGES.map((r, i) => ({
            value: r,
            label: TIME_RANGE_LABEL[r],
            disabled: i > maxIdx,
            title: i > maxIdx ? `Max range for your role: ${maxRange}` : undefined,
          }))}
        />
      </div>
    </div>
  );
}

function AppVolumeCard({
  snapshot,
  loading,
}: {
  snapshot: AppMetricsSnapshot;
  loading: boolean;
}) {
  const errors = snapshot.summary?.errorsCount;
  const total = snapshot.summary?.totalLogs;
  const logsPerMin = snapshot.summary?.logsPerMinute;

  return (
    <div className="metric-card shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="metric-label">{shortAppName(snapshot.app)}</p>
          <p className="mt-1 font-mono text-[10px] text-fg-subtle">{snapshot.app}</p>
        </div>
        {typeof errors === "number" && errors > 0 && (
          <span className="rounded-sm bg-[rgba(242,77,77,0.14)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-level-error">
            {errors} err
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className={cn("metric-value text-fg", loading && "opacity-50")}>
            {typeof total === "number" ? total.toLocaleString() : "—"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
            {typeof logsPerMin === "number" ? `${logsPerMin} logs/min` : "—"}
          </p>
        </div>
        <Sparkline
          values={snapshot.sparkline}
          tone={typeof errors === "number" && errors > 0 ? "error" : "info"}
          loading={loading}
          className="w-[96px]"
        />
      </div>
    </div>
  );
}

function shortAppName(app: ContainerApp): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
