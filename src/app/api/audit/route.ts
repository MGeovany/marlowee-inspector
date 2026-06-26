import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { queryAuditEvents } from "@/lib/db/repository";
import { highestRole } from "@/lib/authz";

const PAGE_SIZE = 50;

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
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || PAGE_SIZE));
  const startDate = req.nextUrl.searchParams.get("startDate") ?? undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") ?? undefined;

  const { rows, total } = queryAuditEvents({
    type,
    actor,
    limit,
    offset: (page - 1) * limit,
    startDate,
    endDate,
  });

  return NextResponse.json({ rows, total, page, pageSize: limit });
}
