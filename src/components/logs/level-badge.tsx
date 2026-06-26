import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LogLevel } from "@/lib/types";

const VARIANT: Record<LogLevel, "error" | "warn" | "info" | "debug"> = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

export function LevelBadge({ level, className }: { level: LogLevel; className?: string }) {
  return <Badge variant={VARIANT[level]} className={cn(className)}>{level}</Badge>;
}
