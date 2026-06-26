"use client";

import { cn } from "@/lib/utils";
import type { LogsSummaryResponse } from "@/lib/types";

interface LogsSummaryCardsProps {
  summary: LogsSummaryResponse | null;
  loading: boolean;
  live: boolean;
}

const CARDS = [
  {
    key: "totalLogs" as const,
    label: "Total logs",
    tone: "info" as const,
    accent: "border-l-accent",
  },
  {
    key: "errorsCount" as const,
    label: "Errors",
    tone: "error" as const,
    accent: "border-l-level-error",
  },
  {
    key: "warningsCount" as const,
    label: "Warnings",
    tone: "warn" as const,
    accent: "border-l-level-warn",
  },
  {
    key: "logsPerMinute" as const,
    label: "Logs / min",
    tone: "success" as const,
    accent: "border-l-[var(--green)]",
  },
];

export function LogsSummaryCards({ summary, loading, live }: LogsSummaryCardsProps) {
  const values: Record<(typeof CARDS)[number]["key"], string> = {
    totalLogs: formatNumber(summary?.totalLogs),
    errorsCount: formatNumber(summary?.errorsCount),
    warningsCount: formatNumber(summary?.warningsCount),
    logsPerMinute: formatNumber(summary?.logsPerMinute),
  };

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-border bg-workspace px-4 py-3 xl:grid-cols-4">
      {CARDS.map((card) => (
        <MetricCard
          key={card.key}
          label={card.label}
          value={values[card.key]}
          accent={card.accent}
          tone={card.tone}
          loading={loading}
          badge={badgeFor(card.key, summary, live)}
        />
      ))}
    </div>
  );
}

function badgeFor(
  key: (typeof CARDS)[number]["key"],
  summary: LogsSummaryResponse | null,
  live: boolean,
): { text: string; className: string } | null {
  if (!summary) return null;
  if (key === "totalLogs" && summary.mostNoisyApp) {
    return { text: `noisy: ${summary.mostNoisyApp}`, className: "text-fg-subtle" };
  }
  if (key === "errorsCount" && summary.latestError) {
    return { text: `latest ${formatTime(summary.latestError.timestamp)}`, className: "text-level-error" };
  }
  if (key === "warningsCount" && summary.latestWarning) {
    return { text: `latest ${formatTime(summary.latestWarning.timestamp)}`, className: "text-level-warn" };
  }
  if (key === "logsPerMinute" && live) {
    return { text: "live", className: "text-[var(--green)]" };
  }
  return null;
}

function MetricCard({
  label,
  value,
  accent,
  tone,
  loading,
  badge,
}: {
  label: string;
  value: string;
  accent: string;
  tone: "error" | "warn" | "info" | "success";
  loading: boolean;
  badge: { text: string; className: string } | null;
}) {
  return (
    <div className={cn("metric-card-spark border-l-[3px] pl-3", accent)}>
      <div className="flex items-start justify-between gap-2">
        <p className="metric-label">{label}</p>
        {badge && (
          <span className={cn("font-mono text-[10px] font-medium tabular-nums", badge.className)}>
            {badge.text === "live" && (
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--green)] shadow-[0_0_6px_rgba(83,192,135,0.5)]" />
            )}
            {badge.text}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={cn("metric-value", toneClass(tone), loading && "opacity-50")}>{value}</p>
      </div>
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
