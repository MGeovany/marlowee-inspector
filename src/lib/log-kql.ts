import { buildLogsQuery } from "./queries";
import type { LogEntry, LogLevel, TimeRange } from "./types";

export interface KqlFilterParams {
  app: string;
  range: TimeRange;
  search?: string;
  errorsOnly?: boolean;
  level?: LogLevel;
  limit?: number;
}

/** Current filter state as copy-paste KQL (for Log Analytics). */
export function kqlFromFilters(params: KqlFilterParams): string {
  return buildLogsQuery(params);
}

/** Focused KQL to investigate a single log line and its neighbors. */
export function kqlForLogEntry(entry: LogEntry, range: TimeRange): string {
  const lines = [
    "ContainerAppConsoleLogs_CL",
    `| where ContainerAppName_s == "${entry.app}"`,
    `| where TimeGenerated between (ago(${range}) .. now())`,
  ];

  if (entry.requestId) {
    lines.push(`| where Log_s contains "${entry.requestId}"`);
  } else {
    lines.push(`| where RevisionName_s == "${entry.revision}"`);
    lines.push(`| where Log_s contains "${entry.message.slice(0, 64).replace(/"/g, '\\"')}"`);
  }

  lines.push("| order by TimeGenerated desc");
  lines.push("| take 100");
  return lines.join("\n");
}
