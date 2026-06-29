import type { IssueStatus, IssueStore, IssueRecord, HiddenLogRecord, IssueNote } from "./issues";
import type { TestSession } from "./test-session";
import type { ContainerApp, LogLevel, LogsSummaryResponse } from "./types";

export interface StoreInitResponse extends IssueStore {
  activeSession: TestSession | null;
  suppressions: unknown[];
}

export async function fetchStoreInit(): Promise<StoreInitResponse> {
  const res = await fetch("/api/store/init");
  if (!res.ok) throw new Error("Failed to load store");
  return res.json();
}

export async function setIssueStatusApi(
  fingerprint: string,
  status: IssueStatus,
): Promise<void> {
  await fetch(`/api/issues/${encodeURIComponent(fingerprint)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function upsertIssueApi(data: {
  fingerprint: string;
  status: IssueStatus;
  app: ContainerApp;
  level: LogLevel;
  label: string;
  endpoint?: string;
  statusCode?: number;
}): Promise<void> {
  await fetch("/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function addNoteApi(data: {
  target: "log" | "issue";
  targetId: string;
  fingerprint: string;
  logId?: string;
  text: string;
}): Promise<void> {
  await fetch("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function createSessionApi(data: {
  id: string;
  name: string;
  startedAt: string;
}): Promise<void> {
  await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateSessionApi(
  id: string,
  data: { name?: string; status?: "active" | "stopped"; stoppedAt?: string },
): Promise<void> {
  await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export interface SessionsResponse {
  active: TestSession | null;
  sessions: TestSession[];
}

export async function fetchSessionsApi(): Promise<SessionsResponse> {
  const res = await fetch("/api/sessions");
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

export async function deleteSessionApi(id: string): Promise<void> {
  await fetch(`/api/sessions/${id}`, { method: "DELETE" });
}

/** Aggregated log/error breakdown scoped to a test session's time window. */
export async function fetchSessionSummaryApi(
  session: TestSession,
): Promise<LogsSummaryResponse> {
  const params = new URLSearchParams({ since: session.startedAt });
  if (session.status === "stopped" && session.stoppedAt) {
    params.set("until", session.stoppedAt);
  }
  const res = await fetch(`/api/logs/summary?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load session summary");
  return res.json();
}

export async function hideLogEntryApi(data: {
  logId: string;
  fingerprint: string;
  app: ContainerApp;
  level: LogLevel;
  label: string;
}): Promise<void> {
  await fetch("/api/hidden", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function reopenLogEntryApi(logId: string): Promise<void> {
  await fetch(`/api/hidden/${logId}`, {
    method: "DELETE",
  });
}

export async function fetchIssuesApi(statuses: IssueStatus[]): Promise<IssueRecord[]> {
  const params = new URLSearchParams({ status: statuses.join(",") });
  const res = await fetch(`/api/issues?${params}`);
  if (!res.ok) throw new Error("Failed to load issues");
  return res.json();
}

export async function fetchHiddenLogsApi(): Promise<HiddenLogRecord[]> {
  const res = await fetch("/api/hidden");
  if (!res.ok) throw new Error("Failed to load hidden logs");
  return res.json();
}

export interface SuppressionRule {
  id: string;
  pattern: string;
  app?: string;
  level?: string;
  endpoint?: string;
  reason?: string;
  createdBy?: string;
  createdAt: string;
}

export async function fetchSuppressionsApi(): Promise<SuppressionRule[]> {
  const res = await fetch("/api/suppressions");
  if (!res.ok) throw new Error("Failed to load suppressions");
  return res.json();
}

export async function deleteSuppressionApi(id: string): Promise<void> {
  await fetch(`/api/suppressions/${id}`, { method: "DELETE" });
}

export async function fetchAnnotationsApi(options?: {
  all?: boolean;
  fingerprint?: string;
  logId?: string;
}): Promise<IssueNote[]> {
  const params = new URLSearchParams();
  if (options?.all) params.set("all", "true");
  if (options?.fingerprint) params.set("fingerprint", options.fingerprint);
  if (options?.logId) params.set("logId", options.logId);
  const qs = params.toString();
  const res = await fetch(`/api/annotations${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to load annotations");
  return res.json();
}
