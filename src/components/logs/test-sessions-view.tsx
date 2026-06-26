"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Copy,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogsSidebar } from "@/components/logs/logs-sidebar";
import { cn } from "@/lib/utils";
import {
  createSessionApi,
  deleteSessionApi,
  fetchSessionsApi,
  updateSessionApi,
} from "@/lib/api";
import {
  createTestSession,
  formatSessionDuration,
  stopTestSession,
  type TestSession,
} from "@/lib/test-session";

interface TestSessionsViewProps {
  role: string | null;
  userEmail: string | null;
  signOutAction: () => Promise<void>;
}

export function TestSessionsView({
  role,
  userEmail,
  signOutAction,
}: TestSessionsViewProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [active, setActive] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSessionsApi();
      setSessions(data.sessions);
      setActive(data.active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function handleCreate(startLive = false) {
    const session = createTestSession(newName);
    setCreating(true);
    try {
      await createSessionApi({
        id: session.id,
        name: session.name,
        startedAt: session.startedAt,
      });
      setNewName("");
      if (startLive) {
        router.push(`/logs?sessionId=${encodeURIComponent(session.id)}`);
        return;
      }
      await loadSessions();
    } finally {
      setCreating(false);
    }
  }

  async function handleStop(session: TestSession) {
    const stopped = stopTestSession(session);
    await updateSessionApi(stopped.id, {
      status: "stopped",
      stoppedAt: stopped.stoppedAt,
    });
    await loadSessions();
  }

  async function handleRename(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updateSessionApi(id, { name: trimmed });
    setEditingId(null);
    setEditName("");
    await loadSessions();
  }

  async function handleDelete(session: TestSession) {
    const ok = window.confirm(
      `Delete session "${session.name}"? This only removes Marlowee metadata — Azure logs are unchanged.`,
    );
    if (!ok) return;
    await deleteSessionApi(session.id);
    await loadSessions();
  }

  function openInLiveLogs(session: TestSession) {
    router.push(`/logs?sessionId=${encodeURIComponent(session.id)}`);
  }

  async function copySessionId(id: string) {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="ambient-bg flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar userEmail={userEmail} role={role} signOutAction={signOutAction} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-header shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <div className="dd-breadcrumb flex items-center">
                <span>Monitor</span>
                <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
                <span className="text-fg-muted">Test Sessions</span>
              </div>
              <h1 className="dd-page-title mt-0.5">Test Sessions</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadSessions()} disabled={loading}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {active && (
            <section className="mx-3 mt-3 rounded-[var(--radius-lg)] border border-[rgba(0,217,115,0.22)] bg-[rgba(0,217,115,0.06)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">
                      <span className="live-dot mr-1" />
                      Recording
                    </Badge>
                    <span className="font-medium text-fg">{active.name}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-fg-muted">
                    {formatSessionDuration(
                      now - new Date(active.startedAt).getTime(),
                    )}{" "}
                    · since {format(new Date(active.startedAt), "HH:mm:ss")}
                  </p>
                  <code className="mt-1 inline-block font-mono text-[10px] text-fg-subtle">
                    {active.id}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => openInLiveLogs(active)}>
                    <Radio className="h-3 w-3" />
                    Open in Live Logs
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleStop(active)}>
                    <Square className="h-3 w-3" />
                    Stop
                  </Button>
                </div>
              </div>
            </section>
          )}

          <section className="border-b border-border px-3 py-3">
            <h2 className="section-label mb-2.5">New session</h2>
            <div className="glass-card flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] p-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='Session name, e.g. "Contribution flow QA"'
                className="h-8 max-w-md flex-1 font-sans text-[12px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate(true);
                }}
              />
              <Button size="sm" disabled={creating} onClick={() => void handleCreate(true)}>
                <Play className="h-3 w-3" />
                Start & open Live Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={creating}
                onClick={() => void handleCreate(false)}
              >
                Start only
              </Button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-fg-subtle">
              Sessions filter Azure logs by{" "}
              <code className="text-fg-muted">TimeGenerated &gt;= startedAt</code>. Starting a new
              session stops any active recording.
            </p>
          </section>

          <section className="px-3 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="section-label">History</h2>
              <span className="font-mono text-[10px] text-fg-subtle">
                {sessions.length} session{sessions.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="glass-card overflow-hidden rounded-[var(--radius-md)]">
              {sessions.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-[11px] text-fg-subtle">
                  {loading ? "Loading sessions…" : "No test sessions yet"}
                </p>
              ) : (
                <table className="w-full border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-border bg-[#242526] text-left text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Started</th>
                      <th className="px-3 py-2 font-semibold">Duration</th>
                      <th className="px-3 py-2 font-semibold">Session ID</th>
                      <th className="px-3 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        now={now}
                        editingId={editingId}
                        editName={editName}
                        copiedId={copiedId}
                        onEditStart={() => {
                          setEditingId(session.id);
                          setEditName(session.name);
                        }}
                        onEditNameChange={setEditName}
                        onEditSave={() => void handleRename(session.id)}
                        onEditCancel={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        onOpen={() => openInLiveLogs(session)}
                        onStop={() => void handleStop(session)}
                        onDelete={() => void handleDelete(session)}
                        onCopyId={() => void copySessionId(session.id)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  now,
  editingId,
  editName,
  copiedId,
  onEditStart,
  onEditNameChange,
  onEditSave,
  onEditCancel,
  onOpen,
  onStop,
  onDelete,
  onCopyId,
}: {
  session: TestSession;
  now: number;
  editingId: string | null;
  editName: string;
  copiedId: string | null;
  onEditStart: () => void;
  onEditNameChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onOpen: () => void;
  onStop: () => void;
  onDelete: () => void;
  onCopyId: () => void;
}) {
  const durationMs =
    new Date(session.stoppedAt ?? now).getTime() - new Date(session.startedAt).getTime();
  const isEditing = editingId === session.id;

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-glass">
      <td className="max-w-[240px] px-3 py-2.5">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="h-7 font-sans text-[12px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onEditSave();
                if (e.key === "Escape") onEditCancel();
              }}
            />
            <Button size="sm" variant="outline" onClick={onEditSave}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="truncate text-fg">{session.name}</span>
            <button
              type="button"
              onClick={onEditStart}
              className="shrink-0 text-fg-subtle hover:text-fg"
              aria-label="Rename session"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <Badge variant={session.status === "active" ? "success" : "neutral"}>
          {session.status === "active" ? "Active" : "Stopped"}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-fg-muted">
        {format(new Date(session.startedAt), "MMM d, HH:mm:ss")}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-fg-muted">
        {formatSessionDuration(durationMs)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <code className="max-w-[120px] truncate text-[10px] text-fg-subtle">{session.id}</code>
          <button
            type="button"
            onClick={onCopyId}
            className="shrink-0 text-fg-subtle hover:text-fg"
            aria-label="Copy session ID"
          >
            <Copy className="h-3 w-3" />
          </button>
          {copiedId === session.id && (
            <span className="text-[10px] text-accent-bright">Copied</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={onOpen}>
            <Radio className="h-3 w-3" />
            Open
          </Button>
          {session.status === "active" && (
            <Button size="sm" variant="outline" onClick={onStop}>
              <Square className="h-3 w-3" />
              Stop
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-level-error">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
