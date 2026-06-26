import { DefaultAzureCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";
import type { TimeRange } from "./authz";
import type { ContainerApp, LogEntry, LogLevel } from "./types";

/**
 * Log Analytics access via the app's own identity. Local dev uses `az login`
 * (DefaultAzureCredential); production uses a user-assigned Managed Identity.
 * No secrets are stored for this path, and the workspace id never leaves the server.
 */

function credential() {
  return new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID,
  });
}

let _client: LogsQueryClient | null = null;
function client(): LogsQueryClient {
  if (!_client) _client = new LogsQueryClient(credential());
  return _client;
}

const DURATION: Record<TimeRange, string> = {
  "1h": Durations.oneHour,
  "24h": Durations.twentyFourHours,
  "7d": Durations.sevenDays,
};

const KNOWN_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "LOG", "DEBUG"];

export interface LogAnalyticsTable {
  columnNames: string[];
  rows: unknown[][];
}

/** Normalise the case()-derived level string into the LogLevel union (defaults to LOG). */
function normalizeLevel(value: string): LogLevel {
  const upper = value.toUpperCase();
  return (KNOWN_LEVELS as string[]).includes(upper) ? (upper as LogLevel) : "LOG";
}

/**
 * Run a read-only KQL query against the workspace and return normalized rows:
 * { id, timestamp, app, level, stream, message, revision, replica, rawPayload }.
 */
export async function queryLogs(kql: string, range: TimeRange): Promise<LogEntry[]> {
  const table = await queryLogAnalyticsTable(kql, range);
  if (!table) return [];

  const idx = (name: string) => table.columnNames.findIndex((c) => c === name);
  const cTime = idx("TimeGenerated");
  const cApp = idx("App");
  const cLevel = idx("Level");
  const cMsg = idx("Message");
  const cRev = idx("Revision");
  const cReplica = idx("Replica");
  const cStream = idx("Stream");
  const cRaw = idx("RawPayload");

  const at = (row: unknown[], i: number) => (i >= 0 ? stringifyCell(row[i]) : "");
  const timestampAt = (row: unknown[], i: number) => {
    const value = i >= 0 ? row[i] : undefined;
    return value instanceof Date ? value.toISOString() : stringifyCell(value);
  };

  return table.rows.map((row, i) => {
    const timestamp = timestampAt(row, cTime);
    const stream = at(row, cStream).toLowerCase() === "stderr" ? "stderr" : "stdout";
    const message = at(row, cMsg);
    const app = at(row, cApp) as ContainerApp;
    return {
      id: `${app}:${at(row, cRev)}:${at(row, cReplica)}:${i}:${timestamp}`,
      timestamp,
      app,
      level: normalizeLevel(at(row, cLevel) || "LOG"),
      message,
      revision: at(row, cRev),
      replica: at(row, cReplica),
      stream,
      rawPayload: at(row, cRaw) || message,
    } satisfies LogEntry;
  });
}

export async function queryLogAnalyticsTable(
  kql: string,
  range: TimeRange,
): Promise<LogAnalyticsTable | null> {
  const workspaceId = process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID;
  if (!workspaceId) throw new Error("AZURE_LOG_ANALYTICS_WORKSPACE_ID is not set");

  const result = await client().queryWorkspace(workspaceId, kql, {
    duration: DURATION[range],
  });

  if (result.status !== LogsQueryResultStatus.Success) {
    throw new Error(`Log Analytics query failed: ${result.status}`);
  }

  const table = result.tables[0];
  if (!table) return null;

  return {
    columnNames: table.columnDescriptors.map((c) => c.name),
    rows: table.rows,
  };
}

function stringifyCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
