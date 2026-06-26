import type { TimeRange } from "./authz";
import type { LogLevel } from "./types";

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
  limit?: number;
}

const ERROR_TERMS = ["ERROR", "Error", "exception", "Exception", "FATAL", "panic", "stacktrace"];

export function buildLogsQuery(input: BuildQueryInput): string {
  if (!(ALLOWED_APPS as readonly string[]).includes(input.app)) {
    throw new Error(`App not allowed: ${input.app}`);
  }
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_ROWS, 1), MAX_ROWS);
  const lines: string[] = [
    CONSOLE_TABLE,
    `| where ContainerAppName_s == "${escapeKql(input.app)}"`,
  ];

  if (input.errorsOnly) {
    const terms = ERROR_TERMS.map((t) => `"${t}"`).join(", ");
    lines.push(`| where Log_s has_any (${terms})`);
  }

  if (input.search && input.search.trim().length > 0) {
    lines.push(`| where Log_s contains "${escapeKql(input.search)}"`);
  }

  if (input.requestId && input.requestId.trim().length > 0) {
    lines.push(`| where Log_s contains "${escapeKql(input.requestId)}"`);
  }

  if (input.stream && input.stream !== "all") {
    lines.push(`| where Stream_s == "${escapeKql(input.stream)}"`);
  }

  // Best-effort level detection from the raw line (formats vary per app - see plan section 14).
  // Default bucket is LOG (uncategorised stdout/stderr).
  lines.push(
    "| extend Level = case(" +
      'Log_s has_any ("ERROR","FATAL","panic","Exception","stacktrace"), "ERROR", ' +
      'Log_s has_any ("WARN","WARNING"), "WARN", ' +
      'Log_s has "INFO", "INFO", ' +
      '"LOG")',
  );

  // Level filter only when not in errorsOnly mode (errorsOnly already narrows to errors).
  if (input.level && !input.errorsOnly) {
    lines.push(`| where Level == "${escapeKql(input.level)}"`);
  }

  lines.push(
    "| project TimeGenerated, App = ContainerAppName_s, Level, Message = Log_s, " +
      "Revision = RevisionName_s, Replica = ContainerName_s, Stream = Stream_s, Raw = Log_s",
  );
  lines.push("| order by TimeGenerated desc");
  lines.push(`| take ${limit}`);

  return lines.join("\n");
}
