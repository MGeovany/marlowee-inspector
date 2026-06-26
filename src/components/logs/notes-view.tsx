"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { TriagePageShell } from "@/components/logs/triage-page-shell";
import { fetchAnnotationsApi } from "@/lib/api";
import type { IssueNote } from "@/lib/issues";

interface NotesViewProps {
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

export function NotesView({ role, userEmail, signOutAction }: NotesViewProps) {
  const [notes, setNotes] = useState<IssueNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await fetchAnnotationsApi({ all: true }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TriagePageShell
      title="Notes"
      userEmail={userEmail}
      role={role}
      signOutAction={signOutAction}
      loading={loading}
      onRefresh={() => void load()}
    >
      <section className="px-3 py-3">
        <p className="mb-2.5 font-mono text-[10px] text-fg-subtle">
          {notes.length} annotation{notes.length === 1 ? "" : "s"} from log triage
        </p>

        <div className="space-y-2">
          {notes.length === 0 ? (
            <div className="glass-card rounded-[var(--radius-md)] px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">
              {loading ? "Loading notes…" : "No annotations yet"}
            </div>
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="glass-card rounded-[var(--radius-md)] border border-border/80 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={note.target === "issue" ? "accent" : "info"}>
                    {note.target}
                  </Badge>
                  <span className="font-mono text-[10px] text-fg-subtle">
                    {format(new Date(note.createdAt), "MMM d, yyyy · HH:mm:ss")}
                  </span>
                  {note.author && (
                    <span className="font-mono text-[10px] text-fg-muted">{note.author}</span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-fg">
                  {note.text}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-fg-subtle">
                  {note.logId && <span>log: {note.logId}</span>}
                  <span className="max-w-full truncate">fp: {note.fingerprint}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </TriagePageShell>
  );
}
