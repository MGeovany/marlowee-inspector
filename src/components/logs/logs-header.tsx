"use client";

import { format } from "date-fns";
import { Bell, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";

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
  masked: boolean;
  testSession?: TestSession | null;
  notificationCount?: number;
  onClearNotifications?: () => void;
}

export function LogsHeader({
  lastRefresh,
  live,
  onLiveToggle,
  onRefresh,
  loading,
  masked,
  testSession,
  notificationCount = 0,
  onClearNotifications,
}: LogsHeaderProps) {
  return (
    <header className="glass-header shrink-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="min-w-0">
          <div className="dd-breadcrumb flex items-center">
            <span>Logs</span>
            <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
            <span className="text-fg-muted">Explorer</span>
          </div>
          <h1 className="dd-page-title mt-0.5">Log Explorer</h1>
        </div>

        <div className="flex items-center gap-2">
          {notificationCount > 0 && (
            <button
              type="button"
              onClick={onClearNotifications}
              title="Clear all notifications"
              className="relative flex h-8 items-center gap-1.5 rounded-md border border-[rgba(242,77,77,0.3)] bg-[rgba(242,77,77,0.1)] px-2 text-[11px] font-semibold text-[#ff8a8a] transition-colors hover:bg-[rgba(242,77,77,0.18)]"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="tabular-nums">{notificationCount > 99 ? "99+" : notificationCount}</span>
            </button>
          )}
          {testSession && (
            <Badge variant={testSession.status === "active" ? "success" : "neutral"}>
              {testSession.status === "active" && <span className="live-dot mr-1" />}
              Session · {testSession.status === "active" ? "live" : "stopped"}
            </Badge>
          )}
          {masked && <Badge variant="neutral">MASKED</Badge>}
          <Button
            variant={live ? "live" : "outline"}
            size="sm"
            onClick={onLiveToggle}
            title={live ? "Pause auto-refresh" : "Enable live tail"}
          >
            {live ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {live ? "Live Tail" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-1.5">
        <MetaItem label="Env" value="Development" />
        <MetaItem label="Workspace" value="law-savvly-dev-main" mono />
        <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
          Last refresh {lastRefresh ? format(lastRefresh, "HH:mm:ss") : "—"}
        </span>
      </div>
    </header>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">
        {label}
      </span>
      <span
        className={cn(
          "rounded-md bg-glass px-1.5 py-0.5 text-[11px] text-fg-muted backdrop-blur-sm",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}
