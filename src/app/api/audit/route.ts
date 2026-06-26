import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { queryAuditEvents } from "@/lib/db/repository";
import { highestRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const role = highestRole(session.user.roles);
  if (role !== "Admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const actor = req.nextUrl.searchParams.get("actor") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 100;

  const events = await queryAuditEvents({ type, actor, limit });
  return NextResponse.json(events);
}
