import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, clampRange, highestRole } from "@/lib/authz";
import { buildLogsQuery } from "@/lib/queries";
import { queryLogs } from "@/lib/log-analytics";
import { maskRows } from "@/lib/masking";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const QuerySchema = z.object({
  app: z.string().min(1),
  range: z.enum(["1h", "24h", "7d"]).default("24h"),
  search: z.string().max(256).optional(),
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
  const { app, search, errorsOnly } = parsed.data;
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

  // 6. Build + run read-only KQL
  try {
    const kql = buildLogsQuery({ app, range, search, errorsOnly });
    const rows = await queryLogs(kql, range);

    // 7. Mask server-side
    const masked = maskRows(rows, raw);

    // 8. Audit
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

    // 9. Respond
    return NextResponse.json({ rows: masked, range, masked: !raw });
  } catch (err) {
    return NextResponse.json(
      { error: "query failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
