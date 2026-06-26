"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toLogAiBrief } from "@/lib/log-ai-brief";
import type { LogEntry } from "@/lib/types";
import { LevelBadge } from "./level-badge";

interface LogDetailSheetProps {
  entry: LogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masked: boolean;
}

export function LogDetailSheet({ entry, open, onOpenChange, masked }: LogDetailSheetProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [entry?.id]);

  async function copyForAi() {
    if (!entry) return;
    await navigator.clipboard.writeText(toLogAiBrief(entry, masked));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false);
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
              onClick={() => void copyForAi()}
              title="Copy an AI-ready brief to paste into Claude or ChatGPT"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy for AI"}
            </Button>
          </div>

          <section>
            <h3 className="section-label mb-2">Message</h3>
            <pre className="mono-block whitespace-pre-wrap break-words text-[11px] text-fg-muted">
              {entry.message}
            </pre>
          </section>

          <section>
            <h3 className="section-label mb-2">Metadata</h3>
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
            <h3 className="section-label mb-2">Raw payload</h3>
            <pre className="mono-block max-h-[min(60vh,520px)] overflow-y-auto text-[11px] text-fg-muted">
              {entry.raw}
            </pre>
          </section>
        </div>
      )}
    </Sheet>
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
