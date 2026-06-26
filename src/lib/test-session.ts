export type TestSessionStatus = "active" | "stopped";

export interface TestSession {
  id: string;
  name: string;
  startedAt: string;
  stoppedAt?: string;
  status: TestSessionStatus;
}

const STORAGE_KEY = "marlowee-inspector:test-session";

export function createTestSession(name: string): TestSession {
  const trimmed = name.trim() || "Untitled test session";
  return {
    id: `ts_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    name: trimmed,
    startedAt: new Date().toISOString(),
    status: "active",
  };
}

export function stopTestSession(session: TestSession): TestSession {
  return {
    ...session,
    status: "stopped",
    stoppedAt: new Date().toISOString(),
  };
}

export function loadTestSession(): TestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TestSession;
    if (!parsed.id || !parsed.startedAt || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTestSession(session: TestSession | null): void {
  if (typeof window === "undefined") return;
  if (!session) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function sessionTimeWindow(session: TestSession | null): {
  since?: string;
  until?: string;
} {
  if (!session) return {};
  return {
    since: session.startedAt,
    until: session.status === "stopped" ? session.stoppedAt : undefined,
  };
}

export function formatSessionDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}
