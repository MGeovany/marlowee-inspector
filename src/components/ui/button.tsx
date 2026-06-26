import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-micro font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,90,0,0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-35",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-accent-bright to-accent text-black hover:from-[#ffb033] hover:to-accent-hover active:from-accent active:to-accent-active",
        outline:
          "border-border bg-glass text-fg backdrop-blur-sm hover:border-border-strong hover:bg-panel-raised",
        ghost:
          "border-transparent bg-transparent text-fg-muted hover:bg-glass hover:text-fg",
        subtle: "border-border bg-glass text-fg backdrop-blur-sm hover:bg-panel-raised",
        live: "border-[rgba(0,217,115,0.35)] bg-[rgba(0,217,115,0.12)] text-[var(--green)] hover:border-[rgba(0,217,115,0.5)] hover:bg-[rgba(0,217,115,0.18)]",
        danger:
          "border-[rgba(242,77,77,0.35)] bg-[rgba(242,77,77,0.12)] text-[#ff8a8a] hover:border-[rgba(242,77,77,0.5)] hover:bg-[rgba(242,77,77,0.2)]",
      },
      size: {
        default: "h-8 px-3 py-1",
        sm: "h-7 px-2.5 text-[11px]",
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
