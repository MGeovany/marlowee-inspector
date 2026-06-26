import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, clampRange, highestRole } from "@/lib/authz";
import { queryLogAnalyticsTable } from "@/lib/log-analytics";
import { maskString } from "@/lib/masking";
import { parseQueryTimeWindow, SinceUntilParams } from "@/lib/api-params";
import { effectiveQueryRange, logsPerMinute } from "@/lib/query-time";
import { ALLOWED_APPS, buildLogsSummaryQuery } from "@/lib/queries";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { TIME_RANGE_MS, type ContainerApp, type LogEntry, type LogLevel, type LogsSummaryResponse, type ErrorPatternSummary } from "@/lib/types";

const QuerySchema = z.object({
  app: z.enum(ALLOWED_APPS).optional(),
  timeRange: z.enum(["1h", "24h", "7d"]).default("24h"),
}).merge(SinceUntilParams);

const LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO", "LOG"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const actor = session.user.email ?? null;
  const oid = session.user.oid ?? null;
  const role = highestRole(session.user.roles);
  const caps = capabilitiesFor(session.user.roles);
  if (!caps || !role) {
    audit({ type: "denied", actor, oid, role: null, reason: "no valid app role" });
    return NextResponse.json({ error: "forbidden: no role assigned" }, { status: 403 });
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const requestedApp = parsed.data.app;
  const timeRange = clampRange(caps, parsed.data.timeRange);
  const apps = requestedApp ? [requestedApp] : allowedAppsForRole(caps.apps);

  let timeWindow;
  try {
    timeWindow = parseQueryTimeWindow(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid time window" },
      { status: 400 },
    );
  }

  const queryRange = effectiveQueryRange(timeRange, timeWindow ?? {});

  if (requestedApp && !canReadApp(caps, requestedApp)) {
    audit({ type: "denied", actor, oid, role, app: requestedApp, reason: "app not permitted for role" });
    return NextResponse.json({ error: "forbidden: app not permitted" }, { status: 403 });
  }
  if (apps.length === 0) {
    audit({ type: "denied", actor, oid, role, reason: "no permitted apps" });
    return NextResponse.json({ error: "forbidden: no permitted apps" }, { status: 403 });
  }

  const rl = rateLimit(oid ?? actor ?? "anon", caps.rateLimitPerMinute);
  if (!rl.allowed) {
    audit({ type: "rate_limited", actor, oid, role, app: requestedApp });
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const kql = buildLogsSummaryQuery({ apps, range: queryRange, timeWindow });
    const table = await queryLogAnalyticsTable(kql, queryRange);
    const summary = normalizeSummaryTable(
      table?.columnNames ?? [],
      table?.rows ?? [],
      apps,
      timeRange,
      timeWindow,
    );

    audit({
      type: "search",
      actor,
      oid,
      role,
      app: requestedApp,
      range: timeRange,
      rowCount: summary.totalLogs,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error("Log Analytics summary query failed", err);
    return NextResponse.json({ error: "summary query failed" }, { status: 502 });
  }
}

function allowedAppsForRole(apps: string[]): ContainerApp[] {
  return apps.filter((app): app is ContainerApp => (ALLOWED_APPS as readonly string[]).includes(app));
}

function normalizeSummaryTable(
  columnNames: string[],
  rows: unknown[][],
  apps: ContainerApp[],
  timeRange: LogsSummaryResponse["timeRange"],
  timeWindow?: { since?: string; until?: string },
): LogsSummaryResponse {
  const index = (name: string) => columnNames.findIndex((column) => column === name);
  const columns = {
    kind: index("Kind"),
    key: index("Key"),
    count: index("Count"),
    totalLogs: index("TotalLogs"),
    errorsCount: index("ErrorsCount"),
    warningsCount: index("WarningsCount"),
    lastLogTimestamp: index("LastLogTimestamp"),
    app: index("App"),
    level: index("Level"),
    timeGenerated: index("TimeGenerated"),
    message: index("Message"),
    revision: index("Revision"),
    replica: index("Replica"),
    stream: index("Stream"),
  };

  const errorsByApp: Partial<Record<ContainerApp, number>> = Object.fromEntries(
    apps.map((app) => [app, 0]),
  ) as Partial<Record<ContainerApp, number>>;
  const logsByLevel: Partial<Record<LogLevel, number>> = Object.fromEntries(
    LEVELS.map((level) => [level, 0]),
  ) as Partial<Record<LogLevel, number>>;

  let totalLogs = 0;
  let errorsCount = 0;
  let warningsCount = 0;
  let mostNoisyApp: ContainerApp | null = null;
  let mostNoisyAppCount = 0;
  let latestError: LogEntry | null = null;
  let latestWarning: LogEntry | null = null;
  let lastLogTimestamp: string | null = null;
  let latestErrors: LogEntry[] = [];
  const errorPatterns: ErrorPatternSummary[] = [];
  let recentActivity: LogEntry[] = [];

  for (const row of rows) {
    const kind = cell(row, columns.kind);
    const key = cell(row, columns.key);

    if (kind === "totals") {
      totalLogs = numberCell(row, columns.totalLogs);
      errorsCount = numberCell(row, columns.errorsCount);
      warningsCount = numberCell(row, columns.warningsCount);
      lastLogTimestamp = dateCell(row, columns.lastLogTimestamp);
      continue;
    }

    if (kind === "errorsByApp" && isContainerApp(key)) {
      errorsByApp[key] = numberCell(row, columns.count);
      continue;
    }

    if (kind === "logsByLevel" && isLogLevel(key)) {
      logsByLevel[key] = numberCell(row, columns.count);
      continue;
    }

    if (kind === "mostNoisyApp" && isContainerApp(key)) {
      mostNoisyApp = key;
      mostNoisyAppCount = numberCell(row, columns.count);
      continue;
    }

    if (kind === "latestError") latestError = logEntryFromRow(row, columns, "latest-error");
    if (kind === "latestWarning") latestWarning = logEntryFromRow(row, columns, "latest-warning");

    if (kind === "latestErrorRow") {
      const entry = logEntryFromRow(row, columns, key || "latest-error-row");
      if (entry) latestErrors.push(entry);
      continue;
    }

    if (kind === "recentActivity") {
      const entry = logEntryFromRow(row, columns, key || "recent-activity");
      if (entry) recentActivity.push(entry);
      continue;
    }

    if (kind === "errorPattern") {
      const pattern = errorPatternFromRow(row, columns, key);
      if (pattern) errorPatterns.push(pattern);
    }
  }

  latestErrors.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  recentActivity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  errorPatterns.sort((a, b) => b.count - a.count);

  // Dedup: KQL union branches can return the same log row multiple times
  latestErrors = dedupById(latestErrors);
  recentActivity = dedupById(recentActivity);

  return {
    totalLogs,
    errorsCount,
    warningsCount,
    logsPerMinute: timeWindow?.since
      ? logsPerMinute(totalLogs, timeWindow)
      : roundOneDecimal(totalLogs / (TIME_RANGE_MS[timeRange] / 60_000)),
    mostNoisyApp,
    mostNoisyAppCount,
    latestError,
    latestWarning,
    latestErrors,
    errorPatterns,
    recentActivity,
    errorsByApp,
    logsByLevel,
    lastLogTimestamp,
    apps,
    timeRange,
    source: "azure",
    timeWindow: timeWindow ?? null,
  };
}

function errorPatternFromRow(
  row: unknown[],
  columns: Record<string, number>,
  key: string,
): ErrorPatternSummary | null {
  const sample = logEntryFromRow(row, columns, key || "error-pattern");
  if (!sample) return null;

  const separator = key.indexOf("|");
  const label = separator >= 0 ? key.slice(separator + 1) : sample.message.split("\n")[0].slice(0, 56);

  return {
    key: key || `${sample.app}:${label}`,
    label,
    app: sample.app,
    count: numberCell(row, columns.count),
    sample,
  };
}

function logEntryFromRow(
  row: unknown[],
  columns: Record<string, number>,
  fallbackId: string,
): LogEntry | null {
  const app = cell(row, columns.app);
  if (!isContainerApp(app)) return null;

  const timestamp = dateCell(row, columns.timeGenerated);
  if (!timestamp) return null;

  const message = maskString(cell(row, columns.message));
  const rawPayload = maskString(cell(row, columns.message));
  const revision = cell(row, columns.revision);
  const replica = cell(row, columns.replica);

  return {
    id: `${app}:${fallbackId}:${revision}:${replica}:${timestamp}`,
    timestamp,
    app,
    level: isLogLevel(cell(row, columns.level)) ? (cell(row, columns.level) as LogLevel) : "LOG",
    stream: cell(row, columns.stream).toLowerCase() === "stderr" ? "stderr" : "stdout",
    message,
    revision,
    replica,
    rawPayload,
  };
}

function cell(row: unknown[], index: number): string {
  if (index < 0) return "";
  const value = row[index];
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function dateCell(row: unknown[], index: number): string | null {
  const value = cell(row, index);
  return value ? value : null;
}

function numberCell(row: unknown[], index: number): number {
  const value = Number(cell(row, index));
  return Number.isFinite(value) ? value : 0;
}

function dedupById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function isContainerApp(value: string): value is ContainerApp {
  return (ALLOWED_APPS as readonly string[]).includes(value);
}

function isLogLevel(value: string): value is LogLevel {
  return (LEVELS as readonly string[]).includes(value);
}
