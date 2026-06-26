import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-micro text-fg",
        "placeholder:text-fg-subtle",
        "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft",
        "disabled:cursor-not-allowed disabled:opacity-35",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
