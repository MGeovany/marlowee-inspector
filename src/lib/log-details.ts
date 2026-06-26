import { parseLog } from "./parsers";
import type { LogEntry } from "./types";

export interface LogHttpInfo {
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
}

export interface LogTraceInfo {
  traceId?: string;
  spanId?: string;
}

export interface MaskedField {
  key: string;
  value: string;
}

export interface LogDetails {
  http: LogHttpInfo;
  context: Record<string, string>;
  trace: LogTraceInfo;
  maskedFields: MaskedField[];
  formattedRaw: string;
}

const PII_KEYS = new Set([
  "email",
  "user_id",
  "userid",
  "authorization",
  "ip",
  "phone",
  "ssn",
  "token",
  "api_key",
  "password",
]);

const HTTP_VERB = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i;
const HTTP_ROUTE = /\/[\w\-./{}:?&=%]+/;
const STATUS_CODE = /\b([45]\d{2})\b/;
const LATENCY_MS = /(\d+)\s*ms\b/i;
const LATENCY_SEC = /after\s+(\d+)s\b/i;

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value as Record<string, unknown>, path));
    } else if (value != null) {
      out[path] = String(value);
    }
  }
  return out;
}

function parseHttpFromMessage(message: string): LogHttpInfo {
  const http: LogHttpInfo = {};
  const verbMatch = message.match(HTTP_VERB);
  const routeMatch = message.match(HTTP_ROUTE);

  if (verbMatch) http.method = verbMatch[1].toUpperCase();
  if (routeMatch) http.path = routeMatch[0];

  const statusMatch = message.match(STATUS_CODE);
  if (statusMatch) http.status = Number(statusMatch[1]);

  const msMatch = message.match(LATENCY_MS);
  if (msMatch) {
    http.latencyMs = Number(msMatch[1]);
  } else {
    const secMatch = message.match(LATENCY_SEC);
    if (secMatch) http.latencyMs = Number(secMatch[1]) * 1000;
  }

  return http;
}

function mergeHttp(base: LogHttpInfo, extra: LogHttpInfo): LogHttpInfo {
  return {
    method: extra.method ?? base.method,
    path: extra.path ?? base.path,
    status: extra.status ?? base.status,
    latencyMs: extra.latencyMs ?? base.latencyMs,
  };
}

function isPiiKey(key: string): boolean {
  const leaf = key.split(".").pop()?.toLowerCase() ?? key.toLowerCase();
  return PII_KEYS.has(leaf) || key.toLowerCase().includes("authorization");
}

function maskValue(key: string, value: string): string {
  const leaf = key.split(".").pop()?.toLowerCase() ?? "";
  if (leaf === "email" && value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 1)}******@${domain}`;
  }
  if (leaf === "ip" || leaf === "ip_address") {
    const parts = value.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (leaf === "authorization" || leaf === "token" || leaf === "api_key") {
    return value.startsWith("Bearer ") ? "Bearer ************" : `${value.slice(0, 4)}******`;
  }
  if (value.length <= 8) return `${value.slice(0, 2)}******`;
  return `${value.slice(0, 8)}******${value.slice(-2)}`;
}

function collectMaskedFields(
  context: Record<string, string>,
  masked: boolean,
): MaskedField[] {
  const fields: MaskedField[] = [];
  for (const [key, value] of Object.entries(context)) {
    if (!isPiiKey(key)) continue;
    fields.push({
      key,
      value: masked ? maskValue(key, value) : value,
    });
  }
  return fields;
}

/** Parses structured fields from rawPayload and message heuristics. */
export function extractLogDetails(entry: LogEntry, masked: boolean): LogDetails {
  let http: LogHttpInfo = parseHttpFromMessage(entry.message);
  let context: Record<string, string> = {};
  let trace: LogTraceInfo = {};
  let formattedRaw = entry.rawPayload;

  // Try per-app parser first (knows each app's JSON schema)
  const parsed = parseLog(entry);
  if (parsed.http) http = mergeHttp(http, parsed.http);
  if (parsed.trace) trace = parsed.trace;
  if (parsed.context) Object.assign(context, parsed.context);

  // Fallback: generic JSON parse for apps without explicit parser extraction
  if (!parsed.http || !parsed.trace || Object.keys(context).length === 0) {
    try {
      const json = JSON.parse(entry.rawPayload) as Record<string, unknown>;
      formattedRaw = JSON.stringify(json, null, 2);

      if (!parsed.http && json.http && typeof json.http === "object") {
        const h = json.http as Record<string, unknown>;
        http = mergeHttp(http, {
          method: h.method ? String(h.method).toUpperCase() : undefined,
          path: h.path ? String(h.path) : undefined,
          status: h.status != null ? Number(h.status) : undefined,
          latencyMs:
            h.latency_ms != null
              ? Number(h.latency_ms)
              : h.latencyMs != null
                ? Number(h.latencyMs)
                : undefined,
        });
      }

      if (Object.keys(context).length === 0) {
        if (json.context && typeof json.context === "object") {
          context = flattenObject(json.context as Record<string, unknown>, "context");
        }
        if (json.request && typeof json.request === "object") {
          const req = flattenObject(json.request as Record<string, unknown>, "request");
          Object.assign(context, req);
        }
      }

      if (!parsed.trace && json.trace && typeof json.trace === "object") {
        const t = json.trace as Record<string, unknown>;
        trace = {
          traceId: t.trace_id ? String(t.trace_id) : t.traceId ? String(t.traceId) : undefined,
          spanId: t.span_id ? String(t.span_id) : t.spanId ? String(t.spanId) : undefined,
        };
      }
    } catch {
      // plain-text payload — keep message-derived http only
    }
  }

  const maskedFields = collectMaskedFields(context, masked);

  return { http, context, trace, maskedFields, formattedRaw };
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function httpLine(http: LogHttpInfo): string | null {
  if (!http.method && !http.path) return null;
  return [http.method, http.path].filter(Boolean).join(" ");
}

export function statusLatencyLine(http: LogHttpInfo): string | null {
  if (http.status == null && http.latencyMs == null) return null;
  const status = http.status != null ? String(http.status) : "—";
  const latency = http.latencyMs != null ? `${http.latencyMs}ms` : "—";
  return `${status} · ${latency}`;
}
