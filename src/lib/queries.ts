import type { TimeRange } from "./authz";
import type { LogLevel } from "./types";
import type { QueryTimeWindow } from "./query-time";
import { parseIsoDatetime } from "./query-time";

/**
 * KQL builder. Security model:
 *  - the container app name MUST be in this hard-coded allowlist (defense in depth on top of authz)
 *  - free-text search is escaped before being placed in a `contains` clause (anti KQL-injection)
 *  - results are always bounded with `take` (hard cap MAX_ROWS)
 *  - queries are read-only by construction
 *
 * Primary table (discovery-confirmed): ContainerAppConsoleLogs_CL (stdout/stderr).
 *   columns: TimeGenerated, ContainerAppName_s, Log_s, RevisionName_s, ContainerName_s, Stream_s
 * Secondary table (platform events, not yet queried here): ContainerAppSystemLogs_CL.
 */

export const CONSOLE_TABLE = "ContainerAppConsoleLogs_CL";
export const SYSTEM_TABLE = "ContainerAppSystemLogs_CL";

/**
 * Hard-coded container-app allowlist — the last line of defense against KQL
 * injection / unauthorized table access. Intentionally NOT env-driven (which
 * could be misconfigured); role-based authz layers on top of this.
 */
export const ALLOWED_APPS = ["ca-data-api", "ca-dashboard", "ca-onboarding", "ca-admin"] as const;

/** Hard ceiling on rows returned by any single query. */
export const MAX_ROWS = 500;
const DEFAULT_ROWS = 200;

/** Escape a free-text value for safe inclusion inside a KQL double-quoted string literal. */
export function escapeKql(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // backslash first
    .replace(/"/g, '\\"') // double quotes
    .replace(/[\x00-\x1f\x7f]/g, "") // strip control chars (keeps spaces, hyphens, etc.)
    .slice(0, 256);
}

export interface BuildQueryInput {
  app: string;
  range: TimeRange; // duration is applied by the SDK; kept here for clarity
  search?: string;
  errorsOnly?: boolean;
  /** Filter to a single detected level (ignored when errorsOnly is set). */
  level?: LogLevel;
  stream?: "stdout" | "stderr" | "all";
  requestId?: string;
  testSessionId?: string;
  limit?: number;
  timeWindow?: QueryTimeWindow;
}

export interface BuildSummaryQueryInput {
  apps: string[];
  range: TimeRange; // duration is applied by the SDK; kept here for clarity
  timeWindow?: QueryTimeWindow;
}

export const METRICS_BUCKET_COUNT = 14;

const METRICS_BIN: Record<TimeRange, string> = {
  "1h": "4m",
  "24h": "1h",
  "7d": "12h",
};

export function metricsBinMinutes(range: TimeRange): number {
  switch (range) {
    case "1h":
      return 4;
    case "24h":
      return 60;
    case "7d":
      return 12 * 60;
  }
}

const ERROR_TERMS = ["ERROR", "Error", "exception", "Exception", "FATAL", "panic", "stacktrace"];

/** Truncate log message for error-pattern grouping (mirrors KQL in buildLogsSummaryQuery). */
const KQL_PATTERN_LABEL =
  'iif(strlen(Message) > 56, strcat(substring(Message, 0, 53), "…"), Message)';

function kqlTimeWindowLines(window?: QueryTimeWindow): string[] {
  if (!window) return [];
  const lines: string[] = [];
  if (window.since) {
    const since = parseIsoDatetime(window.since);
    if (!since) throw new Error("Invalid since timestamp");
    lines.push(`| where TimeGenerated >= datetime("${since}")`);
  }
  if (window.until) {
    const until = parseIsoDatetime(window.until);
    if (!until) throw new Error("Invalid until timestamp");
    lines.push(`| where TimeGenerated <= datetime("${until}")`);
  }
  return lines;
}

export function buildLogsQuery(input: BuildQueryInput): string {
  if (!(ALLOWED_APPS as readonly string[]).includes(input.app)) {
    throw new Error(`App not allowed: ${input.app}`);
  }
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_ROWS, 1), MAX_ROWS);
  const lines: string[] = [
    CONSOLE_TABLE,
    '| extend App = tostring(column_ifexists("ContainerAppName_s", ""))',
    '| extend Message = tostring(column_ifexists("Log_s", ""))',
    '| extend Revision = tostring(column_ifexists("RevisionName_s", ""))',
    '| extend Replica = tostring(column_ifexists("ContainerName_s", ""))',
    '| extend Stream = tolower(tostring(column_ifexists("Stream_s", "stdout")))',
    `| where App == "${escapeKql(input.app)}"`,
    ...kqlTimeWindowLines(input.timeWindow),
  ];

  if (input.search && input.search.trim().length > 0) {
    lines.push(`| where Message contains "${escapeKql(input.search)}"`);
  }

  if (input.requestId && input.requestId.trim().length > 0) {
    lines.push(`| where Message contains "${escapeKql(input.requestId)}"`);
  }

  if (input.testSessionId && input.testSessionId.trim().length > 0) {
    lines.push(`| where Message contains "${escapeKql(input.testSessionId)}"`);
  }

  if (input.stream && input.stream !== "all") {
    lines.push(`| where Stream == "${escapeKql(input.stream)}"`);
  }

  // Best-effort level detection from the raw line (formats vary per app - see plan section 14).
  // Default bucket is LOG (uncategorised stdout/stderr).
  lines.push(
    "| extend Level = case(" +
      `Message has_any (${ERROR_TERMS.map((t) => `"${t}"`).join(", ")}), "ERROR", ` +
      'Message has_any ("WARN","WARNING"), "WARN", ' +
      'Message has "INFO", "INFO", ' +
      '"LOG")',
  );

  if (input.errorsOnly) {
    lines.push('| where Level == "ERROR"');
  }

  // Level filter only when not in errorsOnly mode (errorsOnly already narrows to errors).
  if (input.level && !input.errorsOnly) {
    lines.push(`| where Level == "${escapeKql(input.level)}"`);
  }

  lines.push(
    "| project TimeGenerated, App, Level, Stream, Message, Revision, Replica, RawPayload = Message",
  );
  lines.push("| order by TimeGenerated desc");
  lines.push(`| take ${limit}`);

  return lines.join("\n");
}

