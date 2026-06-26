"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type LogLevel,
  type TimeRange,
  LOG_LEVELS,
  TIME_RANGES,
  TIME_RANGE_LABEL,
} from "@/lib/types";

interface LogFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  level: LogLevel | "ALL";
  onLevelChange: (v: LogLevel | "ALL") => void;
  timeRange: TimeRange;
  onTimeRangeChange: (v: TimeRange) => void;
  maxRange: TimeRange;
  errorsOnly: boolean;
  onErrorsOnlyChange: (v: boolean) => void;
  raw: boolean;
  onRawChange: (v: boolean) => void;
  canSeeRaw: boolean;
}

export function LogFilters({
  search,
  onSearchChange,
  level,
  onLevelChange,
  timeRange,
  onTimeRangeChange,
  maxRange,
  errorsOnly,
  onErrorsOnlyChange,
  raw,
  onRawChange,
  canSeeRaw,
}: LogFiltersProps) {
  const maxIdx = TIME_RANGES.indexOf(maxRange);

  return (
    <div className="panel-head space-y-2 bg-workspace">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter logs"
          className="pl-8"
          aria-label="Search logs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <label className={cn("chip", errorsOnly && "chip-active")}>
          <input
            type="checkbox"
            className="sr-only"
            checked={errorsOnly}
            onChange={() => onErrorsOnlyChange(!errorsOnly)}
          />
          Errors
        </label>

        {canSeeRaw && (
          <label className={cn("chip", raw && "chip-active")}>
            <input
              type="checkbox"
              className="sr-only"
              checked={raw}
              onChange={() => onRawChange(!raw)}
            />
            Raw
          </label>
        )}

        {TIME_RANGES.map((r, i) => {
          const disabled = i > maxIdx;
          const active = timeRange === r;
          return (
            <button
              key={r}
              type="button"
              disabled={disabled}
              onClick={() => onTimeRangeChange(r)}
              title={disabled ? `Max range for your role: ${maxRange}` : undefined}
              className={cn("chip", active && "chip-active", disabled && "cursor-not-allowed opacity-35")}
            >
              {TIME_RANGE_LABEL[r]}
            </button>
          );
        })}

        <Select
          aria-label="Log level"
          value={level}
          onValueChange={(v) => onLevelChange(v as LogLevel | "ALL")}
          options={[
            { value: "ALL", label: "Any level" },
            ...LOG_LEVELS.map((l) => ({ value: l, label: l })),
          ]}
          className="w-[108px]"
          disabled={errorsOnly}
        />
      </div>
    </div>
  );
}
