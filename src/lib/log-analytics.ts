import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";
import type { TimeRange } from "./authz";

/**
 * Log Analytics access via the app's own identity. Local dev uses `az login`
 * (DefaultAzureCredential); production uses a user-assigned Managed Identity.
 * No secrets are stored for this path.
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

export interface LogRow {
  timeGenerated: string;
  app: string;
  level: string;
  message: string;
}

/** Run a read-only KQL query against law-savvly-dev-main and return typed rows. */
export async function queryLogs(kql: string, range: TimeRange): Promise<LogRow[]> {
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
  const tg = idx("TimeGenerated");
  const app = idx("App");
  const level = idx("Level");
  const msg = idx("Message");

  return table.rows.map((row) => ({
    timeGenerated: String(row[tg] ?? ""),
    app: String(row[app] ?? ""),
    level: String(row[level] ?? "INFO"),
    message: String(row[msg] ?? ""),
  }));
}
