"use client";

import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import type { HiddenLogSummary, IssueNote, ManagedIssueSummary } from "@/lib/issues";
import type { SidePanelData } from "@/lib/log-stats";
import type { ErrorPatternSummary } from "@/lib/types";
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
        <p className="mt-1 font-mono text-[10px] text-fg-subtle">Azure Log Analytics · selected window</p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5">
        <SectionCard title="Latest errors">
          {data.latestErrors.length === 0 ? (
            <EmptyLine message="No errors in this window" />
          ) : (
            <div className="space-y-1.5">
              {data.latestErrors.map((entry) => (
                <LogSignalCard
                  key={entry.id}
                  entry={entry}
                  active={selectedId === entry.id}
                  onClick={() => onSelectLog(entry)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Error patterns">
          {data.errorPatterns.length === 0 ? (
            <EmptyLine message="No error patterns" />
          ) : (
            <div className="space-y-1.5">
              {data.errorPatterns.map((item) => (
                <ErrorPatternCard
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
                <LogSignalCard
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

function LogSignalCard({
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
          {entry.app} · {entry.level} ·{" "}
          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

function ErrorPatternCard({
  item,
  active,
  onClick,
}: {
  item: ErrorPatternSummary;
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
      <span className="min-w-[20px] shrink-0 pt-0.5 text-right font-mono text-[11px] font-semibold tabular-nums text-level-error">
        {item.count}
      </span>
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

function EmptyLine({ message }: { message: string }) {
  return <p className="py-2 text-center font-mono text-[10px] text-fg-subtle">{message}</p>;
}
