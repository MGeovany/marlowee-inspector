"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, id, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full border border-border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-35",
        checked ? "border-accent bg-accent" : "bg-[rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-[14px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
