import { Badge } from "@/components/ui/badge";
import type { IssueStatus } from "@/lib/issues";

const STATUS_VARIANT: Record<
  IssueStatus,
  "error" | "warn" | "info" | "success" | "neutral" | "accent"
> = {
  open: "error",
  investigating: "accent",
  resolved: "success",
  suppressed: "neutral",
  hidden: "neutral",
};

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
