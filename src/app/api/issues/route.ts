import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertIssue, listIssuesByStatus } from "@/lib/db/repository";
import type { IssueStatus } from "@/lib/issues";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const statuses: IssueStatus[] = statusParam
    ? (statusParam.split(",") as IssueStatus[])
    : ["open", "investigating", "resolved", "suppressed", "hidden"];

  const issues = await listIssuesByStatus(statuses);
  return NextResponse.json(issues);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { fingerprint, status, app, level, label, endpoint, statusCode } = body;

  if (!fingerprint || !status || !app || !level || !label) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  await upsertIssue(fingerprint, { status, app, level, label, endpoint, statusCode });
  return NextResponse.json({ success: true });
}
