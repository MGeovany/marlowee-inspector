import { createHash } from "node:crypto";

import { DefaultAzureCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query";
import type { TimeRange } from "./authz";
import {
  buildMetricsQuery,
  METRICS_BUCKET_COUNT,
  metricsBinMinutes,
} from "./queries";
import type { QueryTimeWindow } from "./query-time";
import { effectiveQueryRange } from "./query-time";
import { parseLog } from "./parsers";
import type { ContainerApp, LogEntry, LogLevel, LogMetricsResponse } from "./types";
import { TIME_RANGE_MS } from "./types";

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

  // A row's identity must be stable across polls. Using the positional index
  // is NOT stable: Log Analytics doesn't guarantee row order between identical
  // queries (and any new row shifts every index), so the same log would get a
  // fresh id each fetch and re-trigger "new error" notifications. Derive the id
  // from content instead, with a per-fetch counter only to disambiguate rows
  // that are byte-for-byte identical at the same timestamp.
  const occurrences = new Map<string, number>();
  return table.rows.map((row) => {
    const timestamp = timestampAt(row, cTime);
    const streamRaw = at(row, cStream).toLowerCase();
    const stream: LogEntry["stream"] =
      streamRaw === "stderr" ? "stderr" : streamRaw === "system" ? "system" : "stdout";
    const message = at(row, cMsg);
    const app = at(row, cApp) as ContainerApp;
    const revision = at(row, cRev);
    const replica = at(row, cReplica);
    const rawPayload = at(row, cRaw) || message;
    const contentKey = `${app}:${timestamp}:${revision}:${replica}:${stream}:${createHash("sha1")
      .update(rawPayload)
      .digest("hex")
      .slice(0, 16)}`;
    const seen = occurrences.get(contentKey) ?? 0;
    occurrences.set(contentKey, seen + 1);
    const entry: LogEntry = {
      id: seen === 0 ? contentKey : `${contentKey}#${seen}`,
      timestamp,
      app,
      level: normalizeLevel(at(row, cLevel) || "LOG"),
      message,
      revision,
      replica,
      stream,
      rawPayload,
    };
    // Per-app parser refines level from JSON payload and extracts extra fields
    const parsed = parseLog(entry);
    if (parsed.level) entry.level = parsed.level;
    return entry;
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

function numberCell(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function padSeries(values: number[], size: number): number[] {
  if (values.length >= size) return values.slice(-size);
  return [...Array(size - values.length).fill(0), ...values];
}

function deltaPct(recent: number, prior: number): number | null {
  if (prior === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prior) / prior) * 100);
}

function deltaFromSeries(values: number[]): number | null {
  const mid = Math.floor(values.length / 2);
  const recent = values.slice(mid).reduce((sum, v) => sum + v, 0);
  const prior = values.slice(0, mid).reduce((sum, v) => sum + v, 0);
  return deltaPct(recent, prior);
}

function deltaFromAverages(values: number[]): number | null {
  const mid = Math.floor(values.length / 2);
  const recent = values.slice(mid).filter((v) => v > 0);
  const prior = values.slice(0, mid).filter((v) => v > 0);
  const recentAvg =
    recent.length > 0 ? recent.reduce((sum, v) => sum + v, 0) / recent.length : 0;
  const priorAvg =
    prior.length > 0 ? prior.reduce((sum, v) => sum + v, 0) / prior.length : 0;
  return deltaPct(recentAvg, priorAvg);
}

/**
 * Runs a bucketed KQL aggregate against Log Analytics for dashboard sparklines.
 * Unlike /api/logs, this scans the full time window (no row cap).
 */
export async function queryMetrics(
  apps: ContainerApp[],
  range: TimeRange,
  timeWindow?: QueryTimeWindow,
): Promise<LogMetricsResponse> {
  const queryRange = effectiveQueryRange(range, timeWindow ?? {});
  const kql = buildMetricsQuery({ apps, range: queryRange, timeWindow });
  const table = await queryLogAnalyticsTable(kql, queryRange);
  if (!table) {
    return emptyMetrics(queryRange);
  }

  const idx = (name: string) => table.columnNames.findIndex((c) => c === name);
  const cKind = idx("Kind");
  const cErrors = idx("Errors");
  const cWarnings = idx("Warnings");
  const cLogs = idx("Logs");
  const cAvgLatency = idx("AvgLatencyMs");
  const cActiveIncidents = idx("ActiveIncidents");
  const cOpenErrors = idx("OpenErrors");
  const cTotalLogs = idx("TotalLogs");
  const cAvgResponse = idx("AvgResponseMs");

  const bucketRows = table.rows.filter((row) => stringifyCell(row[cKind]) === "bucket");
  const totalsRow = table.rows.find((row) => stringifyCell(row[cKind]) === "totals");

  const binMinutes = metricsBinMinutes(queryRange);
  const errorsSeries = padSeries(
    bucketRows.map((row) => numberCell(row[cErrors])),
    METRICS_BUCKET_COUNT,
  );
  const warningsSeries = padSeries(
    bucketRows.map((row) => numberCell(row[cWarnings])),
    METRICS_BUCKET_COUNT,
  );
  const totalLogsSeries = padSeries(
    bucketRows.map((row) => numberCell(row[cLogs])),
    METRICS_BUCKET_COUNT,
  );
  const activeIncidentsSeries = padSeries(
    bucketRows.map((row) => numberCell(row[cActiveIncidents])),
    METRICS_BUCKET_COUNT,
  );
  const logsPerMinSeries = padSeries(
    bucketRows.map((row) => Math.round(numberCell(row[cLogs]) / binMinutes)),
    METRICS_BUCKET_COUNT,
  );
  const avgResponseSeries = padSeries(
    bucketRows.map((row) => Math.round(numberCell(row[cAvgLatency]))),
    METRICS_BUCKET_COUNT,
  );

  const rangeMs = TIME_RANGE_MS[queryRange];
  const totalLogs = totalsRow ? numberCell(totalsRow[cTotalLogs]) : 0;
  const openErrors = totalsRow ? numberCell(totalsRow[cOpenErrors]) : 0;
  const activeIncidents = totalsRow ? numberCell(totalsRow[cActiveIncidents]) : 0;
  const avgResponseMs = totalsRow ? Math.round(numberCell(totalsRow[cAvgResponse])) : 0;
  const logsPerMin = rangeMs > 0 ? Math.round((totalLogs / rangeMs) * 60_000) : 0;

  return {
    range: queryRange,
    source: "azure",
    openErrors,
    activeIncidents,
    logsPerMin,
    avgResponseMs,
    openErrorsDeltaPct: deltaFromSeries(errorsSeries),
    avgResponseDeltaPct: deltaFromAverages(avgResponseSeries),
    sparklines: {
      openErrors: errorsSeries,
      activeIncidents: activeIncidentsSeries,
      logsPerMin: logsPerMinSeries,
      avgResponse: avgResponseSeries,
      totalLogs: totalLogsSeries,
      warnings: warningsSeries,
    },
  };
}

function emptyMetrics(range: TimeRange): LogMetricsResponse {
  const zeros = Array.from({ length: METRICS_BUCKET_COUNT }, () => 0);
  return {
    range,
    source: "azure",
    openErrors: 0,
    activeIncidents: 0,
    logsPerMin: 0,
    avgResponseMs: 0,
    openErrorsDeltaPct: null,
    avgResponseDeltaPct: null,
    sparklines: {
      openErrors: zeros,
      activeIncidents: zeros,
      logsPerMin: zeros,
      avgResponse: zeros,
      totalLogs: zeros,
      warnings: zeros,
    },
  };
}
