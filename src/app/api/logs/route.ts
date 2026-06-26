import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, clampRange, highestRole } from "@/lib/authz";
import { ALLOWED_APPS, buildLogsQuery, buildSystemLogsQuery, MAX_ROWS } from "@/lib/queries";
import { queryLogs } from "@/lib/log-analytics";
import { parseQueryTimeWindow, SinceUntilParams } from "@/lib/api-params";
import { effectiveQueryRange } from "@/lib/query-time";
import { maskRows } from "@/lib/masking";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import type { LogEntry } from "@/lib/types";

const BoolParam = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const OptionalTextParam = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const QuerySchema = z.object({
  app: z.enum(ALLOWED_APPS),
  range: z.enum(["1h", "24h", "7d"]).default("24h"),
  search: OptionalTextParam(256),
  level: z.enum(["ERROR", "WARN", "INFO", "LOG"]).optional(),
  stream: z.enum(["stdout", "stderr", "all", "system"]).default("all"),
  requestId: OptionalTextParam(128),
  errorsOnly: BoolParam,
  raw: BoolParam,
  limit: z.coerce.number().int().min(1).max(MAX_ROWS).default(200),
}).merge(SinceUntilParams);

export async function GET(req: NextRequest) {
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
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { app, search, errorsOnly, level, stream, requestId, testSessionId, limit } = parsed.data;
  const range = clampRange(caps, parsed.data.range);
  // errorsOnly already narrows to errors; ignore an explicit level in that case.
  const effectiveLevel = errorsOnly ? undefined : level;

  let timeWindow;
  try {
    timeWindow = parseQueryTimeWindow(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid time window" },
      { status: 400 },
    );
  }

  const queryRange = effectiveQueryRange(range, timeWindow ?? {});

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

  // 6. Build + run a read-only allowlisted KQL query against Azure.
  try {
    const kql =
      stream === "system"
        ? buildSystemLogsQuery({
            app,
            range: queryRange,
            search,
            errorsOnly,
            level: effectiveLevel,
            limit,
            timeWindow,
          })
        : buildLogsQuery({
            app,
            range: queryRange,
            search,
            errorsOnly,
            level: effectiveLevel,
            stream,
            requestId,
            testSessionId,
            limit,
            timeWindow,
          });
    const rows: LogEntry[] = await queryLogs(kql, queryRange);

    // Raw unmasked logs are not exposed yet; mask every frontend response server-side.
    const masked = maskRows(rows);

    // 7. Audit
    audit({
      type: "search",
      actor,
      oid,
      role,
      app,
      range: queryRange,
      search,
      errorsOnly,
      rawMode: false,
      rowCount: masked.length,
      testSessionId,
      since: timeWindow?.since,
    });

    // 8. Respond
    return NextResponse.json({
      rows: masked,
      range: queryRange,
      masked: true,
      source: "azure",
      total: masked.length,
      timeWindow: timeWindow ?? null,
    });
  } catch (err) {
    console.error("Log Analytics query failed", err);
    return NextResponse.json(
      { error: "query failed" },
      { status: 502 },
    );
  }
}
