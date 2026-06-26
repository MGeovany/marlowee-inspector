import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getIssueStore, getActiveSession, listSuppressions } from "@/lib/db/repository";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [store, activeSession, suppressions] = await Promise.all([
    getIssueStore(),
    getActiveSession(),
    listSuppressions(),
  ]);

  return NextResponse.json({
    ...store,
    activeSession,
    suppressions,
  });
}
