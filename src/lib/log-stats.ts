import { TIME_RANGE_MS, type ContainerApp, type LogEntry, type TimeRange } from "./types";

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
  warnings: number;
  logsPerMin: number;
  activeApps: number;
  lastError: LogEntry | null;
  queryLatencyMs: number;
}

export interface RecentSignals {
  latestErrors: LogEntry[];
  spikeDetected: boolean;
  spikeDetail: string | null;
  noisiestApp: ContainerApp | null;
  noisiestCount: number;
  lastRevision: { app: ContainerApp; revision: string; time: string } | null;
  recentWarnings: LogEntry[];
}

export function appHealth(errors: number, warnings: number): AppHealth {
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "healthy";
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

export function computeSummary(
  rows: LogEntry[],
  timeRange: TimeRange,
  queryLatencyMs: number,
): DashboardSummary {
  const errors = rows.filter((r) => r.level === "ERROR");
  const warnings = rows.filter((r) => r.level === "WARN");
  const rangeMs = TIME_RANGE_MS[timeRange];
  const logsPerMin = rangeMs > 0 ? Math.round((rows.length / rangeMs) * 60_000) : 0;
  const activeApps = new Set(rows.map((r) => r.app)).size;
  const lastError = errors.sort((a, b) => b.timeGenerated.localeCompare(a.timeGenerated))[0] ?? null;

  return {
    openErrors: errors.length,
    warnings: warnings.length,
    logsPerMin,
    activeApps,
    lastError,
    queryLatencyMs,
  };
}

export function computeSignals(rows: LogEntry[], timeRange: TimeRange): RecentSignals {
  const sorted = [...rows].sort((a, b) => b.timeGenerated.localeCompare(a.timeGenerated));
  const errors = sorted.filter((r) => r.level === "ERROR");
  const warnings = sorted.filter((r) => r.level === "WARN");

  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = sorted.filter((r) => now - new Date(r.timeGenerated).getTime() <= windowMs);
  const prior = sorted.filter((r) => {
    const age = now - new Date(r.timeGenerated).getTime();
    return age > windowMs && age <= windowMs * 2;
  });
  const spikeDetected = prior.length > 0 && recent.length >= prior.length * 2 && recent.length >= 8;
  const spikeDetail = spikeDetected
    ? `${recent.length} logs in last 15m vs ${prior.length} in prior 15m`
    : null;

  const counts = new Map<ContainerApp, number>();
  for (const r of rows) counts.set(r.app, (counts.get(r.app) ?? 0) + 1);
  let noisiestApp: ContainerApp | null = null;
  let noisiestCount = 0;
  for (const [app, count] of counts) {
    if (count > noisiestCount) {
      noisiestApp = app;
      noisiestCount = count;
    }
  }

  const latest = sorted[0];
  const lastRevision = latest
    ? { app: latest.app, revision: latest.revision, time: latest.timeGenerated }
    : null;

  return {
    latestErrors: errors.slice(0, 5),
    spikeDetected,
    spikeDetail,
    noisiestApp,
    noisiestCount,
    lastRevision,
    recentWarnings: warnings.slice(0, 5),
  };
}

export function relatedLogs(entry: LogEntry, allRows: LogEntry[], limit = 8): LogEntry[] {
  const entryTime = new Date(entry.timeGenerated).getTime();
  const windowMs = 5 * 60 * 1000;

  return allRows
    .filter((r) => {
      if (r.id === entry.id) return false;
      if (r.app !== entry.app) return false;
      if (entry.requestId && r.requestId === entry.requestId) return true;
      return Math.abs(new Date(r.timeGenerated).getTime() - entryTime) <= windowMs;
    })
    .sort((a, b) => b.timeGenerated.localeCompare(a.timeGenerated))
    .slice(0, limit);
}

export function filterLogRows(
  rows: LogEntry[],
  opts: {
    app: ContainerApp | null;
    search: string;
    level: LogEntry["level"] | "ALL";
    stream: "stdout" | "stderr" | "all";
    errorsOnly: boolean;
    requestId: string;
  },
): LogEntry[] {
  const search = opts.search.trim().toLowerCase();
  const reqId = opts.requestId.trim().toLowerCase();

  return rows.filter((row) => {
    if (opts.app && row.app !== opts.app) return false;
    if (opts.errorsOnly && row.level !== "ERROR") return false;
    if (!opts.errorsOnly && opts.level !== "ALL" && row.level !== opts.level) return false;
    if (opts.stream !== "all" && row.stream !== opts.stream) return false;
    if (search && !row.message.toLowerCase().includes(search)) return false;
    if (reqId) {
      const rid = row.requestId?.toLowerCase() ?? "";
      if (!rid.includes(reqId) && !row.message.toLowerCase().includes(reqId)) return false;
    }
    return true;
  });
}
