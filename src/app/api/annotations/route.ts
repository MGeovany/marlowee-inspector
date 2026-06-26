import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addNote, listNotesForIssue, listNotesForLog, listRecentNotes, listAllNotes } from "@/lib/db/repository";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const fingerprint = req.nextUrl.searchParams.get("fingerprint");
  const logId = req.nextUrl.searchParams.get("logId");
  const all = req.nextUrl.searchParams.get("all");

  if (fingerprint) {
    const notes = await listNotesForIssue(fingerprint);
    return NextResponse.json(notes);
  }
  if (logId) {
    const notes = await listNotesForLog(logId);
    return NextResponse.json(notes);
  }
  if (all === "true") {
    const notes = await listAllNotes();
    return NextResponse.json(notes);
  }

  const notes = await listRecentNotes();
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { target, targetId, fingerprint, logId, text } = body;

  if (!target || !targetId || !fingerprint || !text) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const note = await addNote({
    target,
    targetId,
    fingerprint,
    logId,
    text,
    author: session.user.email ?? undefined,
  });

  return NextResponse.json(note, { status: 201 });
}
