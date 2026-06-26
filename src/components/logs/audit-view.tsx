"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  type: string;
  actor: string | null;
  oid: string | null;
  role: string | null;
  app: string | null;
  search: string | null;
  rowCount: number | null;
  testSessionId: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditResponse {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
}

const AUDIT_TYPES = [
  { value: "", label: "All types" },
  { value: "search", label: "search" },
  { value: "raw_search", label: "raw_search" },
  { value: "rate_limited", label: "rate_limited" },
  { value: "denied", label: "denied" },
  { value: "raw_copied", label: "raw_copied" },
];

interface AuditViewProps {
  signOutAction: () => Promise<void>;
}

export function AuditView({ signOutAction }: AuditViewProps) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (actor) params.set("actor", actor);
      if (page > 1) params.set("page", String(page));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [type, actor, page, startDate, endDate]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  const csvContent = useMemo(() => {
    if (!data?.rows.length) return "";
    const header = "createdAt,type,actor,role,app,search,rowCount,details";
    const rows = data.rows.map((r) =>
      [
        r.createdAt,
        r.type,
        r.actor ?? "",
        r.role ?? "",
        r.app ?? "",
        `"${(r.search ?? "").replace(/"/g, '""')}"`,
        r.rowCount ?? "",
        `"${(r.details ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }, [data]);

  function downloadCsv() {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFilterChange() {
    setPage(1);
  }

  function applyFilter(newType: string) {
    setType(newType);
    handleFilterChange();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="glass-header shrink-0">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div>
            <div className="dd-breadcrumb flex items-center">
              <a href="/logs" className="hover:text-fg">Logs</a>
              <span className="dd-breadcrumb-sep mx-1">/</span>
              <span className="text-fg-muted">Audit</span>
            </div>
            <h1 className="dd-page-title mt-0.5">Audit Trail</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!csvContent}>
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-3 w-3" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2">
          <Select
            value={type}
            onValueChange={applyFilter}
            options={AUDIT_TYPES}
            aria-label="Filter by type"
            className="w-[140px]"
          />
          <input
            type="text"
            value={actor}
            onChange={(e) => { setActor(e.target.value); handleFilterChange(); }}
            placeholder="Filter by actor..."
            className="h-8 rounded-md border border-border bg-glass px-2.5 font-mono text-[11px] text-fg backdrop-blur-sm placeholder:text-fg-subtle focus-visible:border-[rgba(0,217,115,0.45)] focus-visible:outline-none"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
            className="h-8 rounded-md border border-border bg-glass px-2.5 font-mono text-[11px] text-fg backdrop-blur-sm focus-visible:border-[rgba(0,217,115,0.45)] focus-visible:outline-none"
          />
          <span className="font-mono text-[11px] text-fg-subtle">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
            className="h-8 rounded-md border border-border bg-glass px-2.5 font-mono text-[11px] text-fg backdrop-blur-sm focus-visible:border-[rgba(0,217,115,0.45)] focus-visible:outline-none"
          />
          <span className="font-mono text-[11px] text-fg-subtle">
            {data ? `${data.total} events` : ""}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <p className="py-8 text-center font-mono text-[11px] text-fg-subtle">Loading...</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.05em] text-fg-subtle">
                <th className="px-3 py-2 font-normal">Timestamp</th>
                <th className="px-3 py-2 font-normal">Type</th>
                <th className="px-3 py-2 font-normal">Actor</th>
                <th className="px-3 py-2 font-normal">Role</th>
                <th className="px-3 py-2 font-normal">App</th>
                <th className="px-3 py-2 font-normal">Search / Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-panel">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-fg-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium",
                      row.type === "denied" || row.type === "rate_limited"
                        ? "bg-[rgba(242,77,77,0.15)] text-[#ff8a8a]"
                        : row.type === "raw_copied"
                          ? "bg-[rgba(0,217,115,0.12)] text-[var(--green)]"
                          : "bg-glass text-fg",
                    )}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-fg">{row.actor ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">{row.role ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-fg-muted">{row.app ?? "—"}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 font-mono text-[11px] text-fg-muted">
                    {row.search || row.details ? (
                      <span title={row.search ?? row.details ?? ""}>
                        {row.search ?? row.details}
                      </span>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {data?.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-mono text-[11px] text-fg-subtle">
                    No audit events match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="motion-press rounded-sm border border-border p-1 text-fg-subtle hover:border-border-strong hover:text-fg disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[11px] text-fg-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="motion-press rounded-sm border border-border p-1 text-fg-subtle hover:border-border-strong hover:text-fg disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