export function buildLogsSummaryQuery(input: BuildSummaryQueryInput): string {
  const apps = input.apps.filter((app) => (ALLOWED_APPS as readonly string[]).includes(app));
  if (apps.length === 0) throw new Error("No allowed apps for summary query");

  const appList = apps.map((app) => `"${escapeKql(app)}"`).join(", ");
  const errorTerms = ERROR_TERMS.map((term) => `"${term}"`).join(", ");
  const nullMetrics =
    'Count = long(null), TotalLogs = long(null), ErrorsCount = long(null), WarningsCount = long(null), LastLogTimestamp = datetime(null)';
  const nullLogFields =
    'App = "", Level = "", TimeGenerated = datetime(null), Message = "", Revision = "", Replica = "", Stream = ""';

  return [
    `let Base = materialize(${CONSOLE_TABLE}`,
    '| extend App = tostring(column_ifexists("ContainerAppName_s", ""))',
    '| extend Message = tostring(column_ifexists("Log_s", ""))',
    '| extend Revision = tostring(column_ifexists("RevisionName_s", ""))',
    '| extend Replica = tostring(column_ifexists("ContainerName_s", ""))',
    '| extend Stream = tolower(tostring(column_ifexists("Stream_s", "stdout")))',
    `| where App in (${appList})`,
    ...kqlTimeWindowLines(input.timeWindow),
    "| extend Level = case(" +
      `Message has_any (${errorTerms}), "ERROR", ` +
      'Message has_any ("WARN","WARNING"), "WARN", ' +
      'Message has "INFO", "INFO", ' +
      '"LOG")',
    ");",
    "union",
    `  (Base | summarize TotalLogs = count(), ErrorsCount = countif(Level == "ERROR"), WarningsCount = countif(Level == "WARN"), LastLogTimestamp = max(TimeGenerated) | project Kind = "totals", Key = "", ${nullMetrics.replace("TotalLogs = long(null), ErrorsCount = long(null), WarningsCount = long(null), LastLogTimestamp = datetime(null)", "TotalLogs, ErrorsCount, WarningsCount, LastLogTimestamp")}, ${nullLogFields}),`,
    `  (Base | summarize Count = countif(Level == "ERROR") by App | project Kind = "errorsByApp", Key = App, Count, TotalLogs = long(null), ErrorsCount = long(null), WarningsCount = long(null), LastLogTimestamp = datetime(null), App = "", Level = "", TimeGenerated = datetime(null), Message = "", Revision = "", Replica = "", Stream = ""),`,
    `  (Base | summarize Count = count() by Level | project Kind = "logsByLevel", Key = Level, Count, TotalLogs = long(null), ErrorsCount = long(null), WarningsCount = long(null), LastLogTimestamp = datetime(null), ${nullLogFields}),`,
    `  (Base | summarize Count = count() by App | top 1 by Count desc | project Kind = "mostNoisyApp", Key = App, Count, TotalLogs = long(null), ErrorsCount = long(null), WarningsCount = long(null), LastLogTimestamp = datetime(null), App = "", Level = "", TimeGenerated = datetime(null), Message = "", Revision = "", Replica = "", Stream = ""),`,
    `  (Base | where Level == "ERROR" | top 1 by TimeGenerated desc | project Kind = "latestError", Key = "", ${nullMetrics}, App, Level, TimeGenerated, Message, Revision, Replica, Stream),`,
    `  (Base | where Level == "WARN" | top 1 by TimeGenerated desc | project Kind = "latestWarning", Key = "", ${nullMetrics}, App, Level, TimeGenerated, Message, Revision, Replica, Stream),`,
    `  (Base | where Level == "ERROR" | extend PatternLabel = ${KQL_PATTERN_LABEL} | summarize Count=count(), TimeGenerated=max(TimeGenerated), Message=take_any(Message), Revision=take_any(Revision), Replica=take_any(Replica), Stream=take_any(Stream), Level=take_any(Level) by App, PatternLabel | top 8 by Count desc | project Kind = "errorPattern", Key=strcat(App, "|", PatternLabel), Count, TotalLogs=long(null), ErrorsCount=long(null), WarningsCount=long(null), LastLogTimestamp=datetime(null), App, Level, TimeGenerated, Message, Revision, Replica, Stream),`,
    `  (Base | where Level == "ERROR" | top 5 by TimeGenerated desc | project Kind = "latestErrorRow", Key=strcat(App, "|", tostring(TimeGenerated)), Count=long(null), TotalLogs=long(null), ErrorsCount=long(null), WarningsCount=long(null), LastLogTimestamp=datetime(null), App, Level, TimeGenerated, Message, Revision, Replica, Stream),`,
    `  (Base | top 8 by TimeGenerated desc | project Kind = "recentActivity", Key=strcat(App, "|", tostring(TimeGenerated)), Count=long(null), TotalLogs=long(null), ErrorsCount=long(null), WarningsCount=long(null), LastLogTimestamp=datetime(null), App, Level, TimeGenerated, Message, Revision, Replica, Stream),`,
  ].join("\n");
}

