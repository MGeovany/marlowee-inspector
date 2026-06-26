"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type LogLevel,
  type TimeRange,
  LOG_LEVELS,
  TIME_RANGES,
  TIME_RANGE_LABEL,
} from "@/lib/types";

export type LogStream = "stdout" | "stderr" | "all";

interface LogFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  level: LogLevel | "ALL";
  onLevelChange: (v: LogLevel | "ALL") => void;
  stream: LogStream;
  onStreamChange: (v: LogStream) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (v: TimeRange) => void;
  maxRange: TimeRange;
  errorsOnly: boolean;
  onErrorsOnlyChange: (v: boolean) => void;
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
  level,
  onLevelChange,
  stream,
  onStreamChange,
  timeRange,
  onTimeRangeChange,
  maxRange,
  errorsOnly,
  onErrorsOnlyChange,
  sessionMode = false,
}: LogFiltersProps) {
  const maxIdx = TIME_RANGES.indexOf(maxRange);

  function toggleLevel(l: LogLevel) {
    if (errorsOnly) return;
    onLevelChange(level === l ? "ALL" : l);
  }

  return (
    <div className="filter-toolbar">
      <div className="query-bar min-w-[240px] flex-1">
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search message, request id, revision…"
          className="h-7 border-0 bg-transparent px-1 font-mono shadow-none focus-visible:ring-0"
          aria-label="Search logs"
        />
      </div>

      <div className="flex items-center gap-0.5">
        {LOG_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            disabled={errorsOnly}
            onClick={() => toggleLevel(l)}
            className={cn(
              LEVEL_CHIP[l],
              level === l && !errorsOnly && "chip-active",
              errorsOnly && "cursor-not-allowed opacity-35",
            )}
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

      <div className="ml-auto flex items-center gap-3">
        <label className="flex select-none items-center gap-2">
          <Switch
            checked={errorsOnly}
            onCheckedChange={onErrorsOnlyChange}
            aria-label="Errors only"
          />
          <span className="text-[11px] text-fg-muted">Errors only</span>
        </label>
      </div>
    </div>
  );
}
