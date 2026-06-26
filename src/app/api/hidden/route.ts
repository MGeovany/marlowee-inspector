import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hideLogEntry, listHiddenLogs } from "@/lib/db/repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const logs = await listHiddenLogs();
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { logId, fingerprint, app, level, label } = body;

  if (!logId || !fingerprint || !app || !level || !label) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  await hideLogEntry({ logId, fingerprint, app, level, label });
  return NextResponse.json({ success: true });
}
