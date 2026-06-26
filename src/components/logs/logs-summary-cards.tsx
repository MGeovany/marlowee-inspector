"use client";

import { cn } from "@/lib/utils";
import type { LogsSummaryResponse } from "@/lib/types";

interface LogsSummaryCardsProps {
  summary: LogsSummaryResponse | null;
  loading: boolean;
  live: boolean;
  sessionActive?: boolean;
}

const CARDS = [
  {
    key: "totalLogs" as const,
    label: "Total logs",
    tone: "info" as const,
  },
  {
    key: "errorsCount" as const,
    label: "Errors",
    tone: "error" as const,
  },
  {
    key: "warningsCount" as const,
    label: "Warnings",
    tone: "warn" as const,
  },
  {
    key: "logsPerMinute" as const,
    label: "Logs / min",
    tone: "success" as const,
  },
];

export function LogsSummaryCards({ summary, loading, live, sessionActive }: LogsSummaryCardsProps) {
  const values: Record<(typeof CARDS)[number]["key"], string> = {
    totalLogs: formatNumber(summary?.totalLogs),
    errorsCount: formatNumber(summary?.errorsCount),
    warningsCount: formatNumber(summary?.warningsCount),
    logsPerMinute: formatNumber(summary?.logsPerMinute),
  };

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-3 py-2.5 xl:grid-cols-4">
      {CARDS.map((card) => (
        <MetricCard
          key={card.key}
          label={card.label}
          value={values[card.key]}
          tone={card.tone}
          loading={loading}
          badge={badgeFor(card.key, summary, live, sessionActive)}
        />
      ))}
    </div>
  );
}

function badgeFor(
  key: (typeof CARDS)[number]["key"],
  summary: LogsSummaryResponse | null,
  live: boolean,
  sessionActive?: boolean,
): { text: string; className: string; live?: boolean } | null {
  if (!summary) return null;
  if (sessionActive && key === "totalLogs") {
    return { text: "session", className: "text-accent-bright" };
  }
  if (key === "totalLogs" && summary.mostNoisyApp) {
    return { text: summary.mostNoisyApp, className: "text-fg-subtle" };
  }
  if (key === "errorsCount" && summary.latestError) {
    return {
      text: formatTime(summary.latestError.timestamp),
      className: "text-level-error",
    };
  }
  if (key === "warningsCount" && summary.latestWarning) {
    return {
      text: formatTime(summary.latestWarning.timestamp),
      className: "text-level-warn",
    };
  }
  if (key === "logsPerMinute" && live) {
    return { text: "live", className: "text-[var(--green)]", live: true };
  }
  return null;
}

function MetricCard({
  label,
  value,
  tone,
  loading,
  badge,
}: {
  label: string;
  value: string;
  tone: "error" | "warn" | "info" | "success";
  loading: boolean;
  badge: { text: string; className: string; live?: boolean } | null;
}) {
  return (
    <div className="metric-card shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="metric-label">{label}</p>
        {badge && (
          <span className={cn("font-mono text-[10px] tabular-nums", badge.className)}>
            {badge.live && <span className="live-dot mr-1" />}
            {badge.text}
          </span>
        )}
      </div>
      <p className={cn("metric-value", toneClass(tone), loading && "opacity-50")}>{value}</p>
    </div>
  );
}

function formatNumber(value: number | undefined): string {
  return typeof value === "number" ? value.toLocaleString() : "--";
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toneClass(tone: "error" | "warn" | "info" | "success"): string {
  if (tone === "error") return "text-level-error";
  if (tone === "warn") return "text-level-warn";
  if (tone === "success") return "text-[var(--green)]";
  return "text-fg";
}
