import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateSession } from "@/lib/db/repository";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, status, stoppedAt } = body;

  await updateSession(id, { name, status, stoppedAt });
  return NextResponse.json({ success: true });
}
