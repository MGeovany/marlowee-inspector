import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, clampRange, highestRole } from "@/lib/authz";
import { buildLogsQuery } from "@/lib/queries";
import { queryLogs } from "@/lib/log-analytics";
import { maskRows, maskString } from "@/lib/masking";
import { queryMockLogs } from "@/lib/mock-logs";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/**
 * Mock phase (default): serve the local mock dataset instead of querying Azure.
 * Azure is only used when explicitly opted into with LOGS_SOURCE=azure, so a
 * configured workspace id + an active `az login` can never hit real logs by
 * accident during the UI phase. The full authz/masking/audit/rate-limit
 * pipeline runs regardless of the data source.
 */
const USE_MOCK = process.env.LOGS_SOURCE !== "azure";

const QuerySchema = z.object({
  app: z.string().min(1),
  range: z.enum(["1h", "24h", "7d"]).default("24h"),
  search: z.string().max(256).optional(),
  level: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).optional(),
  errorsOnly: z.boolean().default(false),
  raw: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  // 1. Authn
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const actor = session.user.email ?? null;
  const oid = session.user.oid ?? null;
  const role = highestRole(session.user.roles);

  // 2. Authz: role resolves to capabilities
  const caps = capabilitiesFor(session.user.roles);
  if (!caps || !role) {
    audit({ type: "denied", actor, oid, role: null, reason: "no valid app role" });
    return NextResponse.json({ error: "forbidden: no role assigned" }, { status: 403 });
  }

  // 3. Validate input
  const parsed = QuerySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { app, search, errorsOnly, level } = parsed.data;
  const range = clampRange(caps, parsed.data.range);
  const raw = parsed.data.raw && caps.canSeeRaw; // raw only honored for Admin

  // 4. Authz: app allowlist for this role
  if (!canReadApp(caps, app)) {
    audit({ type: "denied", actor, oid, role, app, reason: "app not permitted for role" });
    return NextResponse.json({ error: "forbidden: app not permitted" }, { status: 403 });
  }

  // 5. Rate limit (per user)
  const rl = rateLimit(oid ?? actor ?? "anon", caps.rateLimitPerMinute);
  if (!rl.allowed) {
    audit({ type: "rate_limited", actor, oid, role, app });
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // 6. Build + run query (mock dataset, or read-only KQL against Azure)
  try {
    let masked;
    if (USE_MOCK) {
      const rows = queryMockLogs({ app, range, search, errorsOnly, level });
      // Mask both the message and the raw payload server-side (raw mode = Admin only).
      masked = raw
        ? rows
        : rows.map((r) => ({ ...r, message: maskString(r.message), raw: maskString(r.raw) }));
    } else {
      const kql = buildLogsQuery({ app, range, search, errorsOnly });
      const rows = await queryLogs(kql, range);
      const filtered = level ? rows.filter((r) => r.level === level) : rows;
      masked = maskRows(filtered, raw);
    }

    // 7. Audit
    audit({
      type: raw ? "raw_search" : "search",
      actor,
      oid,
      role,
      app,
      range,
      search,
      errorsOnly,
      rawMode: raw,
      rowCount: masked.length,
    });

    // 8. Respond
    return NextResponse.json({
      rows: masked,
      range,
      masked: !raw,
      source: USE_MOCK ? "mock" : "azure",
      total: masked.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "query failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
