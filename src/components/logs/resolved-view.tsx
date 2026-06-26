"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "@/components/logs/issue-status-badge";
import { LevelBadge } from "@/components/logs/level-badge";
import { TriagePageShell } from "@/components/logs/triage-page-shell";
import { fetchIssuesApi, setIssueStatusApi } from "@/lib/api";
import type { IssueRecord } from "@/lib/issues";

interface ResolvedViewProps {
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

export function ResolvedView({ role, userEmail, signOutAction }: ResolvedViewProps) {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await fetchIssuesApi(["resolved"]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reopen(fingerprint: string) {
    await setIssueStatusApi(fingerprint, "open");
    await load();
  }

  return (
    <TriagePageShell
      title="Resolved"
      userEmail={userEmail}
      role={role}
      signOutAction={signOutAction}
      loading={loading}
      onRefresh={() => void load()}
    >
      <section className="px-3 py-3">
        <p className="mb-2.5 font-mono text-[10px] text-fg-subtle">
          {issues.length} resolved issue{issues.length === 1 ? "" : "s"} · reopen to return to the triage queue
        </p>

        <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
          {issues.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">
              {loading ? "Loading resolved issues…" : "No resolved issues"}
            </p>
          ) : (
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-3 py-2 font-semibold">Issue</th>
                  <th className="px-3 py-2 font-semibold">App</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Resolved</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.fingerprint} className="border-b border-border/60 last:border-0 hover:bg-glass">
                    <td className="max-w-[360px] px-3 py-2.5">
                      <p className="truncate text-fg">{issue.label}</p>
                      {issue.endpoint && (
                        <p className="mt-0.5 truncate text-[10px] text-fg-subtle">{issue.endpoint}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted">{shortAppName(issue.app)}</td>
                    <td className="px-3 py-2.5">
                      <LevelBadge level={issue.level} />
                    </td>
                    <td className="px-3 py-2.5">
                      <IssueStatusBadge status={issue.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
                      {format(new Date(issue.updatedAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => void reopen(issue.fingerprint)}>
                        <RotateCcw className="h-3 w-3" />
                        Reopen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </TriagePageShell>
  );
}

function shortAppName(app: string): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
