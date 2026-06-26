import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]",
  {
    variants: {
      variant: {
        neutral: "border-border bg-[rgba(255,255,255,0.06)] text-fg-muted",
        error: "border-[rgba(239,83,80,0.28)] bg-[rgba(239,83,80,0.12)] text-level-error",
        warn: "border-[rgba(212,168,67,0.28)] bg-[rgba(212,168,67,0.12)] text-level-warn",
        info: "border-[rgba(83,168,252,0.28)] bg-[rgba(83,168,252,0.12)] text-level-info",
        debug: "border-border bg-[rgba(255,255,255,0.04)] text-level-debug",
        accent: "border-transparent bg-accent-soft text-[#b8b5ff]",
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
