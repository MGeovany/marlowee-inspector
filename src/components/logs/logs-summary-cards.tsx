"use client";

import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/log-stats";

interface LogsSummaryCardsProps {
  summary: DashboardSummary;
  loading: boolean;
}

const CARDS = [
  { key: "openErrors", label: "Open Errors", tone: "error" as const },
  { key: "warnings", label: "Warnings", tone: "warn" as const },
  { key: "logsPerMin", label: "Logs/min", tone: "info" as const },
  { key: "activeApps", label: "Active Apps", tone: "neutral" as const },
  { key: "lastError", label: "Last Error", tone: "error" as const, wide: true },
  { key: "queryLatency", label: "Query Latency", tone: "accent" as const },
] as const;

const TONE: Record<string, string> = {
  error: "text-level-error border-[rgba(239,83,80,0.25)]",
  warn: "text-level-warn border-[rgba(212,168,67,0.25)]",
  info: "text-level-info border-[rgba(83,168,252,0.25)]",
  accent: "text-[#b8b5ff] border-[rgba(106,102,255,0.25)]",
  neutral: "text-fg border-border",
};

export function LogsSummaryCards({ summary, loading }: LogsSummaryCardsProps) {
  const values: Record<string, string> = {
    openErrors: String(summary.openErrors),
    warnings: String(summary.warnings),
    logsPerMin: String(summary.logsPerMin),
    activeApps: String(summary.activeApps),
    lastError: summary.lastError
      ? formatDistanceToNow(new Date(summary.lastError.timeGenerated), { addSuffix: true })
      : "None",
    queryLatency: `${summary.queryLatencyMs}ms`,
  };

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border bg-workspace px-4 py-3 lg:grid-cols-6">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={cn(
            "metric-card",
            TONE[card.tone],
            "wide" in card && card.wide && "lg:col-span-2",
          )}
        >
          <p className="metric-label">{card.label}</p>
          <p className={cn("metric-value", loading && "opacity-50")}>{values[card.key]}</p>
          {card.key === "lastError" && summary.lastError && (
            <p className="mt-1 truncate font-mono text-[10px] text-fg-subtle">
              {summary.lastError.app} · {summary.lastError.message.slice(0, 48)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
