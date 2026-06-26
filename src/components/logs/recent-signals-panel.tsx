"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DetectedError, SidePanelData } from "@/lib/log-stats";
import type { LogEntry, LogLevel } from "@/lib/types";

interface RecentSignalsPanelProps {
  data: SidePanelData;
  onSelectLog: (entry: LogEntry) => void;
  selectedId: string | null;
}

type SideTab = "errors" | "activity";

const LEVEL_DOT: Record<LogLevel, string> = {
  ERROR: "bg-level-error shadow-[0_0_6px_rgba(239,83,80,0.45)]",
  WARN: "bg-level-warn shadow-[0_0_6px_rgba(212,168,67,0.35)]",
  INFO: "bg-level-info shadow-[0_0_6px_rgba(83,168,252,0.35)]",
  LOG: "bg-fg-subtle",
  DEBUG: "bg-fg-subtle",
};

export function RecentSignalsPanel({ data, onSelectLog, selectedId }: RecentSignalsPanelProps) {
  const [tab, setTab] = useState<SideTab>("errors");

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="border-b border-border px-3 py-2.5">
        <div className="filter-segment w-full">
          <button
            type="button"
            onClick={() => setTab("errors")}
            className={cn("chip flex-1 justify-center px-2", tab === "errors" && "chip-active")}
          >
            Detected errors
          </button>
          <button
            type="button"
            onClick={() => setTab("activity")}
            className={cn("chip flex-1 justify-center px-2", tab === "activity" && "chip-active")}
          >
            Recent activity
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "errors" ? (
          <DetectedErrorsTab
            items={data.detectedErrors}
            selectedId={selectedId}
            onSelect={onSelectLog}
          />
        ) : (
          <RecentActivityTab
            items={data.recentActivity}
            selectedId={selectedId}
            onSelect={onSelectLog}
          />
        )}
      </div>
    </aside>
  );
}

function DetectedErrorsTab({
  items,
  selectedId,
  onSelect,
}: {
  items: DetectedError[];
  selectedId: string | null;
  onSelect: (entry: LogEntry) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState message="No error patterns in the selected time range." />
    );
  }

  return (
    <section>
      <h3 className="section-label mb-2">Detected errors</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.sample)}
            className={cn(
              "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
              selectedId === item.sample.id
                ? "border-accent bg-accent-soft"
                : "border-border bg-bg hover:border-border-strong hover:bg-panel",
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
        ))}
      </div>
    </section>
  );
}

function RecentActivityTab({
  items,
  selectedId,
  onSelect,
}: {
  items: LogEntry[];
  selectedId: string | null;
  onSelect: (entry: LogEntry) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="No recent log activity." />;
  }

  return (
    <section>
      <h3 className="section-label mb-2">Recent activity</h3>
      <div className="space-y-1">
        {items.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry)}
            className={cn(
              "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
              selectedId === entry.id
                ? "border-accent bg-accent-soft"
                : "border-border bg-bg hover:border-border-strong hover:bg-panel",
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
        ))}
      </div>
    </section>
  );
}

function TrendIcon({ trend }: { trend: DetectedError["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-level-error" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-level-warn" />;
  return <Minus className="h-3 w-3 text-fg-subtle" />;
}

function EmptyState({ message }: { message: string }) {
  return <p className="px-1 py-6 text-center font-mono text-[10px] text-fg-subtle">{message}</p>;
}
