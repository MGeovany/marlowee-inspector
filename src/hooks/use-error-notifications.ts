"use client";

import { useEffect, useRef } from "react";

import { notifyNewErrors, unlockErrorAlertAudio } from "@/lib/error-notify";
import type { LogEntry } from "@/lib/types";

interface UseErrorNotificationsOptions {
  rows: LogEntry[];
  enabled: boolean;
  resetKey: string;
  onView: (entry: LogEntry) => void;
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
}: UseErrorNotificationsOptions): void {
  const baselineReadyRef = useRef(false);
  const knownErrorIdsRef = useRef<Set<string>>(new Set());
  const onViewRef = useRef(onView);

  onViewRef.current = onView;

  useEffect(() => {
    const unlock = () => unlockErrorAlertAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    baselineReadyRef.current = false;
    knownErrorIdsRef.current = new Set();
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
      notifyNewErrors(newErrors, (entry) => onViewRef.current(entry));
    }

    knownErrorIdsRef.current = currentIds;
  }, [rows, enabled]);
}
