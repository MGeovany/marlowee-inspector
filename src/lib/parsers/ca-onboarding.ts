import type { LogEntry } from "../types";
import type { ParsedLog } from "./index";
import { levelFromJson, httpFromJson, traceFromJson, contextFromJson } from "./index";

export function parseOnboarding(_entry: LogEntry, json: Record<string, unknown> | null): ParsedLog {
  if (!json) return {};
  return {
    level: levelFromJson(json),
    http: httpFromJson(json),
    trace: traceFromJson(json),
    context: contextFromJson(json),
  };
}
