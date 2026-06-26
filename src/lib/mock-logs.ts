import {
  type ContainerApp,
  type LogEntry,
  type LogLevel,
  type TimeRange,
  TIME_RANGE_MS,
} from "./types";

/**
 * Deterministic mock log dataset for the four container apps. Generated once at
 * module load with a seeded PRNG so IDs, timestamps and ordering are stable
 * across requests within a process (predictable pagination + detail view).
 *
 * This is the data source used while Azure Log Analytics is NOT connected
 * (see api/logs/route.ts). The shape mirrors what the real query will produce.
 */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Template {
  level: LogLevel;
  weight: number;
  /** Returns a message; `rng` lets templates vary their payload deterministically. */
  msg: (rng: () => number) => string;
  stream?: "stdout" | "stderr";
}

const ids = ["a1f3", "b7c2", "9d4e", "3e8a", "c5b1", "7f0d", "21ac", "ee90", "0b6f", "44d8"];
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
function reqId(rng: () => number): string {
  return `req_${pick(ids, rng)}${pick(ids, rng)}${pick(ids, rng)}`.toUpperCase();
}

function parseHttpFromMessage(message: string): {
  method?: string;
  path?: string;
  status?: number;
  latencyMs?: number;
} | null {
  const verb = message.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/i)?.[1]?.toUpperCase();
  const path = message.match(/\/[\w\-./{}:?&=%]+/)?.[0];
  const status = message.match(/\b([2345]\d{2})\b/)?.[1];
  const latencyMs = message.match(/(\d+)\s*ms\b/i)?.[1];
  if (!verb && !path && !status) return null;
  return {
    method: verb,
    path,
    status: status ? Number(status) : undefined,
    latencyMs: latencyMs ? Number(latencyMs) : undefined,
  };
}

function buildRawPayload(
  entry: Omit<LogEntry, "rawPayload">,
  rng: () => number,
): string {
  const http = parseHttpFromMessage(entry.message);
  const hasRequest = Boolean(entry.requestId);
  const payload: Record<string, unknown> = {
    timestamp: entry.timestamp,
    level: entry.level,
    container_app: entry.app,
    revision: entry.revision,
    replica: entry.replica,
    stream: entry.stream,
    message: entry.message,
  };

  if (entry.requestId) payload.request_id = entry.requestId;

  if (http) {
    payload.http = {
      method: http.method ?? "GET",
      path: http.path ?? "/",
      status: http.status ?? (entry.level === "ERROR" ? 500 : 200),
      latency_ms: http.latencyMs ?? Math.floor(rng() * 400 + 20),
    };
  } else if (entry.level === "ERROR") {
    payload.http = {
      method: "POST",
      path: "/v1/transactions",
      status: 500,
      latency_ms: Math.floor(rng() * 20000 + 10000),
    };
  }

  if (hasRequest || entry.level === "ERROR" || entry.level === "WARN") {
    payload.context = {
      user_id: `usr_${pick(ids, rng)}${pick(ids, rng)}`,
      email: `${pick(["j", "m", "a", "s"], rng)}******@savvly.com`,
      ip: `10.0.${Math.floor(rng() * 200 + 1)}.${Math.floor(rng() * 200 + 1)}`,
      region: pick(["westeurope", "eastus", "northeurope"], rng),
      tenant: "savvly-prod",
    };
    payload.request = {
      authorization: `Bearer sk_test_mock_[REDACTED]`,
    };
  }

  if (entry.level === "ERROR" || rng() > 0.7) {
    payload.trace = {
      trace_id: `${pick(ids, rng)}${pick(ids, rng)}${pick(ids, rng)}${pick(ids, rng)}`,
      span_id: `${pick(ids, rng)}${pick(ids, rng)}`,
    };
  }

  return JSON.stringify(payload, null, 2);
}

