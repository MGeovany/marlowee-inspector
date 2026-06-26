"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  id,
  disabled,
  className,
  ...rest
}: SelectProps) {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-border bg-glass px-2.5 py-1 pr-7 font-mono text-[11px] text-fg backdrop-blur-sm",
          "focus-visible:border-[rgba(255,90,0,0.45)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(255,90,0,0.25)]",
          "disabled:cursor-not-allowed disabled:opacity-35",
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-sidebar text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}
