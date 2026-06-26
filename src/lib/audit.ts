/**
 * Structured audit log. Every search (and notable event) is recorded.
 *
 * MVP sink: JSON to stdout, captured by Container Apps -> ContainerAppConsoleLogs_CL under the
 * Marlowee Inspector app. Upgrade path (plan §10/§14): a tamper-evident store (Postgres/Supabase) separate
 * from the workspace being read.
 */

export type AuditEventType = "search" | "raw_search" | "rate_limited" | "denied";

export interface AuditEvent {
  type: AuditEventType;
  actor: string | null; // UPN / email
  oid: string | null; // Entra object id
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
  // Single-line JSON so it is greppable in the log table.
  const record = {
    kind: "marlowee-inspector.audit",
    ts: new Date().toISOString(),
    ...event,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(record));
}
