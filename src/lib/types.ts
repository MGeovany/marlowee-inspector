/**
 * Shared domain types for the log viewer. These are the shapes the API returns
 * and the UI consumes; they are deliberately decoupled from the Azure SDK row
 * shape (see lib/log-analytics.ts).
 */

// ERROR/WARN/INFO/LOG are what the Azure level detection emits (see lib/queries.ts).
export type LogLevel = "ERROR" | "WARN" | "INFO" | "LOG" | "DEBUG";

export type ContainerApp = "ca-data-api" | "ca-dashboard" | "ca-onboarding" | "ca-admin";

export type TimeRange = "1h" | "24h" | "7d";

/** A single log line, enriched with the fields the detail sheet needs. */
export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  app: ContainerApp;
  level: LogLevel;
  message: string;
  revision: string; // e.g. ca-data-api--0007
  replica: string; // e.g. ca-data-api-7c9f6b8d4-abcde
  stream: "stdout" | "stderr";
  requestId?: string;
  /** Full raw log payload (structured JSON or plain text) shown in the detail sheet. */
  rawPayload: string;
}

/** Filter state owned by the client and sent to /api/logs. */
export interface LogFilters {
  app: ContainerApp;
  level: LogLevel | "ALL";
  search: string;
  timeRange: TimeRange;
  errorsOnly: boolean;
}

export interface LogsResponse {
  rows: LogEntry[];
  total: number;
  range: TimeRange;
  masked: boolean;
  source: "azure";
  timeWindow?: { since?: string; until?: string } | null;
}

/** Error pattern aggregate from Azure KQL (summary query). */
export interface ErrorPatternSummary {
  key: string;
  label: string;
  app: ContainerApp;
  count: number;
  sample: LogEntry;
}

export interface LogsSummaryResponse {
  totalLogs: number;
  errorsCount: number;
  warningsCount: number;
  logsPerMinute: number;
  mostNoisyApp: ContainerApp | null;
  mostNoisyAppCount: number;
  latestError: LogEntry | null;
  latestWarning: LogEntry | null;
  latestErrors: LogEntry[];
  errorPatterns: ErrorPatternSummary[];
  recentActivity: LogEntry[];
  errorsByApp: Partial<Record<ContainerApp, number>>;
  logsByLevel: Partial<Record<LogLevel, number>>;
  lastLogTimestamp: string | null;
  apps: ContainerApp[];
  timeRange: TimeRange;
  source: "azure";
  timeWindow?: { since?: string; until?: string } | null;
}

/** Time-bucketed metrics returned by /api/logs/metrics (Azure KQL aggregates). */
export interface LogMetricsResponse {
  range: TimeRange;
  source: "azure";
  openErrors: number;
  activeIncidents: number;
  logsPerMin: number;
  avgResponseMs: number;
  openErrorsDeltaPct: number | null;
  avgResponseDeltaPct: number | null;
  sparklines: {
    openErrors: number[];
    activeIncidents: number[];
    logsPerMin: number[];
    avgResponse: number[];
    totalLogs: number[];
    warnings: number[];
  };
}

// Levels offered in the filter dropdown — the set Azure detection produces.
export const LOG_LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "LOG"];
export const TIME_RANGES: TimeRange[] = ["1h", "24h", "7d"];
export const ALL_APPS: ContainerApp[] = ["ca-data-api", "ca-dashboard", "ca-onboarding", "ca-admin"];

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
};

export const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};
