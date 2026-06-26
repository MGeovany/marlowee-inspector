import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { capabilitiesFor, canReadApp, highestRole } from "@/lib/authz";
import { maskLogEntry } from "@/lib/masking";
import { extractLogDetails } from "@/lib/log-details";
import { toLogAiBrief } from "@/lib/log-ai-brief";
import { audit } from "@/lib/audit";
import { ALLOWED_APPS } from "@/lib/queries";

const CopySchema = z.object({
  logId: z.string().min(1),
  variant: z.enum(["raw", "ai"]),
  app: z.enum(ALLOWED_APPS),
  timestamp: z.string(),
  message: z.string(),
  rawPayload: z.string(),
  revision: z.string(),
  replica: z.string(),
  level: z.enum(["ERROR", "WARN", "INFO", "LOG", "DEBUG"]),
  stream: z.enum(["stdout", "stderr"]).default("stdout"),
  requestId: z.string().optional(),
});

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = CopySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { logId, variant, app, level, stream, requestId, timestamp, message, rawPayload, revision, replica } = parsed.data;

  if (!canReadApp(caps, app)) {
    audit({ type: "denied", actor, oid, role, app, reason: "app not permitted for role" });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const entry = maskLogEntry({
    id: logId,
    timestamp,
    app,
    level,
    message,
    rawPayload,
    revision,
    replica,
    stream,
    ...(requestId ? { requestId } : {}),
  });

  const text = variant === "raw" ? extractLogDetails(entry, true).formattedRaw : toLogAiBrief(entry, true);

  audit({ type: "raw_copied", actor, oid, role, app });

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
