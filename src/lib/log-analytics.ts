import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";
import type { TimeRange } from "./authz";
import type { ContainerApp, LogEntry, LogLevel } from "./types";

/**
 * Log Analytics access via the app's own identity. Local dev uses `az login`
 * (DefaultAzureCredential); production uses a user-assigned Managed Identity.
 * No secrets are stored for this path, and the workspace id never leaves the server.
 */

function credential() {
  const clientId = process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID;
  return clientId ? new ManagedIdentityCredential({ clientId }) : new DefaultAzureCredential();
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
  const workspaceId = process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID;
  if (!workspaceId) throw new Error("AZURE_LOG_ANALYTICS_WORKSPACE_ID is not set");

  const result = await client().queryWorkspace(workspaceId, kql, {
    duration: DURATION[range],
  });

  if (result.status !== LogsQueryResultStatus.Success) {
    throw new Error(`Log Analytics query failed: ${result.status}`);
  }

  const table = result.tables[0];
  if (!table) return [];

  const idx = (name: string) => table.columnDescriptors.findIndex((c) => c.name === name);
  const cTime = idx("TimeGenerated");
  const cApp = idx("App");
  const cLevel = idx("Level");
  const cMsg = idx("Message");
  const cRev = idx("Revision");
  const cReplica = idx("Replica");
  const cStream = idx("Stream");
  const cRaw = idx("Raw");

  const at = (row: unknown[], i: number) => (i >= 0 ? String(row[i] ?? "") : "");

  return table.rows.map((row, i) => {
    const timestamp = at(row, cTime);
    const stream = at(row, cStream) === "stderr" ? "stderr" : "stdout";
    const message = at(row, cMsg);
    return {
      id: `${at(row, cApp)}:${i}:${timestamp}`,
      timestamp,
      app: at(row, cApp) as ContainerApp,
      level: normalizeLevel(at(row, cLevel) || "LOG"),
      message,
      revision: at(row, cRev),
      replica: at(row, cReplica),
      stream,
      rawPayload: at(row, cRaw) || message,
    } satisfies LogEntry;
  });
}
