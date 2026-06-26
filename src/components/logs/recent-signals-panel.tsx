"use client";

import { formatDistanceToNow } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HiddenLogSummary, IssueNote, ManagedIssueSummary } from "@/lib/issues";
import type { DetectedError, LatestIncident, SidePanelData } from "@/lib/log-stats";
import type { LogEntry, LogLevel } from "@/lib/types";

interface RecentSignalsPanelProps {
  data: SidePanelData;
  resolvedIssues: ManagedIssueSummary[];
  suppressedIssues: ManagedIssueSummary[];
  hiddenLogs: HiddenLogSummary[];
  notesHistory: IssueNote[];
  onSelectLog: (entry: LogEntry) => void;
  selectedId: string | null;
}

const LEVEL_DOT: Record<LogLevel, string> = {
  ERROR: "bg-level-error shadow-[0_0_6px_rgba(235,54,75,0.45)]",
  WARN: "bg-level-warn shadow-[0_0_6px_rgba(253,126,20,0.35)]",
  INFO: "bg-level-info shadow-[0_0_6px_rgba(13,202,240,0.35)]",
  LOG: "bg-fg-subtle",
  DEBUG: "bg-fg-subtle",
};

export function RecentSignalsPanel({
  data,
  resolvedIssues,
  suppressedIssues,
  hiddenLogs,
  notesHistory,
  onSelectLog,
  selectedId,
}: RecentSignalsPanelProps) {
  return (
    <aside className="glass-sidebar flex w-[272px] shrink-0 flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2.5">
        <p className="section-label">Watchdog</p>
        <p className="mt-0.5 text-[12px] font-medium text-fg">Recent signals</p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
        <SectionCard title="Latest incidents">
          {data.latestIncidents.length === 0 ? (
            <EmptyLine message="No active incidents" />
          ) : (
            <div className="space-y-1.5">
              {data.latestIncidents.map((inc) => (
                <IncidentCard
                  key={inc.id}
                  incident={inc}
                  active={selectedId === inc.sample.id}
                  onClick={() => onSelectLog(inc.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Detected errors">
          {data.detectedErrors.length === 0 ? (
            <EmptyLine message="No error patterns" />
          ) : (
            <div className="space-y-1.5">
              {data.detectedErrors.map((item) => (
                <DetectedErrorCard
                  key={item.key}
                  item={item}
                  active={selectedId === item.sample.id}
                  onClick={() => onSelectLog(item.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent activity">
          {data.recentActivity.length === 0 ? (
            <EmptyLine message="No recent activity" />
          ) : (
            <div className="space-y-1.5">
              {data.recentActivity.map((entry) => (
                <ActivityCard
                  key={entry.id}
                  entry={entry}
                  active={selectedId === entry.id}
                  onClick={() => onSelectLog(entry)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Hidden / suppressed">
          {hiddenLogs.length === 0 && suppressedIssues.length === 0 ? (
            <EmptyLine message="Nothing hidden or suppressed" />
          ) : (
            <div className="space-y-1.5">
              {hiddenLogs.slice(0, 4).map((item) => (
                <ManagedLogCard
                  key={item.record.logId}
                  label={item.record.label}
                  meta={`hidden log · ${item.record.app}`}
                  count={item.notesCount}
                  active={selectedId === item.entry.id}
                  onClick={() => onSelectLog(item.entry)}
                />
              ))}
              {suppressedIssues.slice(0, 4).map((item) => (
                <ManagedLogCard
                  key={item.fingerprint}
                  label={item.label}
                  meta={`${item.status} · ${item.app}`}
                  count={item.count}
                  active={selectedId === item.sample.id}
                  onClick={() => onSelectLog(item.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Resolved issues">
          {resolvedIssues.length === 0 ? (
            <EmptyLine message="No resolved issues" />
          ) : (
            <div className="space-y-1.5">
              {resolvedIssues.slice(0, 6).map((item) => (
                <ManagedLogCard
                  key={item.fingerprint}
                  label={item.label}
                  meta={`${item.app} · ${item.count} logs`}
                  count={item.notesCount}
                  active={selectedId === item.sample.id}
                  onClick={() => onSelectLog(item.sample)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Notes history">
          {notesHistory.length === 0 ? (
            <EmptyLine message="No notes yet" />
          ) : (
            <div className="space-y-1.5">
              {notesHistory.map((note) => (
                <NoteHistoryCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </aside>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-md p-2.5">
      <h3 className="section-label mb-2">{title}</h3>
      {children}
    </section>
  );
}

function IncidentCard({
  incident,
  active,
  onClick,
}: {
  incident: LatestIncident;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-glass backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-sm px-1 py-0.5 font-mono text-[9px] font-bold",
            incident.severity === "SEV-2"
              ? "bg-[rgba(253,126,20,0.15)] text-level-warn"
              : "bg-[rgba(250,178,7,0.12)] text-[var(--yellow)]",
          )}
        >
          {incident.severity}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-fg-subtle">
          {incident.status}
        </span>
      </div>
      <p className="truncate font-mono text-[11px] font-medium text-fg">{incident.title}</p>
      <p className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-fg-subtle">
        <span className="truncate">{incident.app}</span>
        <span className="shrink-0 tabular-nums">
          {formatDistanceToNow(new Date(incident.sample.timestamp), { addSuffix: true })}
        </span>
      </p>
    </button>
  );
}

function DetectedErrorCard({
  item,
  active,
  onClick,
}: {
  item: DetectedError;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-glass backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised",
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
  );
}

function ActivityCard({
  entry,
  active,
  onClick,
}: {
  entry: LogEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-glass backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised",
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
  );
}

function ManagedLogCard({
  label,
  meta,
  count,
  active,
  onClick,
}: {
  label: string;
  meta: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-accent bg-accent-soft"
          : "border-border bg-panel hover:border-border-strong hover:bg-panel-raised",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11px] font-medium text-fg">{label}</p>
        <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">{meta}</p>
      </div>
      {count > 0 && (
        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] text-fg-subtle">
          {count} notes
        </span>
      )}
    </button>
  );
}

function NoteHistoryCard({ note }: { note: IssueNote }) {
  return (
    <div className="rounded-sm border border-border bg-panel px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-accent-bright">
          {note.target}
        </span>
        <span className="font-mono text-[9px] text-fg-subtle">
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className="line-clamp-3 font-mono text-[10px] leading-relaxed text-fg-muted">{note.text}</p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: DetectedError["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-level-error" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-level-warn" />;
  return <Minus className="h-3 w-3 text-fg-subtle" />;
}

function EmptyLine({ message }: { message: string }) {
  return <p className="py-2 text-center font-mono text-[10px] text-fg-subtle">{message}</p>;
}
