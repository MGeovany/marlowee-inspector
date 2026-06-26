"use client";

import { useEffect, useState } from "react";
import { Copy, Play, Square, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createTestSession,
  formatSessionDuration,
  saveTestSession,
  sessionTimeWindow,
  stopTestSession,
  type TestSession,
} from "@/lib/test-session";

interface TestSessionBarProps {
  session: TestSession | null;
  onSessionChange: (session: TestSession | null) => void;
  onClearView: () => void;
  logCount: number;
  requestIdFilter: string;
  onRequestIdFilterChange: (value: string) => void;
  testSessionIdFilter: string;
  onTestSessionIdFilterChange: (value: string) => void;
}

export function TestSessionBar({
  session,
  onSessionChange,
  onClearView,
  logCount,
  requestIdFilter,
  onRequestIdFilterChange,
  testSessionIdFilter,
  onTestSessionIdFilterChange,
}: TestSessionBarProps) {
  const [name, setName] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  const durationMs = session
    ? new Date(session.stoppedAt ?? now).getTime() - new Date(session.startedAt).getTime()
    : 0;

  function handleStart() {
    const next = createTestSession(name);
    saveTestSession(next);
    onSessionChange(next);
    onTestSessionIdFilterChange("");
    setName("");
  }

  function handleStop() {
    if (!session) return;
    const stopped = stopTestSession(session);
    saveTestSession(stopped);
    onSessionChange(stopped);
  }

  function handleEndSession() {
    saveTestSession(null);
    onSessionChange(null);
    onTestSessionIdFilterChange("");
  }

  async function copySessionId() {
    if (!session) return;
    await navigator.clipboard.writeText(session.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (!session) {
    return (
      <div className="shrink-0 border-b border-border bg-panel px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
            Test session
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Session name, e.g. "Testing contribution update"'
            className="h-8 max-w-md flex-1 font-sans text-[12px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleStart();
            }}
          />
          <Button size="sm" onClick={handleStart}>
            <Play className="h-3 w-3" />
            Start test session
          </Button>
          <p className="w-full text-[11px] text-fg-subtle">
            Starts capturing from now. Azure logs are never deleted — Marlowee only filters by{" "}
            <code className="font-mono text-fg-muted">TimeGenerated &gt;= startedAt</code>.
          </p>
        </div>
      </div>
    );
  }

  const timeWindow = sessionTimeWindow(session);

  return (
    <div
      className={cn(
        "shrink-0 border-b px-4 py-2.5",
        session.status === "active"
          ? "border-accent/30 bg-accent-soft"
          : "border-border bg-panel",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={session.status === "active" ? "accent" : "neutral"}>
              {session.status === "active" ? "Recording" : "Stopped"}
            </Badge>
            <span className="truncate font-medium text-fg">{session.name}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-fg-muted">
            <span>Duration {formatSessionDuration(durationMs)}</span>
            <span>{logCount.toLocaleString()} logs captured</span>
            <span>Since {new Date(timeWindow.since!).toLocaleTimeString()}</span>
            {timeWindow.until && <span>Until {new Date(timeWindow.until).toLocaleTimeString()}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] uppercase tracking-[0.05em] text-fg-subtle">Session ID</span>
            <code className="rounded-sm border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
              {session.id}
            </code>
            <button
              type="button"
              onClick={() => void copySessionId()}
              className="inline-flex items-center gap-1 text-[10px] text-fg-subtle hover:text-fg"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.status === "active" && (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Square className="h-3 w-3" />
              Stop session
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClearView}>
            <Trash2 className="h-3 w-3" />
            Clear view
          </Button>
          {session.status === "stopped" && (
            <Button variant="ghost" size="sm" onClick={handleEndSession}>
              <X className="h-3 w-3" />
              End session
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          Session filters
        </span>
        <Input
          value={requestIdFilter}
          onChange={(e) => onRequestIdFilterChange(e.target.value)}
          placeholder="Filter by request ID"
          className="h-8 w-[180px] font-mono text-[11px]"
        />
        <Input
          value={testSessionIdFilter}
          onChange={(e) => onTestSessionIdFilterChange(e.target.value)}
          placeholder="Filter by testSessionId in logs"
          className="h-8 w-[220px] font-mono text-[11px]"
        />
        <button
          type="button"
          onClick={() => onTestSessionIdFilterChange(session.id)}
          className="chip font-mono text-[10px]"
        >
          Use session ID
        </button>
      </div>
    </div>
  );
}
