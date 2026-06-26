import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSuppressions, createSuppression } from "@/lib/db/repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rules = await listSuppressions();
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { pattern, app, level, endpoint, reason } = body;

  if (!pattern) {
    return NextResponse.json({ error: "pattern is required" }, { status: 400 });
  }

  const id = await createSuppression({
    pattern,
    app,
    level,
    endpoint,
    reason,
    createdBy: session.user.email ?? undefined,
  });

  return NextResponse.json({ id }, { status: 201 });
}
