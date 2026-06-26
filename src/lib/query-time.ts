import type { TimeRange } from "./types";
import { TIME_RANGE_MS } from "./types";

export interface QueryTimeWindow {
  since?: string;
  until?: string;
}

/** Pick the smallest SDK duration that covers the session window. */
export function effectiveQueryRange(range: TimeRange, window: QueryTimeWindow): TimeRange {
  if (!window.since) return range;

  const endMs = window.until ? new Date(window.until).getTime() : Date.now();
  const startMs = new Date(window.since).getTime();
  const spanMs = Math.max(0, endMs - startMs);

  if (spanMs <= TIME_RANGE_MS["1h"]) return "1h";
  if (spanMs <= TIME_RANGE_MS["24h"]) return "24h";
  return "7d";
}

export function sessionDurationMs(window: QueryTimeWindow, now = Date.now()): number {
  if (!window.since) return 0;
  const start = new Date(window.since).getTime();
  const end = window.until ? new Date(window.until).getTime() : now;
  return Math.max(0, end - start);
}

export function logsPerMinute(totalLogs: number, window: QueryTimeWindow, now = Date.now()): number {
  const durationMs = sessionDurationMs(window, now);
  if (durationMs <= 0) return 0;
  return Math.round((totalLogs / durationMs) * 60_000 * 10) / 10;
}

export function parseIsoDatetime(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
