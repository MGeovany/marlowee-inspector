"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Eye, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "@/components/logs/issue-status-badge";
import { LevelBadge } from "@/components/logs/level-badge";
import { TriagePageShell } from "@/components/logs/triage-page-shell";
import { fetchAnnotationsApi, fetchIssuesApi, setIssueStatusApi } from "@/lib/api";
import type { IssueRecord } from "@/lib/issues";

interface IssuesViewProps {
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

export function IssuesView({ role, userEmail, signOutAction }: IssuesViewProps) {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [issueRows, notes] = await Promise.all([
        fetchIssuesApi(["open", "investigating"]),
        fetchAnnotationsApi({ all: true }),
      ]);
      setIssues(issueRows);
      const counts: Record<string, number> = {};
      for (const note of notes) {
        counts[note.fingerprint] = (counts[note.fingerprint] ?? 0) + 1;
      }
      setNoteCounts(counts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(fingerprint: string, status: IssueRecord["status"]) {
    await setIssueStatusApi(fingerprint, status);
    await load();
  }

  const openCount = useMemo(
    () => issues.filter((issue) => issue.status === "open").length,
    [issues],
  );
  const investigatingCount = useMemo(
    () => issues.filter((issue) => issue.status === "investigating").length,
    [issues],
  );

  return (
    <TriagePageShell
      title="Issues"
      userEmail={userEmail}
      role={role}
      signOutAction={signOutAction}
      loading={loading}
      onRefresh={() => void load()}
    >
      <section className="border-b border-border px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <StatChip label="Open" value={openCount} tone="error" />
          <StatChip label="Investigating" value={investigatingCount} tone="accent" />
          <StatChip label="Total queue" value={issues.length} tone="neutral" />
        </div>
      </section>

      <section className="px-3 py-3">
        <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
          {issues.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">
              {loading ? "Loading issues…" : "No open or investigating issues"}
            </p>
          ) : (
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-3 py-2 font-semibold">Issue</th>
                  <th className="px-3 py-2 font-semibold">App</th>
                  <th className="px-3 py-2 font-semibold">Level</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
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
                      {(noteCounts[issue.fingerprint] ?? 0) > 0 && (
                        <p className="mt-0.5 text-[10px] text-fg-subtle">
                          {noteCounts[issue.fingerprint]} note{noteCounts[issue.fingerprint] === 1 ? "" : "s"}
                        </p>
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
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {issue.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void updateStatus(issue.fingerprint, "investigating")}
                          >
                            <Eye className="h-3 w-3" />
                            Investigate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void updateStatus(issue.fingerprint, "resolved")}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-fg-subtle"
                          onClick={() => void updateStatus(issue.fingerprint, "suppressed")}
                        >
                          <ShieldOff className="h-3 w-3" />
                          Suppress
                        </Button>
                      </div>
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

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "error" | "accent" | "neutral";
}) {
  const toneClass =
    tone === "error"
      ? "border-[rgba(242,77,77,0.35)] text-level-error"
      : tone === "accent"
        ? "border-[rgba(0,217,115,0.35)] text-accent-bright"
        : "border-border text-fg-muted";

  return (
    <div className={`metric-card min-w-[120px] shadow-panel ${toneClass}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value text-fg">{value.toLocaleString()}</p>
    </div>
  );
}

function shortAppName(app: string): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