/** Time-bucketed aggregates for dashboard sparklines (full workspace scan, not row-limited). */
export function buildMetricsQuery(input: BuildSummaryQueryInput): string {
  const apps = input.apps.filter((app) => (ALLOWED_APPS as readonly string[]).includes(app));
  if (apps.length === 0) throw new Error("No allowed apps for metrics query");

  const appList = apps.map((app) => `"${escapeKql(app)}"`).join(", ");
  const errorTerms = ERROR_TERMS.map((term) => `"${term}"`).join(", ");
  const binSize = METRICS_BIN[input.range];

  return [
    `let AllowedApps = dynamic([${appList}]);`,
    `let BinSize = ${binSize};`,
    `let Base = ${CONSOLE_TABLE}`,
    '| extend App = tostring(column_ifexists("ContainerAppName_s", ""))',
    '| extend Message = tostring(column_ifexists("Log_s", ""))',
    '| extend Stream = tolower(tostring(column_ifexists("Stream_s", "stdout")))',
    "| where App in (AllowedApps)",
    ...kqlTimeWindowLines(input.timeWindow),
    "| extend Level = case(" +
      `Message has_any (${errorTerms}), "ERROR", ` +
      'Message has_any ("WARN","WARNING"), "WARN", ' +
      'Message has "INFO", "INFO", ' +
      '"LOG")',
    '| extend LatencyMs = tolong(extract(@"(\\d+)\\s*ms", 1, Message))',
    '| extend ErrorKey = iif(Level == "ERROR", strcat(App, ":", iif(strlen(Message) > 56, substring(Message, 0, 53), Message)), "")',
    ";",
    "let Buckets = Base",
    "| summarize",
    "    Errors = countif(Level == \"ERROR\"),",
    "    Warnings = countif(Level == \"WARN\"),",
    "    Logs = count(),",
    "    AvgLatencyMs = avgif(LatencyMs, LatencyMs > 0 and LatencyMs < 600000),",
    "    ActiveIncidents = dcountif(ErrorKey, Level == \"ERROR\")",
    "  by Bucket = bin(TimeGenerated, BinSize)",
    "| order by Bucket asc;",
    "let Totals = Base",
    "| summarize",
    "    OpenErrors = countif(Level == \"ERROR\"),",
    "    TotalLogs = count(),",
    "    AvgResponseMs = avgif(LatencyMs, LatencyMs > 0 and LatencyMs < 600000),",
    "    ActiveIncidents = dcountif(ErrorKey, Level == \"ERROR\");",
    "union",
    '  (Buckets | project Kind = "bucket", Bucket, Errors, Warnings, Logs, AvgLatencyMs, ActiveIncidents, OpenErrors = long(null), TotalLogs = long(null), AvgResponseMs = real(null)),',
    '  (Totals | project Kind = "totals", Bucket = datetime(null), Errors = long(null), Warnings = long(null), Logs = long(null), AvgLatencyMs = real(null), ActiveIncidents, OpenErrors, TotalLogs, AvgResponseMs)',
  ].join("\n");
}
