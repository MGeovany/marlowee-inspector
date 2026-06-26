"use client";

import { Select } from "@/components/ui/select";
import { SegmentControl } from "@/components/ui/segment-control";
import { cn } from "@/lib/utils";
import { LogSearchBar } from "./log-search-bar";
import {
  type ContainerApp,
  type LogLevel,
  type TimeRange,
  LOG_LEVELS,
  TIME_RANGES,
  TIME_RANGE_LABEL,
} from "@/lib/types";
import type { AppSelection } from "./logs-sidebar";

export type LogStream = "stdout" | "stderr" | "all" | "system";

interface LogFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  allowedApps: ContainerApp[];
  selectedApp: AppSelection;
  onAppChange: (app: AppSelection) => void;
  level: LogLevel | "ALL";
  onLevelChange: (v: LogLevel | "ALL") => void;
  stream: "stdout" | "stderr" | "all" | "system";
  onStreamChange: (v: LogStream) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (v: TimeRange) => void;
  maxRange: TimeRange;
  sessionMode?: boolean;
  hideStream?: boolean;
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
  hideStream = false,
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
      <LogSearchBar
        value={search}
        onChange={onSearchChange}
        className="min-w-[320px] flex-[1.8]"
      />

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

      {sessionMode ? (
        <div className="filter-segment filter-segment-filled">
          <span className="segment-option-static segment-option-mono">Session window</span>
        </div>
      ) : (
        <SegmentControl
          value={timeRange}
          onValueChange={onTimeRangeChange}
          mono
          options={TIME_RANGES.map((r, i) => ({
            value: r,
            label: TIME_RANGE_LABEL[r],
            disabled: i > maxIdx,
            title: i > maxIdx ? `Max range for your role: ${maxRange}` : undefined,
          }))}
        />
      )}

      <div className="hidden h-5 w-px bg-border lg:block" />

      {hideStream ? (
        <div className="filter-segment filter-segment-filled hidden lg:block">
          <span className="segment-option-static segment-option-mono">system</span>
        </div>
      ) : (
        <div className="hidden lg:block">
          <SegmentControl
            value={stream === "system" ? "all" : stream}
            onValueChange={onStreamChange}
            mono
            options={[
              { value: "all", label: "all" },
              { value: "stdout", label: "stdout" },
              { value: "stderr", label: "stderr" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function shortAppName(app: ContainerApp): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
