import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-glass text-fg-muted backdrop-blur-sm",
        error: "border-[rgba(242,77,77,0.35)] bg-[rgba(242,77,77,0.14)] text-level-error",
        warn: "border-[rgba(255,157,0,0.35)] bg-[rgba(255,157,0,0.12)] text-[var(--orange)]",
        info: "border-[rgba(69,217,255,0.3)] bg-[rgba(69,217,255,0.1)] text-level-info",
        debug: "border-border bg-[rgba(255,255,255,0.03)] text-level-debug",
        accent: "border-[rgba(224,44,33,0.3)] bg-accent-soft text-accent-bright",
        success: "border-[rgba(0,217,115,0.35)] bg-[rgba(0,217,115,0.12)] text-[var(--green)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
