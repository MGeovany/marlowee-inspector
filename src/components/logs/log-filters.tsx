"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type ContainerApp,
  type LogLevel,
  type TimeRange,
  LOG_LEVELS,
  TIME_RANGES,
  TIME_RANGE_LABEL,
} from "@/lib/types";
import type { AppSelection } from "./logs-sidebar";

export type LogStream = "stdout" | "stderr" | "all";

interface LogFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  allowedApps: ContainerApp[];
  selectedApp: AppSelection;
  onAppChange: (app: AppSelection) => void;
  level: LogLevel | "ALL";
  onLevelChange: (v: LogLevel | "ALL") => void;
  stream: LogStream;
  onStreamChange: (v: LogStream) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (v: TimeRange) => void;
  maxRange: TimeRange;
  sessionMode?: boolean;
}

const LEVEL_CHIP: Record<LogLevel, string> = {
  ERROR: "level-chip level-chip-error",
  WARN: "level-chip level-chip-warn",
  INFO: "level-chip level-chip-info",
  LOG: "level-chip level-chip-log",
  DEBUG: "level-chip level-chip-log",
};

export function LogFilters({
  search,
  onSearchChange,
  allowedApps,
  selectedApp,
  onAppChange,
  level,
  onLevelChange,
  stream,
  onStreamChange,
  timeRange,
  onTimeRangeChange,
  maxRange,
  sessionMode = false,
}: LogFiltersProps) {
  const maxIdx = TIME_RANGES.indexOf(maxRange);

  function toggleLevel(l: LogLevel) {
    onLevelChange(level === l ? "ALL" : l);
  }

  const appOptions = [
    { value: "all", label: "All apps" },
    ...allowedApps.map((app) => ({
      value: app,
      label: shortAppName(app),
    })),
  ];

  return (
    <div className="filter-toolbar">
      <div className="query-bar min-w-[320px] flex-[1.8]">
        <Search className="h-4 w-4 shrink-0 text-accent-bright" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs, requestId, endpoint, error message…"
          className="h-8 border-0 bg-transparent px-1 font-mono text-[12px] shadow-none placeholder:text-fg-subtle focus-visible:ring-0"
          aria-label="Search logs"
        />
      </div>

      <Select
        value={selectedApp}
        onValueChange={(v) => onAppChange(v as AppSelection)}
        options={appOptions}
        aria-label="Filter by service"
        className="w-[148px] shrink-0"
      />

      <div className="flex items-center gap-0.5">
        {LOG_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => toggleLevel(l)}
            className={cn(LEVEL_CHIP[l], level === l && "chip-active")}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="filter-segment">
        {sessionMode ? (
          <span className="chip chip-active cursor-default font-mono text-[10px]">
            Session window
          </span>
        ) : (
          TIME_RANGES.map((r, i) => {
            const disabled = i > maxIdx;
            const active = timeRange === r;
            return (
              <button
                key={r}
                type="button"
                disabled={disabled}
                onClick={() => onTimeRangeChange(r)}
                title={disabled ? `Max range for your role: ${maxRange}` : undefined}
                className={cn(
                  "chip rounded-sm px-2.5",
                  active && "chip-active",
                  disabled && "cursor-not-allowed opacity-35",
                )}
              >
                {TIME_RANGE_LABEL[r]}
              </button>
            );
          })
        )}
      </div>

      <div className="hidden h-5 w-px bg-border lg:block" />

      <div className="hidden items-center gap-0.5 lg:flex">
        {(
          [
            { value: "all", label: "all" },
            { value: "stdout", label: "stdout" },
            { value: "stderr", label: "stderr" },
          ] as const
        ).map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onStreamChange(s.value)}
            className={cn("chip font-mono", stream === s.value && "chip-active")}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function shortAppName(app: ContainerApp): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
