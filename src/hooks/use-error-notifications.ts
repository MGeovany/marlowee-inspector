"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearAllErrorNotifications,
  notifyNewErrors,
  unlockErrorAlertAudio,
} from "@/lib/error-notify";
import type { LogEntry } from "@/lib/types";

interface UseErrorNotificationsOptions {
  rows: LogEntry[];
  enabled: boolean;
  resetKey: string;
  onView: (entry: LogEntry) => void;
}

interface UseErrorNotificationsResult {
  /** Count of unacknowledged new errors since the last clear / filter change. */
  newCount: number;
  /** Dismiss all toasts and reset the count. */
  clearNotifications: () => void;
}

/**
 * Detects ERROR rows that appear after the baseline snapshot and fires toast + sound.
 * Baseline resets when `resetKey` changes (filters / time window).
 */
export function useErrorNotifications({
  rows,
  enabled,
  resetKey,
  onView,
}: UseErrorNotificationsOptions): UseErrorNotificationsResult {
  const baselineReadyRef = useRef(false);
  const knownErrorIdsRef = useRef<Set<string>>(new Set());
  const onViewRef = useRef(onView);
  const [newCount, setNewCount] = useState(0);

  onViewRef.current = onView;

  const clearNotifications = useCallback(() => {
    clearAllErrorNotifications();
    setNewCount(0);
  }, []);
  const clearNotificationsRef = useRef(clearNotifications);
  clearNotificationsRef.current = clearNotifications;

  useEffect(() => {
    const unlock = () => unlockErrorAlertAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    baselineReadyRef.current = false;
    knownErrorIdsRef.current = new Set();
    setNewCount(0);
  }, [resetKey]);

  useEffect(() => {
    const errorRows = rows.filter((row) => row.level === "ERROR");
    const currentIds = new Set(errorRows.map((row) => row.id));

    if (!baselineReadyRef.current) {
      knownErrorIdsRef.current = currentIds;
      baselineReadyRef.current = true;
      return;
    }

    if (!enabled) {
      knownErrorIdsRef.current = currentIds;
      return;
    }

    const newErrors = errorRows.filter((row) => !knownErrorIdsRef.current.has(row.id));
    if (newErrors.length > 0) {
      notifyNewErrors(
        newErrors,
        (entry) => {
          onViewRef.current(entry);
          setNewCount((c) => Math.max(0, c - 1));
        },
        () => clearNotificationsRef.current(),
      );
      setNewCount((c) => c + newErrors.length);
    }

    knownErrorIdsRef.current = currentIds;
  }, [rows, enabled]);

  return { newCount, clearNotifications };
}
