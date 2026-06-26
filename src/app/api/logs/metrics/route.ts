import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, clampRange, highestRole } from "@/lib/authz";
import { ALLOWED_APPS } from "@/lib/queries";
import { queryMetrics } from "@/lib/log-analytics";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import type { ContainerApp } from "@/lib/types";

const QuerySchema = z.object({
  range: z.enum(["1h", "24h", "7d"]).default("24h"),
});

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

  const range = clampRange(caps, parsed.data.range);
  const apps = caps.apps.filter((app): app is ContainerApp =>
    (ALLOWED_APPS as readonly string[]).includes(app),
  );

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
    const metrics = await queryMetrics(apps, range);

    audit({
      type: "search",
      actor,
      oid,
      role,
      app: apps.join(","),
      range,
      search: undefined,
      errorsOnly: false,
      rawMode: false,
      rowCount: 0,
    });

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("Log Analytics metrics query failed", err);
    return NextResponse.json({ error: "metrics query failed" }, { status: 502 });
  }
}
