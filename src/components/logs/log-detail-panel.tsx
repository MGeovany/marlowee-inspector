"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toLogAiBrief } from "@/lib/log-ai-brief";
import { kqlForLogEntry } from "@/lib/log-kql";
import type { LogEntry, TimeRange } from "@/lib/types";
import { LevelBadge } from "./level-badge";

interface LogDetailPanelProps {
  entry: LogEntry | null;
  related: LogEntry[];
  timeRange: TimeRange;
  masked: boolean;
  onClose: () => void;
  onSelectRelated: (entry: LogEntry) => void;
}

type CopyTarget =
  | "ai"
  | "message"
  | "metadata"
  | "raw"
  | "requestId"
  | "kql";

function metadataText(entry: LogEntry): string {
  return [
    `App: ${entry.app}`,
    `Level: ${entry.level}`,
    `Revision: ${entry.revision}`,
    `Replica: ${entry.replica}`,
    `Stream: ${entry.stream}`,
    `Request ID: ${entry.requestId ?? "—"}`,
    `Time: ${entry.timestamp}`,
  ].join("\n");
}

export function LogDetailPanel({
  entry,
  related,
  timeRange,
  masked,
  onClose,
  onSelectRelated,
}: LogDetailPanelProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  useEffect(() => {
    setCopied(null);
  }, [entry?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!entry) return null;

  async function copyText(target: CopyTarget, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="absolute inset-0 z-30 flex">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative ml-auto flex h-full w-full max-w-[420px] flex-col border-l border-border bg-workspace shadow-[-8px_0_32px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-sidebar px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-micro font-medium text-fg">{entry.app}</p>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-fg-subtle">
            {format(new Date(entry.timestamp), "EEE, MMM d yyyy · HH:mm:ss.SSS")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="rounded-sm border border-transparent p-1 text-fg-subtle hover:border-border hover:bg-sidebar-hover hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
        <LevelBadge level={entry.level} />
        <Badge variant="neutral">{entry.stream}</Badge>
        {masked && <Badge variant="warn">masked</Badge>}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
        <CopyBtn
          label={copied === "message" ? "Copied" : "Copy message"}
          onClick={() => void copyText("message", entry.message)}
        />
        {entry.requestId && (
          <CopyBtn
            label={copied === "requestId" ? "Copied" : "Copy request ID"}
            onClick={() => void copyText("requestId", entry.requestId!)}
          />
        )}
        <CopyBtn
          label={copied === "kql" ? "Copied" : "Copy KQL"}
          onClick={() => void copyText("kql", kqlForLogEntry(entry, timeRange))}
        />
        <Button
          variant="default"
          size="sm"
          onClick={() => void copyText("ai", toLogAiBrief(entry, masked))}
        >
          <Copy className="h-3 w-3" />
          {copied === "ai" ? "Copied" : "Copy for AI"}
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Block
          label="Full message"
          copied={copied === "message"}
          onCopy={() => void copyText("message", entry.message)}
        >
          <pre className="mono-block whitespace-pre-wrap break-words text-[11px] text-fg-muted">
            {entry.message}
          </pre>
        </Block>

        <Block
          label="Metadata"
          copied={copied === "metadata"}
          onCopy={() => void copyText("metadata", metadataText(entry))}
        >
          <dl className="overflow-hidden rounded-md border border-border bg-sidebar">
            <MetaRow label="App" value={entry.app} />
            <MetaRow label="Level" value={entry.level} />
            <MetaRow label="Revision" value={entry.revision} />
            <MetaRow label="Replica" value={entry.replica} />
            <MetaRow label="Stream" value={entry.stream} />
            <MetaRow label="Request ID" value={entry.requestId ?? "—"} last />
          </dl>
        </Block>

        <Block
          label="Raw payload"
          copied={copied === "raw"}
          onCopy={() => void copyText("raw", entry.rawPayload)}
        >
          <pre className="mono-block min-h-[180px] max-h-[280px] overflow-y-auto text-[11px] text-fg-muted">
            {entry.rawPayload}
          </pre>
        </Block>

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
                    <span className="font-mono text-[10px] uppercase text-fg-subtle">{r.level}</span>
                    <span className="truncate font-mono text-[10px] text-fg-muted">{r.message}</span>
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

function CopyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-sm border border-border bg-panel px-2 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-fg-muted hover:bg-panel-raised hover:text-fg"
    >
      <Copy className="h-3 w-3" />
      {label}
    </button>
  );
}

function Block({
  label,
  copied,
  onCopy,
  children,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="section-label">{label}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.04em] text-fg-subtle hover:text-fg"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {children}
    </section>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[34%_1fr] gap-3 px-3.5 py-2",
        !last && "border-b border-border",
      )}
    >
      <dt className="font-mono text-[11px] text-fg-muted">{label}</dt>
      <dd className="break-all font-mono text-[11px] text-fg">{value}</dd>
    </div>
  );
}
