import type { LogEntry, LogsSummaryResponse } from "./types";
import { extractLogDetails } from "./log-details";

export interface SidePanelData {
  latestErrors: LogEntry[];
  errorPatterns: LogsSummaryResponse["errorPatterns"];
  recentActivity: LogEntry[];
}

/** Map Azure summary aggregates to the Watchdog side panel. */
export function summaryToSidePanel(summary: LogsSummaryResponse | null): SidePanelData {
  if (!summary) {
    return { latestErrors: [], errorPatterns: [], recentActivity: [] };
  }

  return {
    latestErrors: summary.latestErrors,
    errorPatterns: summary.errorPatterns,
    recentActivity: summary.recentActivity,
  };
}

export function relatedLogs(entry: LogEntry, allRows: LogEntry[], limit = 8): LogEntry[] {
  const entryTime = new Date(entry.timestamp).getTime();
  const windowMs = 5 * 60 * 1000;

  return allRows
    .filter((r) => {
      if (r.id === entry.id) return false;
      if (r.app !== entry.app) return false;
      if (entry.requestId && r.requestId === entry.requestId) return true;
      return Math.abs(new Date(r.timestamp).getTime() - entryTime) <= windowMs;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function filterLogRows(
  rows: LogEntry[],
  opts: {
    app: LogEntry["app"] | "all";
    search: string;
    level: LogEntry["level"] | "ALL";
    stream: "stdout" | "stderr" | "all";
  },
): LogEntry[] {
  const query = parseSearchQuery(opts.search);

  return rows.filter((row) => {
    if (opts.app !== "all" && row.app !== opts.app) return false;
    if (opts.level !== "ALL" && row.level !== opts.level) return false;
    if (opts.stream !== "all" && row.stream !== opts.stream) return false;
    if (query.app && row.app !== query.app) return false;
    if (query.level && row.level.toLowerCase() !== query.level) return false;
    if (query.terms.length > 0 && !matchesSearchTerms(row, query.terms)) return false;
    return true;
  });
}

function parseSearchQuery(input: string): { app?: string; level?: string; terms: string[] } {
  const tokens = input.trim().toLowerCase().match(/"[^"]+"|\S+/g) ?? [];
  const terms: string[] = [];
  let app: string | undefined;
  let level: string | undefined;

  for (const token of tokens) {
    const clean = token.replace(/^"|"$/g, "");
    if (clean.startsWith("app:")) {
      app = clean.slice(4);
      continue;
    }
    if (clean.startsWith("level:")) {
      level = clean.slice(6).toUpperCase() === "WARN" ? "warn" : clean.slice(6).toLowerCase();
      continue;
    }
    terms.push(clean);
  }

  return { app, level, terms };
}

function matchesSearchTerms(row: LogEntry, terms: string[]): boolean {
  const details = extractLogDetails(row, true);
  const contextValues = Object.entries(details.context).flatMap(([key, value]) => [key, value]);
  const statusCode = details.http.status != null ? String(details.http.status) : "";
  const endpoint = details.http.path ?? "";
  const userContext = contextValues.filter((value) => /user|userid|user_id|subject|sub/i.test(value));
  const haystack = [
    row.message,
    row.rawPayload,
    row.requestId ?? "",
    row.app,
    row.level,
    row.revision,
    row.replica,
    row.stream,
    endpoint,
    statusCode,
    ...contextValues,
    ...userContext,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}
