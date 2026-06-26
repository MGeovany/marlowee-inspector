/**
 * App Role -> capabilities. MVP scope: single workspace (Development / law-savvly-dev-main).
 *
 * Authorization is enforced in the backend, never in the browser. A user may only read
 * the container apps listed for their highest role, and only Admin can see raw (unmasked) logs.
 */

export type Role = "Admin" | "Developer" | "QA" | "Support" | "Viewer";
export type TimeRange = "1h" | "24h" | "7d";

export interface Capabilities {
  apps: string[]; // container apps this role may read
  canSeeRaw: boolean; // bypass masking (audited)
  maxRange: TimeRange;
  rateLimitPerMinute: number;
}

const ROLE_RANK: Record<Role, number> = {
  Admin: 5,
  Developer: 4,
  QA: 3,
  Support: 2,
  Viewer: 1,
};

export const CAPABILITIES: Record<Role, Capabilities> = {
  Admin: {
    apps: ["ca-data-api", "ca-dashboard", "ca-onboarding", "ca-admin"],
    canSeeRaw: true,
    maxRange: "7d",
    rateLimitPerMinute: 60,
  },
  Developer: {
    apps: ["ca-data-api", "ca-dashboard", "ca-onboarding"],
    canSeeRaw: false,
    maxRange: "7d",
    rateLimitPerMinute: 30,
  },
  QA: {
    apps: ["ca-data-api", "ca-dashboard", "ca-onboarding"],
    canSeeRaw: false,
    maxRange: "24h",
    rateLimitPerMinute: 30,
  },
  Support: {
    apps: ["ca-dashboard", "ca-onboarding"],
    canSeeRaw: false,
    maxRange: "24h",
    rateLimitPerMinute: 20,
  },
  Viewer: {
    apps: ["ca-dashboard"],
    canSeeRaw: false,
    maxRange: "1h",
    rateLimitPerMinute: 10,
  },
};

/** Resolve the highest-ranked valid role from the token's roles claim. */
export function highestRole(roles: string[] | undefined): Role | null {
  const valid = (roles ?? []).filter((r): r is Role => r in ROLE_RANK);
  if (valid.length === 0) return null;
  return valid.sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
}

export function capabilitiesFor(roles: string[] | undefined): Capabilities | null {
  const role = highestRole(roles);
  return role ? CAPABILITIES[role] : null;
}

export function canReadApp(caps: Capabilities, app: string): boolean {
  return caps.apps.includes(app);
}

/** Clamp a requested range to what the role allows. */
export function clampRange(caps: Capabilities, requested: TimeRange): TimeRange {
  const order: TimeRange[] = ["1h", "24h", "7d"];
  return order.indexOf(requested) > order.indexOf(caps.maxRange) ? caps.maxRange : requested;
}
