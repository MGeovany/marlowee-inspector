"use client";

import { format } from "date-fns";
import { Pause, Play, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TestSession } from "@/lib/test-session";

interface LogsHeaderProps {
  lastRefresh: Date | null;
  live: boolean;
  onLiveToggle: () => void;
  onRefresh: () => void;
  loading: boolean;
  source: "mock" | "azure";
  masked: boolean;
  testSession?: TestSession | null;
}

export function LogsHeader({
  lastRefresh,
  live,
  onLiveToggle,
  onRefresh,
  loading,
  source,
  masked,
  testSession,
}: LogsHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-sidebar px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <MetaPill label="Environment" value="Development" accent />
          <MetaPill label="Workspace" value="law-savvly-dev-main" mono />
          <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
            Last refresh{" "}
            {lastRefresh ? format(lastRefresh, "HH:mm:ss") : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {testSession && (
            <Badge variant={testSession.status === "active" ? "default" : "neutral"}>
              Session · {testSession.status === "active" ? "live" : "stopped"}
            </Badge>
          )}
          {source === "mock" && <Badge variant="warn">mock</Badge>}
          {masked && <Badge variant="neutral">masked</Badge>}
          <Button
            variant={live ? "default" : "outline"}
            size="sm"
            onClick={onLiveToggle}
            title={live ? "Pause auto-refresh" : "Enable live tail"}
          >
            {live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {live ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}

function MetaPill({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      <span
        className={cn(
          "rounded-sm border border-border bg-bg px-2 py-0.5 text-[11px]",
          mono && "font-mono",
          accent ? "text-[#b8b5ff]" : "text-fg",
        )}
      >
        {value}
      </span>
    </div>
  );
}
