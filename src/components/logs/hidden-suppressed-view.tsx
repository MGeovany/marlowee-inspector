"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SegmentControl } from "@/components/ui/segment-control";
import { IssueStatusBadge } from "@/components/logs/issue-status-badge";
import { LevelBadge } from "@/components/logs/level-badge";
import { TriagePageShell } from "@/components/logs/triage-page-shell";
import {
  deleteSuppressionApi,
  fetchHiddenLogsApi,
  fetchIssuesApi,
  fetchSuppressionsApi,
  reopenLogEntryApi,
  setIssueStatusApi,
  type SuppressionRule,
} from "@/lib/api";
import type { HiddenLogRecord, IssueRecord } from "@/lib/issues";

type HiddenTab = "hidden" | "suppressed" | "rules";

interface HiddenSuppressedViewProps {
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

export function HiddenSuppressedView({
  role,
  userEmail,
  signOutAction,
}: HiddenSuppressedViewProps) {
  const [tab, setTab] = useState<HiddenTab>("hidden");
  const [hiddenLogs, setHiddenLogs] = useState<HiddenLogRecord[]>([]);
  const [suppressedIssues, setSuppressedIssues] = useState<IssueRecord[]>([]);
  const [rules, setRules] = useState<SuppressionRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hidden, suppressed, suppressionRules] = await Promise.all([
        fetchHiddenLogsApi(),
        fetchIssuesApi(["suppressed", "hidden"]),
        fetchSuppressionsApi(),
      ]);
      setHiddenLogs(hidden);
      setSuppressedIssues(suppressed);
      setRules(suppressionRules);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reopenLog(logId: string) {
    await reopenLogEntryApi(logId);
    await load();
  }

  async function reopenIssue(fingerprint: string) {
    await setIssueStatusApi(fingerprint, "open");
    await load();
  }

  async function removeRule(id: string) {
    const ok = window.confirm("Delete this suppression rule?");
    if (!ok) return;
    await deleteSuppressionApi(id);
    await load();
  }

  return (
    <TriagePageShell
      title="Hidden / Suppressed"
      userEmail={userEmail}
      role={role}
      signOutAction={signOutAction}
      loading={loading}
      onRefresh={() => void load()}
    >
      <section className="border-b border-border px-3 py-3">
        <SegmentControl<HiddenTab>
          value={tab}
          onValueChange={setTab}
          mono
          options={[
            { value: "hidden", label: `Hidden logs (${hiddenLogs.length})` },
            { value: "suppressed", label: `Fingerprints (${suppressedIssues.length})` },
            { value: "rules", label: `Rules (${rules.length})` },
          ]}
        />
      </section>

      <section className="px-3 py-3">
        {tab === "hidden" && (
          <DataTable
            emptyMessage={loading ? "Loading hidden logs…" : "No hidden logs"}
            isEmpty={hiddenLogs.length === 0}
          >
            <thead>
              <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-3 py-2 font-semibold">Log</th>
                <th className="px-3 py-2 font-semibold">App</th>
                <th className="px-3 py-2 font-semibold">Level</th>
                <th className="px-3 py-2 font-semibold">Hidden</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hiddenLogs.map((log) => (
                <tr key={log.logId} className="border-b border-border/60 last:border-0 hover:bg-glass">
                  <td className="max-w-[360px] px-3 py-2.5">
                    <p className="truncate text-fg">{log.label}</p>
                    <code className="mt-0.5 block truncate text-[10px] text-fg-subtle">{log.logId}</code>
                  </td>
                  <td className="px-3 py-2.5 text-fg-muted">{shortAppName(log.app)}</td>
                  <td className="px-3 py-2.5">
                    <LevelBadge level={log.level} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => void reopenLog(log.logId)}>
                      <RotateCcw className="h-3 w-3" />
                      Reopen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        {tab === "suppressed" && (
          <DataTable
            emptyMessage={loading ? "Loading fingerprints…" : "No suppressed or hidden fingerprints"}
            isEmpty={suppressedIssues.length === 0}
          >
            <thead>
              <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-3 py-2 font-semibold">Fingerprint</th>
                <th className="px-3 py-2 font-semibold">App</th>
                <th className="px-3 py-2 font-semibold">Level</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppressedIssues.map((issue) => (
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
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => void reopenIssue(issue.fingerprint)}>
                      <RotateCcw className="h-3 w-3" />
                      Reopen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        {tab === "rules" && (
          <DataTable
            emptyMessage={loading ? "Loading rules…" : "No suppression rules"}
            isEmpty={rules.length === 0}
          >
            <thead>
              <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                <th className="px-3 py-2 font-semibold">Pattern</th>
                <th className="px-3 py-2 font-semibold">Filters</th>
                <th className="px-3 py-2 font-semibold">Reason</th>
                <th className="px-3 py-2 font-semibold">Created</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-border/60 last:border-0 hover:bg-glass">
                  <td className="max-w-[240px] px-3 py-2.5">
                    <code className="break-all text-[10px] text-fg">{rule.pattern}</code>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-fg-muted">
                    {[rule.app, rule.level, rule.endpoint].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5 text-fg-muted">{rule.reason ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
                    {format(new Date(rule.createdAt), "MMM d, HH:mm")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-level-error"
                      onClick={() => void removeRule(rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </TriagePageShell>
  );
}

function DataTable({
  children,
  emptyMessage,
  isEmpty,
}: {
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  return (
    <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
      {isEmpty ? (
        <p className="px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">{emptyMessage}</p>
      ) : (
        <table className="w-full border-collapse font-mono text-[11px]">{children}</table>
      )}
    </div>
  );
}

function shortAppName(app: string): string {
  return app.startsWith("ca-") ? app.slice(3) : app;
}
