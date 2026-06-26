import { createAuditEvent } from "@/lib/db/repository";

export type AuditEventType = "search" | "raw_search" | "rate_limited" | "denied" | "raw_copied";

export interface AuditEvent {
  type: AuditEventType;
  actor: string | null;
  oid: string | null;
  role: string | null;
  app?: string;
  range?: string;
  search?: string;
  errorsOnly?: boolean;
  rawMode?: boolean;
  rowCount?: number;
  requestId?: string;
  testSessionId?: string;
  since?: string;
  reason?: string;
}

export function audit(event: AuditEvent): void {
  const record = {
    kind: "marlowee-inspector.audit",
    ts: new Date().toISOString(),
    ...event,
  };

  console.log(JSON.stringify(record));

  createAuditEvent({
    type: event.type,
    actor: event.actor,
    oid: event.oid,
    role: event.role,
    app: event.app,
    search: event.search,
    rowCount: event.rowCount,
    testSessionId: event.testSessionId,
    details: event.reason ? JSON.stringify({ reason: event.reason }) : undefined,
  }).catch((err: unknown) => {
    console.error("Audit DB write failed", err);
  });
}
