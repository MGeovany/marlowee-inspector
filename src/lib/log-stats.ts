import { TIME_RANGE_MS, type ContainerApp, type LogEntry, type LogMetricsResponse, type TimeRange } from "./types";
import { extractLogDetails } from "./log-details";

export type AppHealth = "healthy" | "warning" | "error";

export interface AppStats {
  app: ContainerApp;
  total: number;
  errors: number;
  warnings: number;
  health: AppHealth;
}

export interface DashboardSummary {
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
  };
}

const SPARKLINE_BUCKETS = 14;

function bucketSeries(
  rows: LogEntry[],
  rangeMs: number,
  bucketCount: number,
  match?: (row: LogEntry) => boolean,
): number[] {
  const now = Date.now();
  const buckets = Array.from({ length: bucketCount }, () => 0);

  for (const row of rows) {
    if (match && !match(row)) continue;
    const age = now - new Date(row.timestamp).getTime();
    if (age < 0 || age > rangeMs) continue;
    const idx = Math.min(bucketCount - 1, Math.floor((1 - age / rangeMs) * bucketCount));
    buckets[idx]++;
  }

  return buckets;
}

function deltaPct(recent: number, prior: number): number | null {
  if (prior === 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prior) / prior) * 100);
}

function splitWindowCounts(
  rows: LogEntry[],
  rangeMs: number,
  match?: (row: LogEntry) => boolean,
): { recent: number; prior: number } {
  const now = Date.now();
  const half = rangeMs / 2;
  let recent = 0;
  let prior = 0;

  for (const row of rows) {
    if (match && !match(row)) continue;
    const age = now - new Date(row.timestamp).getTime();
    if (age < 0 || age > rangeMs) continue;
    if (age <= half) recent++;
    else prior++;
  }

  return { recent, prior };
}

function countErrorGroups(errors: LogEntry[]): number {
  const keys = new Set(errors.map((e) => `${e.app}:${normalizeErrorLabel(e.message)}`));
  return keys.size;
}

function bucketActiveIncidents(rows: LogEntry[], rangeMs: number, bucketCount: number): number[] {
  const now = Date.now();
  const buckets: Set<string>[] = Array.from({ length: bucketCount }, () => new Set());

  for (const row of rows) {
    if (row.level !== "ERROR") continue;
    const age = now - new Date(row.timestamp).getTime();
    if (age < 0 || age > rangeMs) continue;
    const idx = Math.min(bucketCount - 1, Math.floor((1 - age / rangeMs) * bucketCount));
    buckets[idx].add(`${row.app}:${normalizeErrorLabel(row.message)}`);
  }

  return buckets.map((s) => s.size);
}

export interface DetectedError {
  key: string;
  label: string;
  app: ContainerApp;
  count: number;
  trend: "up" | "down" | "stable";
  sample: LogEntry;
}

export interface LatestIncident {
  id: string;
  severity: "SEV-2" | "SEV-3";
  status: "INVESTIGATING" | "MONITORING" | "RESOLVED";
  title: string;
  app: ContainerApp;
  sample: LogEntry;
}

export interface SidePanelData {
  latestIncidents: LatestIncident[];
  detectedErrors: DetectedError[];
  recentActivity: LogEntry[];
}

function normalizeErrorLabel(message: string): string {
  const line = message.split("\n")[0].trim();
  if (line.length <= 56) return line;
  return `${line.slice(0, 53)}…`;
}

export function appHealth(errors: number, warnings: number): AppHealth {
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "healthy";
}

