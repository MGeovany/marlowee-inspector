import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-border bg-glass px-2.5 py-1.5 text-micro text-fg backdrop-blur-sm",
        "placeholder:text-fg-subtle",
        "focus-visible:border-[rgba(224,44,33,0.45)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring-soft)]",
        "disabled:cursor-not-allowed disabled:opacity-35",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
