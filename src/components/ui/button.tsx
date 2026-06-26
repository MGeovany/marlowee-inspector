import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-micro font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-35",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover",
        outline:
          "border-border bg-panel text-fg hover:border-border-strong hover:bg-panel-raised",
        ghost: "border-transparent bg-transparent text-fg-muted hover:bg-sidebar-hover hover:text-fg",
        subtle: "border-border bg-panel text-fg hover:bg-panel-raised",
        danger:
          "border-[rgba(239,83,80,0.28)] bg-[rgba(239,83,80,0.12)] text-[#ff9b98] hover:border-[rgba(239,83,80,0.4)] hover:bg-[rgba(239,83,80,0.2)]",
      },
      size: {
        default: "h-8 px-3 py-1",
        sm: "h-7 px-2.5 text-[10px]",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
