"use client";

import { useEffect, useState } from "react";
import { Copy, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractLogDetails,
  formatTimestamp,
  httpLine,
} from "@/lib/log-details";
import { kqlForLogEntry } from "@/lib/log-kql";
import type { IssueNote, IssueStatus, NoteTarget } from "@/lib/issues";
import type { LogEntry, TimeRange } from "@/lib/types";
import { LevelBadge } from "./level-badge";

interface LogDetailPanelProps {
  entry: LogEntry | null;
  related: LogEntry[];
  timeRange: TimeRange;
  masked: boolean;
  fingerprint: string;
  issueStatus: IssueStatus;
  issueNotes: IssueNote[];
  logNotes: IssueNote[];
  logHidden: boolean;
  onClose: () => void;
  onSelectRelated: (entry: LogEntry) => void;
  onAddNote: (entry: LogEntry, target: NoteTarget, text: string) => void;
  onSetIssueStatus: (entry: LogEntry, status: IssueStatus) => void;
  onHideLog: (entry: LogEntry) => void;
  onReopenLog: (logId: string) => void;
}

type CopyTarget =
  | "ai"
  | "message"
  | "raw"
  | "requestId"
  | "kql";

export function LogDetailPanel({
  entry,
  related,
  timeRange,
  masked,
  fingerprint,
  issueStatus,
  issueNotes,
  logNotes,
  logHidden,
  onClose,
  onSelectRelated,
  onAddNote,
  onSetIssueStatus,
  onHideLog,
  onReopenLog,
}: LogDetailPanelProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    setCopied(null);
    setNoteText("");
  }, [entry?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!entry) return null;

  const details = extractLogDetails(entry, masked);
  const httpText = httpLine(details.http);

  async function copyText(target: CopyTarget, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  async function copyViaApi(variant: "raw" | "ai") {
    try {
      const res = await fetch("/api/logs/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: entry.id,
          variant,
          app: entry.app,
          timestamp: entry.timestamp,
          message: entry.message,
          rawPayload: entry.rawPayload,
          revision: entry.revision,
          replica: entry.replica,
          level: entry.level,
          stream: entry.stream,
          requestId: entry.requestId,
        }),
      });
      if (!res.ok) return;
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(variant);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback — keep client-side copy working
    }
  }

  function addNote(target: NoteTarget) {
    if (!noteText.trim()) return;
    onAddNote(entry, target, noteText);
    setNoteText("");
  }

  const combinedNotes = [...logNotes, ...issueNotes]
    .filter((note, i, arr) => arr.findIndex((n) => n.id === note.id) === i)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        aria-hidden
        className="detail-drawer-backdrop absolute inset-0 animate-backdrop-in"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="detail-drawer relative ml-auto flex w-full max-w-[480px] animate-drawer-in flex-col"
      >
        <header className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <LevelBadge level={entry.level} />
              <Badge variant={issueStatus === "open" ? "neutral" : issueStatus === "resolved" ? "success" : "warn"}>
                {logHidden ? "hidden log" : issueStatus}
              </Badge>
              <span className="inline-flex items-center gap-1.5 font-mono text-micro text-fg-muted">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    entry.level === "ERROR"
                      ? "bg-level-error shadow-[0_0_6px_rgba(235,54,75,0.45)]"
                      : entry.level === "WARN"
                        ? "bg-level-warn"
                        : "bg-fg-subtle",
                  )}
                />
                {entry.app}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detail panel"
              className="motion-press rounded-sm border border-transparent p-1 text-fg-subtle hover:border-border hover:bg-sidebar-hover hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-3 font-mono text-[12px] leading-relaxed text-fg">{entry.message}</p>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3">
          <InfoTile label="Timestamp" value={formatTimestamp(entry.timestamp)} />
          <InfoTile label="Revision" value={entry.revision} />
          <InfoTile
            label="HTTP"
            value={httpText ?? "—"}
            valueClassName={httpText ? "text-level-warn" : undefined}
          />
          <div className="detail-drawer-inner rounded-md px-2.5 py-2">
            <p className="section-label mb-1">Status · Latency</p>
            {details.http.status != null || details.http.latencyMs != null ? (
              <p className="font-mono text-[11px] tabular-nums">
                <span
                  className={cn(
                    details.http.status != null && details.http.status >= 400
                      ? "text-level-error"
                      : "text-fg",
                  )}
                >
                  {details.http.status ?? "—"}
                </span>
                <span className="text-fg-subtle"> · </span>
                <span className="text-fg">
                  {details.http.latencyMs != null ? `${details.http.latencyMs}ms` : "—"}
                </span>
              </p>
            ) : (
              <p className="font-mono text-[11px] text-fg">—</p>
            )}
          </div>
        </div>

        {entry.requestId && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <div className="min-w-0">
              <p className="section-label mb-0.5">Request ID</p>
              <p className="truncate font-mono text-[11px] text-fg">{entry.requestId}</p>
            </div>
            <CopyBtn
              label={copied === "requestId" ? "Copied" : "Copy request id"}
              onClick={() => void copyText("requestId", entry.requestId!)}
            />
          </div>
        )}

        {(details.trace.traceId || details.trace.spanId) && (
          <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3">
            {details.trace.traceId && (
              <InfoTile label="Trace ID" value={details.trace.traceId} mono />
            )}
            {details.trace.spanId && (
              <InfoTile label="Span ID" value={details.trace.spanId} mono />
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
          <CopyBtn
            label={copied === "message" ? "Copied" : "Copy message"}
            onClick={() => void copyText("message", entry.message)}
          />
          <CopyBtn
            label={copied === "kql" ? "Copied" : "Copy KQL"}
            onClick={() => void copyText("kql", kqlForLogEntry(entry, timeRange))}
          />
          <Button
            variant="default"
            size="sm"
            onClick={() => void copyViaApi("ai")}
          >
            <Copy className="h-3 w-3" />
            {copied === "ai" ? "Copied" : "Copy for AI"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSetIssueStatus(entry, "investigating")}>
            Investigating
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSetIssueStatus(entry, "resolved")}>
            Mark as resolved
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSetIssueStatus(entry, "suppressed")}>
            Suppress similar
          </Button>
          {logHidden ? (
            <Button variant="outline" size="sm" onClick={() => onReopenLog(entry.id)}>
              Reopen log
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onHideLog(entry)}>
              Hide this log
            </Button>
          )}
          {issueStatus !== "open" && (
            <Button variant="ghost" size="sm" onClick={() => onSetIssueStatus(entry, "open")}>
              Reopen
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="section-label">Issue fingerprint</h3>
              <Badge variant="neutral">{issueStatus}</Badge>
            </div>
            <p className="break-all detail-drawer-inner rounded-md px-3 py-2 font-mono text-[10px] leading-relaxed text-fg-subtle">
              {fingerprint}
            </p>
          </section>

          <section>
            <h3 className="section-label mb-2">Notes</h3>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add context, owner, investigation notes, or remediation..."
              className="min-h-[72px] w-full resize-none rounded-md detail-drawer-inner px-3 py-2 font-mono text-[11px] leading-relaxed text-fg outline-none focus:border-[rgba(0,217,115,0.35)]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => addNote("log")} disabled={!noteText.trim()}>
                Add note to log
              </Button>
              <Button variant="outline" size="sm" onClick={() => addNote("issue")} disabled={!noteText.trim()}>
                Add note to error group
              </Button>
            </div>
            <div className="mt-3 space-y-1.5">
              {combinedNotes.length === 0 ? (
                <p className="font-mono text-[10px] text-fg-subtle">No notes yet.</p>
              ) : (
                combinedNotes.map((note) => <NoteCard key={note.id} note={note} />)
              )}
            </div>
          </section>

          {details.maskedFields.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="section-label">Masked fields</h3>
                {masked && <Badge variant="warn">PII redacted</Badge>}
              </div>
              <dl className="detail-drawer-inner overflow-hidden rounded-md">
                {details.maskedFields.map((field, i) => (
                  <div
                    key={field.key}
                    className={cn(
                      "grid grid-cols-[42%_1fr] gap-3 px-3 py-2",
                      i < details.maskedFields.length - 1 && "border-b border-border",
                    )}
                  >
                    <dt className="truncate font-mono text-[10px] text-fg-subtle">{field.key}</dt>
                    <dd className="truncate font-mono text-[11px] text-level-warn">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {Object.keys(details.context).length > 0 && (
            <section>
              <h3 className="section-label mb-2">Context</h3>
              <dl className="detail-drawer-inner overflow-hidden rounded-md">
                {Object.entries(details.context)
                  .filter(([key]) => !details.maskedFields.some((f) => f.key === key))
                  .slice(0, 8)
                  .map(([key, value], i, arr) => (
                    <div
                      key={key}
                      className={cn(
                        "grid grid-cols-[42%_1fr] gap-3 px-3 py-2",
                        i < arr.length - 1 && "border-b border-border",
                      )}
                    >
                      <dt className="truncate font-mono text-[10px] text-fg-subtle">{key}</dt>
                      <dd className="break-all font-mono text-[11px] text-fg">{value}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="section-label">Raw log</h3>
              <button
                type="button"
                onClick={() => void copyViaApi("raw")}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.04em] text-fg-subtle hover:text-fg"
              >
                <Copy className="h-3 w-3" />
                {copied === "raw" ? "Copied" : "Copy raw"}
              </button>
            </div>
            <pre className="mono-block max-h-[320px] min-h-[180px] overflow-y-auto text-[11px] text-fg-muted">
              {details.formattedRaw}
            </pre>
          </section>

          <section>
            <h3 className="section-label mb-2">Related logs</h3>
            {related.length === 0 ? (
              <p className="font-mono text-[10px] text-fg-subtle">
                No nearby logs with same request ID or time window.
              </p>
            ) : (
              <div className="space-y-1">
                {related.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRelated(r)}
                    className="w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-left hover:border-border-strong hover:bg-panel"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase text-fg-subtle">
                        {r.level}
                      </span>
                      <span className="truncate font-mono text-[10px] text-fg-muted">
                        {r.message}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoTile({
  label,
  value,
  valueClassName,
  mono = true,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  mono?: boolean;
}) {
  return (
    <div className="detail-drawer-inner rounded-md px-2.5 py-2">
      <p className="section-label mb-1">{label}</p>
      <p
        className={cn(
          "truncate text-[11px] tabular-nums text-fg",
          mono && "font-mono",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NoteCard({ note }: { note: IssueNote }) {
  return (
    <div className="detail-drawer-inner rounded-md px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <Badge variant={note.target === "issue" ? "accent" : "neutral"}>{note.target}</Badge>
        <span className="font-mono text-[10px] text-fg-subtle">
          {new Date(note.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-fg">{note.text}</p>
    </div>
  );
}

function CopyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-press inline-flex items-center gap-1 rounded-sm border border-border bg-panel px-2 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-fg-muted hover:bg-panel-raised hover:text-fg"
    >
      <Copy className="h-3 w-3" />
      {label}
    </button>
  );
}
