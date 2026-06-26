import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, clampRange, highestRole } from "@/lib/authz";
import { ALLOWED_APPS } from "@/lib/queries";
import { queryMetrics } from "@/lib/log-analytics";
import { parseQueryTimeWindow, SinceUntilParams } from "@/lib/api-params";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import type { ContainerApp } from "@/lib/types";

const QuerySchema = z
  .object({
    app: z.enum(ALLOWED_APPS).optional(),
    timeRange: z.enum(["1h", "24h", "7d"]).default("24h"),
    range: z.enum(["1h", "24h", "7d"]).optional(),
  })
  .merge(SinceUntilParams);

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
  const timeRange = clampRange(caps, parsed.data.timeRange ?? parsed.data.range ?? "24h");
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

  if (requestedApp && !canReadApp(caps, requestedApp)) {
    audit({ type: "denied", actor, oid, role, app: requestedApp, reason: "app not permitted for role" });
    return NextResponse.json({ error: "forbidden: app not permitted" }, { status: 403 });
  }

  if (apps.length === 0) {
    return NextResponse.json({ error: "forbidden: no apps permitted" }, { status: 403 });
  }

  const rl = rateLimit(`${oid ?? actor ?? "anon"}:metrics`, caps.rateLimitPerMinute);
  if (!rl.allowed) {
    audit({ type: "rate_limited", actor, oid, role, app: apps[0] });
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const metrics = await queryMetrics(apps, timeRange, timeWindow);

    audit({
      type: "search",
      actor,
      oid,
      role,
      app: requestedApp ?? apps.join(","),
      range: timeRange,
      rowCount: 0,
    });

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("Log Analytics metrics query failed", err);
    return NextResponse.json({ error: "metrics query failed" }, { status: 502 });
  }
}

function allowedAppsForRole(apps: string[]): ContainerApp[] {
  return apps.filter((app): app is ContainerApp => (ALLOWED_APPS as readonly string[]).includes(app));
}