/** Group errors by message pattern and build a recent activity feed. */
export function computeSidePanel(rows: LogEntry[]): SidePanelData {
  const errors = rows.filter((r) => r.level === "ERROR");
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;

  const groups = new Map<string, { label: string; app: ContainerApp; entries: LogEntry[] }>();
  for (const entry of errors) {
    const label = normalizeErrorLabel(entry.message);
    const key = `${entry.app}:${label}`;
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { label, app: entry.app, entries: [entry] });
  }

  const detectedErrors = [...groups.values()]
    .map(({ label, app, entries }) => {
      const recent = entries.filter((e) => now - new Date(e.timestamp).getTime() <= windowMs).length;
      const prior = entries.filter((e) => {
        const age = now - new Date(e.timestamp).getTime();
        return age > windowMs && age <= windowMs * 2;
      }).length;

      let trend: DetectedError["trend"] = "stable";
      if (recent > prior) trend = "up";
      else if (prior > 0 && recent < prior) trend = "down";

      const sample = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      return { key: `${app}:${label}`, label, app, count: entries.length, trend, sample };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recentActivity = [...rows]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  const latestIncidents: LatestIncident[] = detectedErrors.slice(0, 3).map((de, i) => ({
    id: `INC-${String(2840 + i + 1)}`,
    severity: de.count >= 8 ? "SEV-2" : "SEV-3",
    status:
      de.trend === "up" ? "INVESTIGATING" : de.trend === "down" ? "MONITORING" : "RESOLVED",
    title: de.label,
    app: de.app,
    sample: de.sample,
  }));

  return { latestIncidents, detectedErrors, recentActivity };
}

export function computeAppStats(rows: LogEntry[], app: ContainerApp): AppStats {
  const appRows = rows.filter((r) => r.app === app);
  const errors = appRows.filter((r) => r.level === "ERROR").length;
  const warnings = appRows.filter((r) => r.level === "WARN").length;
  return {
    app,
    total: appRows.length,
    errors,
    warnings,
    health: appHealth(errors, warnings),
  };
}

export function metricsToDashboardSummary(metrics: LogMetricsResponse): DashboardSummary {
  return {
    openErrors: metrics.openErrors,
    activeIncidents: metrics.activeIncidents,
    logsPerMin: metrics.logsPerMin,
    avgResponseMs: metrics.avgResponseMs,
    openErrorsDeltaPct: metrics.openErrorsDeltaPct,
    avgResponseDeltaPct: metrics.avgResponseDeltaPct,
    sparklines: metrics.sparklines,
  };
}

export function computeSummary(
  rows: LogEntry[],
  timeRange: TimeRange,
  queryLatencyMs: number,
  latencyHistory: number[] = [],
): DashboardSummary {
  const errors = rows.filter((r) => r.level === "ERROR");
  const rangeMs = TIME_RANGE_MS[timeRange];
  const logsPerMin = rangeMs > 0 ? Math.round((rows.length / rangeMs) * 60_000) : 0;

  const errorSplit = splitWindowCounts(rows, rangeMs, (r) => r.level === "ERROR");
  const openErrorsDeltaPct = deltaPct(errorSplit.recent, errorSplit.prior);

  const latencySeries =
    latencyHistory.length > 0 ? latencyHistory : [queryLatencyMs];
  const avgResponseMs = Math.round(
    latencySeries.reduce((a, b) => a + b, 0) / latencySeries.length,
  );
  const mid = Math.floor(latencySeries.length / 2);
  const recentLat = latencySeries.slice(mid);
  const priorLat = latencySeries.slice(0, mid);
  const recentAvg =
    recentLat.length > 0 ? recentLat.reduce((a, b) => a + b, 0) / recentLat.length : 0;
  const priorAvg =
    priorLat.length > 0 ? priorLat.reduce((a, b) => a + b, 0) / priorLat.length : 0;
  const avgResponseDeltaPct = deltaPct(recentAvg, priorAvg);

  return {
    openErrors: errors.length,
    activeIncidents: countErrorGroups(errors),
    logsPerMin,
    avgResponseMs,
    openErrorsDeltaPct,
    avgResponseDeltaPct,
    sparklines: {
      openErrors: bucketSeries(rows, rangeMs, SPARKLINE_BUCKETS, (r) => r.level === "ERROR"),
      activeIncidents: bucketActiveIncidents(rows, rangeMs, SPARKLINE_BUCKETS),
      logsPerMin: bucketSeries(rows, rangeMs, SPARKLINE_BUCKETS),
      avgResponse: latencySeries.slice(-SPARKLINE_BUCKETS),
    },
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
    app: ContainerApp | "all";
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
