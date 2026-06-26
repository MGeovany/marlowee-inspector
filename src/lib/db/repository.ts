import { eq, inArray, desc, and, isNull, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./client";
import {
  testSessions,
  issueFingerprints,
  hiddenLogs as hiddenLogsTable,
  logAnnotations,
  suppressRules,
  auditEvents,
} from "./schema";
import type { IssueStatus, IssueNote, IssueRecord, HiddenLogRecord } from "../issues";
import type { ContainerApp, LogLevel } from "../types";
import type { AuditEventType, AuditEvent } from "../audit";

export interface IssueStore {
  issues: Record<string, IssueRecord>;
  hiddenLogs: Record<string, HiddenLogRecord>;
  notes: IssueNote[];
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const HIDDEN_STATUSES: IssueStatus[] = ["hidden", "suppressed"];

export async function getIssueStore(): Promise<IssueStore> {
  const db = getDb();

  const [allIssues, allHidden, allNotes] = await Promise.all([
    db.select().from(issueFingerprints).orderBy(desc(issueFingerprints.updatedAt)).all(),
    db.select().from(hiddenLogsTable).orderBy(desc(hiddenLogsTable.createdAt)).all(),
    db.select().from(logAnnotations).orderBy(desc(logAnnotations.createdAt)).all(),
  ]);

  const issues: Record<string, IssueRecord> = {};
  const hiddenLogs: Record<string, HiddenLogRecord> = {};

  for (const row of allIssues) {
    const record: IssueRecord = {
      fingerprint: row.fingerprint,
      status: row.status as IssueStatus,
      app: row.app as ContainerApp,
      level: row.level as LogLevel,
      label: row.label,
      endpoint: row.endpoint ?? undefined,
      statusCode: row.statusCode ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    issues[row.fingerprint] = record;
  }

  for (const row of allHidden) {
    hiddenLogs[row.logId] = {
      logId: row.logId,
      fingerprint: row.fingerprint,
      app: row.app as ContainerApp,
      level: row.level as LogLevel,
      label: row.label,
      createdAt: row.createdAt,
    };
  }

  const notes: IssueNote[] = allNotes.map((row) => ({
    id: row.id,
    target: row.target as "log" | "issue",
    targetId: row.targetId,
    fingerprint: row.fingerprint,
    logId: row.logId ?? undefined,
    text: row.text,
    createdAt: row.createdAt,
  }));

  return { issues, hiddenLogs, notes };
}

export async function upsertIssue(
  fingerprint: string,
  data: {
    status: IssueStatus;
    app: ContainerApp;
    level: LogLevel;
    label: string;
    endpoint?: string;
    statusCode?: number;
  },
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .select()
    .from(issueFingerprints)
    .where(eq(issueFingerprints.fingerprint, fingerprint))
    .get();

  if (existing) {
    db.update(issueFingerprints)
      .set({ status: data.status, updatedAt: now })
      .where(eq(issueFingerprints.fingerprint, fingerprint))
      .run();
  } else {
    db.insert(issueFingerprints)
      .values({
        fingerprint,
        status: data.status,
        app: data.app,
        level: data.level,
        label: data.label,
        endpoint: data.endpoint ?? null,
        statusCode: data.statusCode ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export async function setIssueStatus(
  fingerprint: string,
  status: IssueStatus,
): Promise<void> {
  const db = getDb();
  db.update(issueFingerprints)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(issueFingerprints.fingerprint, fingerprint))
    .run();
}

export async function getIssue(fingerprint: string): Promise<IssueRecord | null> {
  const db = getDb();
  const row = db
    .select()
    .from(issueFingerprints)
    .where(eq(issueFingerprints.fingerprint, fingerprint))
    .get();

  if (!row) return null;
  return {
    fingerprint: row.fingerprint,
    status: row.status as IssueStatus,
    app: row.app as ContainerApp,
    level: row.level as LogLevel,
    label: row.label,
    endpoint: row.endpoint ?? undefined,
    statusCode: row.statusCode ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listIssuesByStatus(statuses: IssueStatus[]): Promise<IssueRecord[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(issueFingerprints)
    .where(inArray(issueFingerprints.status, statuses))
    .orderBy(desc(issueFingerprints.updatedAt))
    .all();

  return rows.map((row) => ({
    fingerprint: row.fingerprint,
    status: row.status as IssueStatus,
    app: row.app as ContainerApp,
    level: row.level as LogLevel,
    label: row.label,
    endpoint: row.endpoint ?? undefined,
    statusCode: row.statusCode ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function addNote(note: {
  target: "log" | "issue";
  targetId: string;
  fingerprint: string;
  logId?: string;
  text: string;
  author?: string;
}): Promise<IssueNote> {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomId();

  db.insert(logAnnotations)
    .values({
      id,
      target: note.target,
      targetId: note.targetId,
      fingerprint: note.fingerprint,
      logId: note.logId ?? null,
      text: note.text,
      author: note.author ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    target: note.target,
    targetId: note.targetId,
    fingerprint: note.fingerprint,
    logId: note.logId,
    text: note.text,
    createdAt: now,
  };
}

export async function listNotesForIssue(fingerprint: string): Promise<IssueNote[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(logAnnotations)
    .where(eq(logAnnotations.fingerprint, fingerprint))
    .orderBy(desc(logAnnotations.createdAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    target: row.target as "log" | "issue",
    targetId: row.targetId,
    fingerprint: row.fingerprint,
    logId: row.logId ?? undefined,
    text: row.text,
    createdAt: row.createdAt,
  }));
}

export async function listNotesForLog(logId: string): Promise<IssueNote[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(logAnnotations)
    .where(eq(logAnnotations.logId, logId))
    .orderBy(desc(logAnnotations.createdAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    target: row.target as "log" | "issue",
    targetId: row.targetId,
    fingerprint: row.fingerprint,
    logId: row.logId ?? undefined,
    text: row.text,
    createdAt: row.createdAt,
  }));
}

export async function listRecentNotes(limit = 20): Promise<IssueNote[]> {
  const db = getDb();
  const rows = db
    .select()
    .from(logAnnotations)
    .orderBy(desc(logAnnotations.createdAt))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    target: row.target as "log" | "issue",
    targetId: row.targetId,
    fingerprint: row.fingerprint,
    logId: row.logId ?? undefined,
    text: row.text,
    createdAt: row.createdAt,
  }));
}

// Session operations

export async function getActiveSession() {
  const db = getDb();
  const row = db
    .select()
    .from(testSessions)
    .where(eq(testSessions.status, "active"))
    .get();

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    startedAt: row.startedAt,
    stoppedAt: row.stoppedAt ?? undefined,
    status: row.status as "active" | "stopped",
  };
}

export async function listSessions() {
  const db = getDb();
  return db
    .select()
    .from(testSessions)
    .orderBy(desc(testSessions.createdAt))
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      startedAt: row.startedAt,
      stoppedAt: row.stoppedAt ?? undefined,
      status: row.status as "active" | "stopped",
    }));
}

export async function createSession(data: {
  id: string;
  name: string;
  startedAt: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(testSessions)
    .values({
      id: data.id,
      name: data.name,
      status: "active",
      startedAt: data.startedAt,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export async function updateSession(
  id: string,
  data: { name?: string; status?: "active" | "stopped"; stoppedAt?: string },
) {
  const db = getDb();
  const updates: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.status !== undefined) updates.status = data.status;
  if (data.stoppedAt !== undefined) updates.stoppedAt = data.stoppedAt;

  db.update(testSessions)
    .set(updates)
    .where(eq(testSessions.id, id))
    .run();
}

// Suppression operations

export async function listSuppressions() {
  const db = getDb();
  return db
    .select()
    .from(suppressRules)
    .orderBy(desc(suppressRules.createdAt))
    .all()
    .map((row) => ({
      id: row.id,
      pattern: row.pattern,
      app: row.app ?? undefined,
      level: row.level ?? undefined,
      endpoint: row.endpoint ?? undefined,
      reason: row.reason ?? undefined,
      createdBy: row.createdBy ?? undefined,
      createdAt: row.createdAt,
    }));
}

export async function createSuppression(data: {
  pattern: string;
  app?: string;
  level?: string;
  endpoint?: string;
  reason?: string;
  createdBy?: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomId();
  db.insert(suppressRules)
    .values({
      id,
      pattern: data.pattern,
      app: data.app ?? null,
      level: data.level ?? null,
      endpoint: data.endpoint ?? null,
      reason: data.reason ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export async function deleteSuppression(id: string) {
  const db = getDb();
  db.delete(suppressRules).where(eq(suppressRules.id, id)).run();
}

// Hidden log operations

export async function hideLogEntry(data: {
  logId: string;
  fingerprint: string;
  app: ContainerApp;
  level: LogLevel;
  label: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(hiddenLogsTable)
    .values({
      logId: data.logId,
      fingerprint: data.fingerprint,
      app: data.app,
      level: data.level,
      label: data.label,
      createdAt: now,
    })
    .run();
}

export async function reopenLogEntry(logId: string) {
  const db = getDb();
  db.delete(hiddenLogsTable).where(eq(hiddenLogsTable.logId, logId)).run();
}

export async function listHiddenLogs() {
  const db = getDb();
  return db
    .select()
    .from(hiddenLogsTable)
    .orderBy(desc(hiddenLogsTable.createdAt))
    .all()
    .map((row) => ({
      logId: row.logId,
      fingerprint: row.fingerprint,
      app: row.app as ContainerApp,
      level: row.level as LogLevel,
      label: row.label,
      createdAt: row.createdAt,
    }));
}

// Audit operations

export async function createAuditEvent(event: {
  type: string;
  actor?: string | null;
  oid?: string | null;
  role?: string | null;
  app?: string;
  search?: string;
  rowCount?: number;
  testSessionId?: string;
  details?: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(auditEvents)
    .values({
      id: randomId(),
      type: event.type,
      actor: event.actor ?? null,
      oid: event.oid ?? null,
      role: event.role ?? null,
      app: event.app ?? null,
      search: event.search ?? null,
      rowCount: event.rowCount ?? null,
      testSessionId: event.testSessionId ?? null,
      details: event.details ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export interface AuditEventRow {
  id: string;
  type: string;
  actor: string | null;
  oid: string | null;
  role: string | null;
  app: string | null;
  search: string | null;
  rowCount: number | null;
  testSessionId: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

export function queryAuditEvents(filters: {
  type?: string;
  actor?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}): { rows: AuditEventRow[]; total: number } {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [];
  if (filters.type) conditions.push(eq(auditEvents.type, filters.type));
  if (filters.actor) conditions.push(eq(auditEvents.actor, filters.actor));
  if (filters.startDate) conditions.push(gte(auditEvents.createdAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(auditEvents.createdAt, filters.endDate));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select()
    .from(auditEvents)
    .where(where)
    .orderBy(desc(auditEvents.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0)
    .all();

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(where)
    .get();

  return { rows, total: total?.count ?? 0 };
}
