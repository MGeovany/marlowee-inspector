"use client";

import { format } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/lib/types";
import { LevelBadge } from "./level-badge";

export type LogsStatus = "idle" | "loading" | "success" | "error";

interface LogsTableProps {
  status: LogsStatus;
  rows: LogEntry[];
  error?: string | null;
  timeRange: string;
  onRowClick: (entry: LogEntry) => void;
  onRetry: () => void;
}

const LEVEL_COLOR: Record<string, string> = {
  ERROR: "text-level-error",
  WARN: "text-level-warn",
  INFO: "text-level-info",
  LOG: "text-level-debug",
  DEBUG: "text-level-debug",
};

export function LogsTable({ status, rows, error, timeRange, onRowClick, onRetry }: LogsTableProps) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error} onRetry={onRetry} />;
  if (status === "success" && rows.length === 0) return <EmptyState timeRange={timeRange} />;

  return (
    <div className="h-full overflow-auto px-2 py-3 font-mono">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onRowClick(row)}
          className={cn(
            "log-row w-full text-left leading-relaxed",
            row.level === "ERROR" && "log-row-error",
          )}
        >
          <span className="w-[120px] shrink-0 tabular-nums text-[11px] text-fg-subtle">
            {format(new Date(row.timeGenerated), "MMM d HH:mm:ss")}
          </span>
          <span
            className={cn(
              "w-[48px] shrink-0 pt-px text-[10px] font-bold uppercase",
              LEVEL_COLOR[row.level] ?? "text-fg-muted",
            )}
          >
            {row.level}
          </span>
          <span className="hidden w-[128px] shrink-0 truncate text-[11px] text-fg-subtle sm:inline">
            {row.app}
          </span>
          <span className="min-w-0 flex-1 truncate text-micro leading-[1.6] text-fg">{row.message}</span>
          <LevelBadge level={row.level} className="hidden shrink-0 sm:inline-flex" />
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-0 p-0">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ timeRange }: { timeRange: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-panel text-accent">
        <span className="font-mono text-xs">∅</span>
      </div>
      <p className="text-micro font-medium text-fg">No logs match</p>
      <p className="max-w-xs text-[11px] leading-relaxed text-fg-subtle">
        Nothing in the last {timeRange}. Widen the range, clear the filter, or disable Errors only.
        Workspace retention is 30 days.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <AlertCircle className="h-7 w-7 text-level-error" />
      <p className="text-micro font-medium text-fg">Couldn&rsquo;t load logs</p>
      <p className="max-w-sm font-mono text-[11px] text-fg-subtle">{message ?? "Something went wrong."}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}
