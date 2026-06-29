"use client";

import { useEffect, useRef, useState } from "react";

const HIGHLIGHT_MS = 2600;

interface HasId {
  id: string;
}

/**
 * Tracks which rows appeared since the previous update for the *same* query, so
 * a periodic refresh can briefly highlight new rows instead of flashing the
 * whole table to a skeleton.
 *
 * - `sig` is a stable signature of the active query (filters, range, session…).
 *   When it changes we reset the baseline instead of marking every row as new.
 * - `ready` should be true only once real data has loaded (e.g. status ===
 *   "success"), so the first successful load establishes the baseline silently
 *   rather than highlighting everything.
 */
export function useNewRowIds(rows: HasId[], sig: string, ready: boolean): ReadonlySet<string> {
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set());
  const seenRef = useRef<{ sig: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!ready) return;

    const ids = new Set(rows.map((r) => r.id));
    const prev = seenRef.current;
    seenRef.current = { sig, ids };

    if (!prev || prev.sig !== sig) {
      setNewIds(new Set());
      return;
    }

    const fresh = new Set<string>();
    for (const id of ids) if (!prev.ids.has(id)) fresh.add(id);
    setNewIds(fresh);
  }, [rows, sig, ready]);

  // Drop the highlight after the flash animation so the class doesn't linger.
  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [newIds]);

  return newIds;
}
