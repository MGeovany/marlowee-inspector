/**
 * Server-side redaction of sensitive data. Applied to EVERY row before it leaves the server,
 * unless an Admin explicitly requests raw mode (which is audited).
 *
 * The pattern set is intentionally conservative and meant to evolve (see plan §14). Never rely
 * on masking alone for the most sensitive surfaces.
 */

interface Rule {
  name: string;
  re: RegExp;
  replace: string;
}

const RULES: Rule[] = [
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replace: "[REDACTED:jwt]" },
  { name: "bearer", re: /Bearer\s+[A-Za-z0-9._~+/=-]+/gi, replace: "Bearer [REDACTED]" },
  { name: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replace: "[REDACTED:email]" },
  { name: "aws_key", re: /AKIA[0-9A-Z]{16}/g, replace: "[REDACTED:aws-key]" },
  { name: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g, replace: "[REDACTED:ssn]" },
  { name: "credit_card", re: /\b(?:\d[ -]*?){13,16}\b/g, replace: "[REDACTED:card]" },
  // key-value secrets: password / secret / token / apikey / api_key followed by a value
  {
    name: "kv_secret",
    re: /\b(password|passwd|secret|token|api[_-]?key|client[_-]?secret|authorization)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    replace: '$1=[REDACTED]',
  },
  // long base64-ish blobs (potential secrets) — kept last to avoid clobbering the above
  { name: "long_secret", re: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, replace: "[REDACTED:secret]" },
];

export function maskString(input: string): string {
  let out = input;
  for (const rule of RULES) out = out.replace(rule.re, rule.replace);
  return out;
}

export interface MaskableRow {
  message: string;
  [k: string]: unknown;
}

export function maskRows<T extends MaskableRow>(rows: T[], raw: boolean): T[] {
  if (raw) return rows;
  return rows.map((r) => ({ ...r, message: maskString(r.message) }));
}
