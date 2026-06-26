"use client";

import { formatDistanceToNow } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DetectedError, LatestIncident, SidePanelData } from "@/lib/log-stats";
import type { LogEntry, LogLevel } from "@/lib/types";

interface RecentSignalsPanelProps {
  data: SidePanelData;
  onSelectLog: (entry: LogEntry) => void;
  selectedId: string | null;
}

const LEVEL_DOT: Record<LogLevel, string> = {
  ERROR: "bg-level-error shadow-[0_0_6px_rgba(239,83,80,0.45)]",
  WARN: "bg-level-warn shadow-[0_0_6px_rgba(212,168,67,0.35)]",
  INFO: "bg-level-info shadow-[0_0_6px_rgba(83,168,252,0.35)]",
  LOG: "bg-fg-subtle",
  DEBUG: "bg-fg-subtle",
};

export function RecentSignalsPanel({ data, onSelectLog, selectedId }: RecentSignalsPanelProps) {
  return (
    <aside className="flex w-[288px] shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <SectionCard title="Latest incidents">
          {data.latestIncidents.length === 0 ? (
            <EmptyLine message="No active incidents" />
          ) : (
            <div className="space-y-2">
              {data.latestIncidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  active={selectedId === inc.sample.id}
                  onClick={() => onSelectLog(inc.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Detected errors">
          {data.detectedErrors.length === 0 ? (
            <EmptyLine message="No error patterns" />
          ) : (
            <div className="space-y-2">
              {data.detectedErrors.map((item) => (
                <DetectedErrorCard
                  key={item.key}
                  item={item}
                  active={selectedId === item.sample.id}
                  onClick={() => onSelectLog(item.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent activity">
          {data.recentActivity.length === 0 ? (
            <EmptyLine message="No recent activity" />
          ) : (
            <div className="space-y-2">
              {data.recentActivity.map((entry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  active={selectedId === entry.id}
                  onClick={() => onSelectLog(entry)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </aside>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-bg p-2.5">
      <h3 className="section-label mb-2.5">{title}</h3>
      {children}
    </section>
  );
}

function IncidentCard({
  incident,
  active,
  onClick,
}: {
  incident: LatestIncident;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-raised",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-sm px-1 py-0.5 font-mono text-[9px] font-bold",
            incident.severity === "SEV-2"
              ? "bg-[rgba(252,129,74,0.15)] text-level-warn"
              : "bg-[rgba(212,168,67,0.12)] text-[var(--yellow)]",
          )}
        >
          {incident.severity}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-fg-subtle">
          {incident.status}
        </span>
      </div>
      <p className="truncate font-mono text-[11px] font-medium text-fg">{incident.title}</p>
      <p className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-fg-subtle">
        <span className="truncate">{incident.app}</span>
        <span className="shrink-0 tabular-nums">
          {incident.id} · {formatDistanceToNow(new Date(incident.sample.timestamp), { addSuffix: true })}
        </span>
      </p>
    </button>
  );
}

function DetectedErrorCard({
  item,
  active,
  onClick,
}: {
  item: DetectedError;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-raised",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11px] font-medium text-fg">{item.label}</p>
        <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">{item.app}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
        <TrendIcon trend={item.trend} />
        <span className="min-w-[20px] text-right font-mono text-[11px] font-semibold tabular-nums text-level-error">
          {item.count}
        </span>
      </div>
    </button>
  );
}

function ActivityCard({
  entry,
  active,
  onClick,
}: {
  entry: LogEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-raised",
      )}
    >
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", LEVEL_DOT[entry.level])} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11px] text-fg">{entry.message}</p>
        <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
          {entry.app} · {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

function TrendIcon({ trend }: { trend: DetectedError["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-level-error" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-level-warn" />;
  return <Minus className="h-3 w-3 text-fg-subtle" />;
}

function EmptyLine({ message }: { message: string }) {
  return <p className="py-2 text-center font-mono text-[10px] text-fg-subtle">{message}</p>;
}
