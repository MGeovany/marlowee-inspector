import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { reopenLogEntry } from "@/lib/db/repository";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { logId } = await params;
  await reopenLogEntry(decodeURIComponent(logId));
  return NextResponse.json({ success: true });
}
