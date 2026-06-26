import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
};

export const testSessions = sqliteTable("test_sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["active", "stopped"] }).notNull().default("active"),
  startedAt: text("started_at").notNull(),
  stoppedAt: text("stopped_at"),
  ...timestamps,
});

export const issueFingerprints = sqliteTable("issue_fingerprints", {
  fingerprint: text("fingerprint").primaryKey(),
  status: text("status", {
    enum: ["open", "investigating", "resolved", "suppressed", "hidden"],
  }).notNull().default("open"),
  app: text("app").notNull(),
  level: text("level").notNull(),
  label: text("label").notNull(),
  endpoint: text("endpoint"),
  statusCode: integer("status_code"),
  ...timestamps,
});

export const hiddenLogs = sqliteTable("hidden_logs", {
  logId: text("log_id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  app: text("app").notNull(),
  level: text("level").notNull(),
  label: text("label").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const logAnnotations = sqliteTable("log_annotations", {
  id: text("id").primaryKey(),
  target: text("target", { enum: ["log", "issue"] }).notNull(),
  targetId: text("target_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  logId: text("log_id"),
  text: text("text").notNull(),
  author: text("author"),
  ...timestamps,
});

export const suppressRules = sqliteTable("suppress_rules", {
  id: text("id").primaryKey(),
  pattern: text("pattern").notNull(),
  app: text("app"),
  level: text("level"),
  endpoint: text("endpoint"),
  reason: text("reason"),
  createdBy: text("created_by"),
  ...timestamps,
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  actor: text("actor"),
  oid: text("oid"),
  role: text("role"),
  app: text("app"),
  search: text("search"),
  rowCount: integer("row_count"),
  testSessionId: text("test_session_id"),
  details: text("details"),
  ...timestamps,
});
