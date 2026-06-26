import { extractLogDetails } from "./log-details";
import type { ContainerApp, LogEntry, LogLevel } from "./types";

export type IssueStatus = "open" | "investigating" | "resolved" | "suppressed" | "hidden";
export type NoteTarget = "log" | "issue";

export interface IssueRecord {
  fingerprint: string;
  status: IssueStatus;
  app: ContainerApp;
  level: LogLevel;
  label: string;
  endpoint?: string;
  statusCode?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HiddenLogRecord {
  logId: string;
  fingerprint: string;
  app: ContainerApp;
  level: LogLevel;
  label: string;
  createdAt: string;
}

export interface IssueNote {
  id: string;
  target: NoteTarget;
  targetId: string;
  fingerprint: string;
  logId?: string;
  text: string;
  createdAt: string;
}

export interface IssueStore {
  issues: Record<string, IssueRecord>;
  hiddenLogs: Record<string, HiddenLogRecord>;
  notes: IssueNote[];
}

export interface ManagedIssueSummary {
  fingerprint: string;
  status: IssueStatus;
  label: string;
  app: ContainerApp;
  level: LogLevel;
  count: number;
  sample: LogEntry;
  notesCount: number;
  updatedAt: string;
}

export interface HiddenLogSummary {
  record: HiddenLogRecord;
  entry: LogEntry;
  notesCount: number;
}

const STORAGE_KEY = "marlowee-inspector.issue-state.v1";

export const EMPTY_ISSUE_STORE: IssueStore = {
  issues: {},
  hiddenLogs: {},
  notes: [],
};

export function loadIssueStore(): IssueStore {
  if (typeof window === "undefined") return EMPTY_ISSUE_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ISSUE_STORE;
    const parsed = JSON.parse(raw) as Partial<IssueStore>;
    return {
      issues: parsed.issues ?? {},
      hiddenLogs: parsed.hiddenLogs ?? {},
      notes: parsed.notes ?? [],
    };
  } catch {
    return EMPTY_ISSUE_STORE;
  }
}

