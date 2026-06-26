import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteSuppression } from "@/lib/db/repository";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  await deleteSuppression(id);
  return NextResponse.json({ success: true });
}
