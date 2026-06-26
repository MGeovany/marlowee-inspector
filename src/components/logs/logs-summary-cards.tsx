"use client";

import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/log-stats";
import { Sparkline } from "./sparkline";

interface LogsSummaryCardsProps {
  summary: DashboardSummary;
  loading: boolean;
  live: boolean;
}

const CARDS = [
  {
    key: "openErrors" as const,
    label: "Open errors",
    tone: "error" as const,
    accent: "border-l-level-error",
    sparkKey: "openErrors" as const,
  },
  {
    key: "activeIncidents" as const,
    label: "Active incidents",
    tone: "warn" as const,
    accent: "border-l-level-warn",
    sparkKey: "activeIncidents" as const,
  },
  {
    key: "logsPerMin" as const,
    label: "Logs / min",
    tone: "warn" as const,
    accent: "border-l-[var(--orange)]",
    sparkKey: "logsPerMin" as const,
  },
  {
    key: "avgResponse" as const,
    label: "Avg response",
    tone: "success" as const,
    accent: "border-l-[var(--green)]",
    sparkKey: "avgResponse" as const,
  },
];

export function LogsSummaryCards({ summary, loading, live }: LogsSummaryCardsProps) {
  const values: Record<(typeof CARDS)[number]["key"], string> = {
    openErrors: String(summary.openErrors),
    activeIncidents: String(summary.activeIncidents),
    logsPerMin: summary.logsPerMin.toLocaleString(),
    avgResponse: `${summary.avgResponseMs} ms`,
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
          sparkline={summary.sparklines[card.sparkKey]}
          badge={badgeFor(card.key, summary, live)}
        />
      ))}
    </div>
  );
}

function badgeFor(
  key: (typeof CARDS)[number]["key"],
  summary: DashboardSummary,
  live: boolean,
): { text: string; className: string } | null {
  if (key === "openErrors" && summary.openErrorsDeltaPct !== null) {
    const up = summary.openErrorsDeltaPct >= 0;
    return {
      text: `${up ? "+" : ""}${summary.openErrorsDeltaPct}%`,
      className: up ? "text-level-error" : "text-[var(--green)]",
    };
  }
  if (key === "activeIncidents" && summary.activeIncidents > 0) {
    return { text: "active", className: "text-level-warn" };
  }
  if (key === "logsPerMin" && live) {
    return { text: "live", className: "text-[var(--green)]" };
  }
  if (key === "avgResponse" && summary.avgResponseDeltaPct !== null) {
    const down = summary.avgResponseDeltaPct <= 0;
    return {
      text: `${summary.avgResponseDeltaPct > 0 ? "+" : ""}${summary.avgResponseDeltaPct}%`,
      className: down ? "text-[var(--green)]" : "text-level-warn",
    };
  }
  return null;
}

function MetricCard({
  label,
  value,
  accent,
  tone,
  loading,
  sparkline,
  badge,
}: {
  label: string;
  value: string;
  accent: string;
  tone: "error" | "warn" | "info" | "success";
  loading: boolean;
  sparkline: number[];
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
        <p className={cn("metric-value", loading && "opacity-50")}>{value}</p>
        <Sparkline values={sparkline} tone={tone} className="shrink-0" />
      </div>
    </div>
  );
}