const TEMPLATES: Record<ContainerApp, Template[]> = {
  "ca-data-api": [
    { level: "INFO", weight: 8, msg: (r) => `GET /v1/accounts/${pick(ids, r)} 200 in ${Math.floor(r() * 80 + 5)}ms` },
    { level: "INFO", weight: 6, msg: (r) => `POST /v1/projections 201 in ${Math.floor(r() * 200 + 40)}ms` },
    { level: "INFO", weight: 4, msg: (r) => `db query took ${Math.floor(r() * 120 + 3)}ms (pool=${Math.floor(r() * 10 + 1)})` },
    { level: "WARN", weight: 3, msg: (r) => `slow query ${Math.floor(r() * 1500 + 800)}ms on table projections` },
    { level: "WARN", weight: 2, msg: () => `retry 2/3 calling pricing-service (timeout)` },
    { level: "ERROR", weight: 2, stream: "stderr", msg: () => `Unhandled SqlException: timeout expired after 30s on POST /v1/transactions` },
    { level: "ERROR", weight: 1, stream: "stderr", msg: () => `ValidationError: field "amount" must be a positive number` },
    { level: "INFO", weight: 2, msg: () => `authenticated user ops@savvly.com via service token` },
    { level: "DEBUG", weight: 2, msg: (r) => `cache miss key=acct:${pick(ids, r)} ttl=300` },
  ],
  "ca-dashboard": [
    { level: "INFO", weight: 8, msg: (r) => `rendered /dashboard for session ${pick(ids, r)} in ${Math.floor(r() * 60 + 10)}ms` },
    { level: "INFO", weight: 5, msg: () => `fetched widgets from ca-data-api (4 ok)` },
    { level: "WARN", weight: 3, msg: (r) => `widget "balance" took ${Math.floor(r() * 900 + 600)}ms to hydrate` },
    { level: "WARN", weight: 2, msg: () => `session token near expiry, refreshing` },
    { level: "ERROR", weight: 2, stream: "stderr", msg: () => `Failed to load chart data: 502 from upstream` },
    { level: "INFO", weight: 3, msg: () => `user marlon@savvly.com signed in` },
    { level: "DEBUG", weight: 2, msg: (r) => `feature flag new_charts=${r() > 0.5}` },
  ],
  "ca-onboarding": [
    { level: "INFO", weight: 7, msg: (r) => `KYC step ${Math.floor(r() * 4 + 1)}/4 completed for applicant ${pick(ids, r)}` },
    { level: "INFO", weight: 4, msg: () => `document uploaded: passport.pdf (1.2MB)` },
    { level: "WARN", weight: 3, msg: () => `OCR confidence low (0.62) on id-front, requesting re-upload` },
    { level: "WARN", weight: 2, msg: () => `applicant abandoned flow at step 3` },
    { level: "ERROR", weight: 2, stream: "stderr", msg: () => `KYC provider returned 429, backing off` },
    { level: "ERROR", weight: 1, stream: "stderr", msg: (r) => `failed to persist applicant ${pick(ids, r)}: tx rolled back` },
    { level: "DEBUG", weight: 2, msg: () => `webhook signature verified` },
  ],
  "ca-admin": [
    { level: "INFO", weight: 6, msg: () => `admin alice@savvly.com viewed audit log` },
    { level: "INFO", weight: 4, msg: (r) => `role changed: user ${pick(ids, r)} -> Developer by admin` },
    { level: "WARN", weight: 3, msg: () => `bulk export requested (12,400 rows)` },
    { level: "WARN", weight: 2, msg: () => `Authorization: Bearer eyJ...[REDACTED]` },
    { level: "ERROR", weight: 2, stream: "stderr", msg: () => `permission denied: non-admin attempted /admin/keys` },
    { level: "INFO", weight: 2, msg: () => `rotated api_key=sk_test_mock_[REDACTED] success` },
    { level: "DEBUG", weight: 2, msg: () => `config reloaded from key vault` },
  ],
};

function buildDataset(): LogEntry[] {
  const rng = mulberry32(0x5a771); // fixed seed → stable dataset
  const now = Date.now();
  const sevenDays = TIME_RANGE_MS["7d"];
  const apps = Object.keys(TEMPLATES) as ContainerApp[];
  const out: LogEntry[] = [];

  for (const app of apps) {
    const templates = TEMPLATES[app];
    const totalWeight = templates.reduce((s, t) => s + t.weight, 0);
    const count = 90;
    const rev = `${app}--${String(Math.floor(rng() * 40 + 1)).padStart(4, "0")}`;
    const replicaBase = `${app}-${pick(ids, rng)}${pick(ids, rng)}`;

    for (let i = 0; i < count; i++) {
      // weighted template pick
      let r = rng() * totalWeight;
      let tpl = templates[0];
      for (const t of templates) {
        r -= t.weight;
        if (r <= 0) {
          tpl = t;
          break;
        }
      }
      // bias timestamps toward the recent end so 1h/24h windows aren't empty
      const age = Math.pow(rng(), 2) * sevenDays;
      const ts = new Date(now - age).toISOString();
      const message = tpl.msg(rng);
      const requestId = tpl.level === "ERROR" || rng() > 0.6 ? reqId(rng) : undefined;

      const row: Omit<LogEntry, "rawPayload"> = {
        id: `${app}-${i.toString(36)}-${pick(ids, rng)}`,
        timestamp: ts,
        app,
        level: tpl.level,
        message,
        revision: rev,
        replica: `${replicaBase}-${pick(ids, rng)}`,
        stream: tpl.stream ?? "stdout",
        requestId,
      };

      out.push({
        ...row,
        rawPayload: buildRawPayload(row, rng),
      });
    }
  }

  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const DATASET = buildDataset();

export interface MockQuery {
  app: ContainerApp | string;
  range: TimeRange;
  search?: string;
  errorsOnly?: boolean;
  level?: LogLevel;
  stream?: "stdout" | "stderr" | "all";
  requestId?: string;
  limit?: number;
}

/** Filter the in-memory dataset the same way the KQL query would on the server. */
export function queryMockLogs(q: MockQuery): LogEntry[] {
  const cutoff = Date.now() - TIME_RANGE_MS[q.range];
  const search = q.search?.trim().toLowerCase();
  const requestId = q.requestId?.trim().toLowerCase();
  const limit = Math.min(q.limit ?? 200, 1000);

  return DATASET.filter((row) => {
    if (row.app !== q.app) return false;
    if (new Date(row.timestamp).getTime() < cutoff) return false;
    if (q.errorsOnly && row.level !== "ERROR") return false;
    if (!q.errorsOnly && q.level && row.level !== q.level) return false;
    if (q.stream && q.stream !== "all" && row.stream !== q.stream) return false;
    if (search && !row.message.toLowerCase().includes(search)) return false;
    if (requestId) {
      const rid = row.requestId?.toLowerCase() ?? "";
      if (!rid.includes(requestId) && !row.message.toLowerCase().includes(requestId)) return false;
    }
    return true;
  }).slice(0, limit);
}
