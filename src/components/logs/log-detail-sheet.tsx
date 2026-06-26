"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toLogAiBrief } from "@/lib/log-ai-brief";
import type { LogEntry } from "@/lib/types";
import { LevelBadge } from "./level-badge";

interface LogDetailSheetProps {
  entry: LogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masked: boolean;
}

type CopyTarget = "ai" | "message" | "metadata" | "raw";

function metadataText(entry: LogEntry): string {
  return [
    `App: ${entry.app}`,
    `Level: ${entry.level}`,
    `Revision: ${entry.revision}`,
    `Replica: ${entry.replica}`,
    `Stream: ${entry.stream}`,
    `Request ID: ${entry.requestId ?? "—"}`,
  ].join("\n");
}

export function LogDetailSheet({ entry, open, onOpenChange, masked }: LogDetailSheetProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);

  useEffect(() => {
    setCopied(null);
  }, [entry?.id]);

  async function copyText(target: CopyTarget, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(target);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(null);
        onOpenChange(next);
      }}
      title={entry ? entry.app : "Log detail"}
      description={
        entry ? format(new Date(entry.timeGenerated), "EEE, MMM d yyyy · HH:mm:ss.SSS") : undefined
      }
    >
      {entry && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={entry.level} />
              <Badge variant="neutral">{entry.stream}</Badge>
              {masked && <Badge variant="warn">masked</Badge>}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => void copyText("ai", toLogAiBrief(entry, masked))}
              title="Copy an AI-ready brief to paste into Claude or ChatGPT"
            >
              <Copy className="h-3 w-3" />
              {copied === "ai" ? "Copied" : "Copy for AI"}
            </Button>
          </div>

          <section>
            <SectionHead
              label="Message"
              copied={copied === "message"}
              onCopy={() => void copyText("message", entry.message)}
            />
            <pre className="mono-block whitespace-pre-wrap break-words text-[11px] text-fg-muted">
              {entry.message}
            </pre>
          </section>

          <section>
            <SectionHead
              label="Metadata"
              copied={copied === "metadata"}
              onCopy={() => void copyText("metadata", metadataText(entry))}
            />
            <dl className="overflow-hidden rounded-md border border-border bg-sidebar">
              <MetaRow label="App" value={entry.app} />
              <MetaRow label="Level" value={entry.level} />
              <MetaRow label="Revision" value={entry.revision} />
              <MetaRow label="Replica" value={entry.replica} />
              <MetaRow label="Stream" value={entry.stream} />
              <MetaRow label="Request ID" value={entry.requestId ?? "—"} last />
            </dl>
          </section>

          <section>
            <SectionHead
              label="Raw payload"
              copied={copied === "raw"}
              onCopy={() => void copyText("raw", entry.raw)}
            />
            <pre className="mono-block min-h-[320px] max-h-[min(75vh,800px)] overflow-y-auto text-[11px] text-fg-muted">
              {entry.raw}
            </pre>
          </section>
        </div>
      )}
    </Sheet>
  );
}

function SectionHead({
  label,
  copied,
  onCopy,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="section-label">{label}</h3>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border border-border bg-panel px-2 py-1",
          "text-[10px] font-medium uppercase tracking-[0.04em] text-fg-muted transition-colors",
          "hover:border-border-strong hover:bg-panel-raised hover:text-fg",
        )}
      >
        <Copy className="h-3 w-3" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[34%_1fr] gap-3 px-3.5 py-2 ${last ? "" : "border-b border-border"}`}
    >
      <dt className="font-mono text-[11px] text-fg-muted">{label}</dt>
      <dd className="break-all font-mono text-[11px] text-fg">{value}</dd>
    </div>
  );
}
