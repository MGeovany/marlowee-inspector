import type { IssueStatus, IssueStore } from "./issues";
import type { TestSession } from "./test-session";
import type { ContainerApp, LogLevel } from "./types";

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
