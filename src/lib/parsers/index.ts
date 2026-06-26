import type { LogEntry, LogLevel } from "../types";

export interface ParsedLog {
  level?: LogLevel;
  http?: { method?: string; path?: string; status?: number; latencyMs?: number };
  trace?: { traceId?: string; spanId?: string };
  context?: Record<string, string>;
}

type Parser = (entry: LogEntry, json: Record<string, unknown> | null) => ParsedLog;

import { parseDataApi } from "./ca-data-api";
import { parseDashboard } from "./ca-dashboard";
import { parseOnboarding } from "./ca-onboarding";
import { parseAdmin } from "./ca-admin";

const registry: Record<string, Parser> = {
  "ca-data-api": parseDataApi,
  "ca-dashboard": parseDashboard,
  "ca-onboarding": parseOnboarding,
  "ca-admin": parseAdmin,
};

export function parseLog(entry: LogEntry): ParsedLog {
  const parser = registry[entry.app];
  if (!parser) return {};
  let json: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(entry.rawPayload);
    json = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {}
  return parser(entry, json);
}

/** Extract level from common structured-logging JSON fields. */
export function levelFromJson(json: Record<string, unknown>): LogLevel | undefined {
  const candidates = [
    json.level,
    json["log.level"],
    json["@l"],
    json.severity,
    json.log_level,
    (json as Record<string, unknown>)["log_level"],
  ];
  for (const val of candidates) {
    if (typeof val === "string") {
      const upper = val.toUpperCase();
      if (["ERROR", "FATAL"].includes(upper)) return "ERROR";
      if (["WARN", "WARNING"].includes(upper)) return "WARN";
      if (upper === "INFO") return "INFO";
      if (upper === "DEBUG") return "DEBUG";
    }
  }
  return undefined;
}

/** Extract http fields from common structured-logging JSON shapes. */
export function httpFromJson(json: Record<string, unknown>): {
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
} | undefined {
  const http = json.http ?? json.Http ?? json.request;
  if (!http || typeof http !== "object") return undefined;
  const h = http as Record<string, unknown>;
  const method = typeof h.method === "string" ? h.method.toUpperCase() : undefined;
  const path = typeof h.path === "string" ? h.path : typeof h.url === "string" ? h.url : undefined;
  const status = typeof h.status === "number" ? h.status : typeof h.status_code === "number" ? h.status_code : undefined;
  const latencyMs =
    typeof h.latency_ms === "number"
      ? h.latency_ms
      : typeof h.latencyMs === "number"
        ? h.latencyMs
        : typeof h.duration_ms === "number"
          ? h.duration_ms
          : undefined;
  if (!method && !path && !status) return undefined;
  return { method, path, status, latencyMs };
}

/** Extract trace fields from common structured-logging JSON shapes. */
export function traceFromJson(json: Record<string, unknown>): {
  traceId?: string;
  spanId?: string;
} | undefined {
  const trace = json.trace ?? json.Trace ?? json.Traceparent;
  if (trace && typeof trace === "object") {
    const t = trace as Record<string, unknown>;
    const traceId = typeof t.trace_id === "string" ? t.trace_id : typeof t.traceId === "string" ? t.traceId : undefined;
    const spanId = typeof t.span_id === "string" ? t.span_id : typeof t.spanId === "string" ? t.spanId : undefined;
    if (traceId || spanId) return { traceId, spanId };
  }
  const traceparent = json.traceparent ?? json.trace_parent;
  if (typeof traceparent === "string") {
    const parts = traceparent.split("-");
    if (parts.length >= 2) return { traceId: parts[1], spanId: parts.length > 2 ? parts[2] : undefined };
  }
  return undefined;
}

/** Extract flat context from JSON, excluding known structural keys. */
const SKIP_KEYS = new Set(["level", "log.level", "@l", "severity", "log_level", "message", "@m", "http", "Http", "request", "trace", "Trace", "Traceparent", "traceparent", "trace_parent", "timestamp", "@t", "exception", "@x"]);
export function contextFromJson(json: Record<string, unknown>): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [key, value] of Object.entries(json)) {
    if (SKIP_KEYS.has(key)) continue;
    if (value == null) continue;
    if (typeof value === "object") {
      ctx[key] = JSON.stringify(value);
    } else {
      ctx[key] = String(value);
    }
  }
  return ctx;
}
