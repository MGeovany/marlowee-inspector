import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { setIssueStatus, getIssue } from "@/lib/db/repository";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fingerprint: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { fingerprint } = await params;
  const issue = await getIssue(decodeURIComponent(fingerprint));
  if (!issue) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(issue);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fingerprint: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { fingerprint } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  await setIssueStatus(decodeURIComponent(fingerprint), status);
  return NextResponse.json({ success: true });
}
