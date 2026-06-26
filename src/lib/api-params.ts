import { z } from "zod";
import { parseIsoDatetime } from "./query-time";
import type { QueryTimeWindow } from "./query-time";

const OptionalTextParam = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const SinceUntilParams = z.object({
  since: OptionalTextParam(64),
  until: OptionalTextParam(64),
  testSessionId: OptionalTextParam(128),
});

export function parseQueryTimeWindow(input: {
  since?: string;
  until?: string;
}): QueryTimeWindow | undefined {
  const since = input.since ? parseIsoDatetime(input.since) : undefined;
  const until = input.until ? parseIsoDatetime(input.until) : undefined;

  if (input.since && !since) throw new Error("invalid since timestamp");
  if (input.until && !until) throw new Error("invalid until timestamp");
  if (since && until && new Date(since) > new Date(until)) {
    throw new Error("since must be before until");
  }

  if (!since && !until) return undefined;
  return { since: since ?? undefined, until: until ?? undefined };
}
