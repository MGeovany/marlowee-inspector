"use client";

import { useEffect } from "react";

/**
 * Prefixes the browser tab title with a `(N)` badge while `count > 0`, so new
 * errors are visible even when the tab is in the background. Restores the
 * original title on unmount or when the count drops to zero.
 */
export function useTitleBadge(count: number, baseTitle = "Savvly Inspector"): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = count > 0 ? `(${count > 99 ? "99+" : count}) ${baseTitle}` : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [count, baseTitle]);
}
