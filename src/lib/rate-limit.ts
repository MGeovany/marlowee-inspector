/**
 * Per-user fixed-window rate limiter.
 *
 * MVP: in-memory (single instance only). For multiple replicas, move to Redis (a Redis Cache
 * already exists in the subscription) — see plan §10/§14.
 */

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Window>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limitPerMinute: number): RateResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limitPerMinute - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - existing.count,
    retryAfterSeconds: 0,
  };
}
