import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, getActiveSession, listSessions } from "@/lib/db/repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [active, all] = await Promise.all([
    getActiveSession(),
    listSessions(),
  ]);

  return NextResponse.json({ active, sessions: all });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, startedAt } = body;

  if (!id || !name || !startedAt) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  await createSession({ id, name, startedAt });
  return NextResponse.json({ success: true }, { status: 201 });
}
