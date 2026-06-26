"use client";

import { format } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LogEntry, LogLevel } from "@/lib/types";

export type LogsStatus = "idle" | "loading" | "success" | "error";

interface LogsTableProps {
  status: LogsStatus;
  rows: LogEntry[];
  error?: string | null;
  timeRange: string;
  selectedId: string | null;
  onRowClick: (entry: LogEntry) => void;
  onRetry: () => void;
  emptyHint?: string;
}

const STATUS_PILL: Record<LogLevel, string> = {
  ERROR: "status-pill status-pill-error",
  WARN: "status-pill status-pill-warn",
  INFO: "status-pill status-pill-info",
  LOG: "status-pill status-pill-log",
  DEBUG: "status-pill status-pill-debug",
};

export function LogsTable({
  status,
  rows,
  error,
  timeRange,
  selectedId,
  onRowClick,
  onRetry,
  emptyHint,
}: LogsTableProps) {
  if (status === "loading") return <LoadingState />;
  if (status === "error") return <ErrorState message={error} onRetry={onRetry} />;
  if (status === "success" && rows.length === 0) {
    return <EmptyState timeRange={timeRange} hint={emptyHint} />;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="obs-table w-full border-collapse">
        <thead className="obs-table-head sticky top-0 z-10">
          <tr>
            <Th className="w-[148px]">Date</Th>
            <Th className="w-[72px]">Status</Th>
            <Th className="w-[120px]">Service</Th>
            <Th className="w-[64px]">Stream</Th>
            <Th className="min-w-[280px]">Content</Th>
            <Th className="w-[100px]">Revision</Th>
            <Th className="w-[88px]">Replica</Th>
            <Th className="w-[96px]">Request ID</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row)}
              className={cn(
                "obs-row cursor-pointer",
                selectedId === row.id && "obs-row-selected",
                row.level === "ERROR" && "obs-row-error",
              )}
            >
              <Td mono muted>
                {format(new Date(row.timestamp), "MM/dd HH:mm:ss.SSS")}
              </Td>
              <Td>
                <span className={STATUS_PILL[row.level]}>{row.level}</span>
              </Td>
              <Td mono muted>
                {row.app}
              </Td>
              <Td mono muted>
                {row.stream}
              </Td>
              <Td>
                <span className="block max-w-[480px] truncate font-mono text-[12px] text-fg">
                  {row.message}
                </span>
              </Td>
              <Td mono muted>
                <span className="block max-w-[100px] truncate">{row.revision}</span>
              </Td>
              <Td mono muted>
                <span className="block max-w-[80px] truncate">{row.replica}</span>
              </Td>
              <Td mono muted>
                {row.requestId ? (
                  <span className="block max-w-[88px] truncate text-link">{row.requestId}</span>
                ) : (
                  "—"
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-border px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
  muted,
}: {
  children: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-2 align-top text-[12px]",
        mono && "font-mono",
        muted ? "text-fg-muted" : "text-fg",
      )}
    >
      {children}
    </td>
  );
}

function LoadingState() {
  return (
    <div className="space-y-0 p-3">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border py-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-12 rounded-sm" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ timeRange, hint }: { timeRange: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-panel text-accent">
        <span className="font-mono text-xs">∅</span>
      </div>
      <p className="text-[13px] font-medium text-fg">No logs found</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-fg-subtle">
        {hint ??
          `Nothing in the last ${timeRange}. Widen the range, clear filters, or disable Errors only.`}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <AlertCircle className="h-7 w-7 text-level-error" />
      <p className="text-[13px] font-medium text-fg">Couldn&rsquo;t load logs</p>
      <p className="max-w-sm font-mono text-[11px] text-fg-subtle">
        {message ?? "Something went wrong."}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}