export function saveIssueStore(store: IssueStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function buildIssueFingerprint(entry: LogEntry): string {
  const details = extractLogDetails(entry, true);
  const endpoint = details.http.path ? normalizeEndpoint(details.http.path) : "no-endpoint";
  const statusCode = details.http.status != null ? String(details.http.status) : "no-status";
  return [entry.app, entry.level, normalizeMessage(entry.message), endpoint, statusCode].join("|");
}

export function issueLabel(entry: LogEntry): string {
  return normalizeMessage(entry.message).slice(0, 96) || entry.message.slice(0, 96) || "log event";
}

export function issueRecordFor(entry: LogEntry, status: IssueStatus): IssueRecord {
  const details = extractLogDetails(entry, true);
  const now = new Date().toISOString();
  return {
    fingerprint: buildIssueFingerprint(entry),
    status,
    app: entry.app,
    level: entry.level,
    label: issueLabel(entry),
    endpoint: details.http.path ? normalizeEndpoint(details.http.path) : undefined,
    statusCode: details.http.status,
    createdAt: now,
    updatedAt: now,
  };
}

export function issueStatusFor(store: IssueStore, fingerprint: string): IssueStatus {
  return store.issues[fingerprint]?.status ?? "open";
}

export function isLogHidden(store: IssueStore, entry: LogEntry): boolean {
  return Boolean(store.hiddenLogs[entry.id]);
}

export function shouldSuppressEntry(store: IssueStore, entry: LogEntry): boolean {
  if (isLogHidden(store, entry)) return true;
  const status = issueStatusFor(store, buildIssueFingerprint(entry));
  return status === "resolved" || status === "suppressed" || status === "hidden";
}

export function notesForIssue(store: IssueStore, fingerprint: string): IssueNote[] {
  return store.notes
    .filter((note) => note.fingerprint === fingerprint)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function notesForLog(store: IssueStore, logId: string): IssueNote[] {
  return store.notes
    .filter((note) => note.target === "log" && note.logId === logId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function noteCountFor(store: IssueStore, fingerprint: string, logId?: string): number {
  return store.notes.filter(
    (note) => note.fingerprint === fingerprint || (logId && note.logId === logId),
  ).length;
}

export function addIssueNote(
  store: IssueStore,
  entry: LogEntry,
  target: NoteTarget,
  text: string,
): IssueStore {
  const trimmed = text.trim();
  if (!trimmed) return store;
  const fingerprint = buildIssueFingerprint(entry);
  const now = new Date().toISOString();
  return {
    ...store,
    notes: [
      {
        id: randomId(),
        target,
        targetId: target === "issue" ? fingerprint : entry.id,
        fingerprint,
        logId: entry.id,
        text: trimmed,
        createdAt: now,
      },
      ...store.notes,
    ],
  };
}

export function setIssueStatus(store: IssueStore, entry: LogEntry, status: IssueStatus): IssueStore {
  const next = issueRecordFor(entry, status);
  const existing = store.issues[next.fingerprint];
  return {
    ...store,
    issues: {
      ...store.issues,
      [next.fingerprint]: {
        ...next,
        createdAt: existing?.createdAt ?? next.createdAt,
      },
    },
  };
}

export function hideLog(store: IssueStore, entry: LogEntry): IssueStore {
  const fingerprint = buildIssueFingerprint(entry);
  return {
    ...store,
    hiddenLogs: {
      ...store.hiddenLogs,
      [entry.id]: {
        logId: entry.id,
        fingerprint,
        app: entry.app,
        level: entry.level,
        label: issueLabel(entry),
        createdAt: new Date().toISOString(),
      },
    },
  };
}

export function reopenLog(store: IssueStore, logId: string): IssueStore {
  const { [logId]: _removed, ...hiddenLogs } = store.hiddenLogs;
  return { ...store, hiddenLogs };
}

export function collectManagedIssues(rows: LogEntry[], store: IssueStore, statuses: IssueStatus[]): ManagedIssueSummary[] {
  const groups = new Map<string, { sample: LogEntry; count: number }>();
  for (const row of rows) {
    const fingerprint = buildIssueFingerprint(row);
    const status = issueStatusFor(store, fingerprint);
    if (!statuses.includes(status)) continue;
    const existing = groups.get(fingerprint);
    if (existing) existing.count += 1;
    else groups.set(fingerprint, { sample: row, count: 1 });
  }

  return [...groups.entries()]
    .map(([fingerprint, group]) => {
      const record = store.issues[fingerprint] ?? issueRecordFor(group.sample, "open");
      return {
        fingerprint,
        status: record.status,
        label: record.label,
        app: record.app,
        level: record.level,
        count: group.count,
        sample: group.sample,
        notesCount: noteCountFor(store, fingerprint),
        updatedAt: record.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function collectHiddenLogs(rows: LogEntry[], store: IssueStore): HiddenLogSummary[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return Object.values(store.hiddenLogs)
    .map((record) => {
      const entry = byId.get(record.logId);
      if (!entry) return null;
      return { record, entry, notesCount: noteCountFor(store, record.fingerprint, record.logId) };
    })
    .filter((item): item is HiddenLogSummary => Boolean(item))
    .sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));
}

function normalizeMessage(message: string): string {
  return message
    .split("\n")[0]
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/g, ":uuid")
    .replace(/\b[0-9a-f]{16,}\b/g, ":hex")
    .replace(/\b\d{4,}\b/g, ":num")
    .replace(/\b\d{3}\b/g, ":code")
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/g, ":email")
    .replace(/"[^"]{8,}"|'[^']{8,}'/g, ":str")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEndpoint(path: string): string {
  return path
    .toLowerCase()
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/g, "/:uuid")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{12,}(?=\/|$)/g, "/:id");
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
