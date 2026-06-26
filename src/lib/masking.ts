import type { LogEntry } from "./types";

/**
 * Server-side redaction of sensitive data. Applied to every log row before it leaves the server.
 * There is intentionally no raw bypass yet; placeholders must be treated as sensitive data.
 */

interface Rule {
  name: string;
  re: RegExp;
  replace: string;
}

const RULES: Rule[] = [
  {
    name: "authorization_header",
    re: /\b(authorization)\b\s*[:=]\s*(Bearer\s+[A-Za-z0-9._~+/=-]{8,}|"[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    replace: "$1: [REDACTED:authorization]",
  },
  {
    name: "bearer_token",
    re: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replace: "Bearer [REDACTED:token]",
  },
  {
    name: "jwt",
    re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replace: "[REDACTED:jwt]",
  },
  {
    name: "cookie_header",
    re: /\b(cookie|set-cookie)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\r\n;}]+)/gi,
    replace: "$1: [REDACTED:cookie]",
  },
  {
    name: "kv_secret",
    re: /\b(password|passwd|pwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    replace: "$1=[REDACTED:secret]",
  },
  {
    name: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replace: "[REDACTED:email]",
  },
  {
    name: "phone",
    re: /(?<!\w)(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?!\w)/g,
    replace: "[REDACTED:phone]",
  },
  {
    name: "uuid",
    re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    replace: "[REDACTED:id]",
  },
  {
    name: "long_hex_id",
    re: /\b[0-9a-f]{24,}\b/gi,
    replace: "[REDACTED:id]",
  },
  {
    name: "long_base64_like",
    re: /\b(?=[A-Za-z0-9+/=_-]{32,}\b)(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9+/=_-]{32,}\b/g,
    replace: "[REDACTED:secret]",
  },
];

export function maskString(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;
  for (const rule of RULES) out = out.replace(rule.re, rule.replace);
  return out;
}

export interface MaskableRow {
  message: string;
  rawPayload?: string;
  [k: string]: unknown;
}

export function maskLogEntry<T extends LogEntry>(row: T): T {
  return {
    ...row,
    message: maskString(row.message),
    rawPayload: maskString(row.rawPayload),
  };
}

export function maskRows<T extends { message: string; rawPayload?: string }>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    message: maskString(row.message),
    rawPayload: typeof row.rawPayload === "string" ? maskString(row.rawPayload) : row.rawPayload,
  }));
}
