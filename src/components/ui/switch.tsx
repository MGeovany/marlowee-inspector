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
        "motion-surface relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-35",
        checked
          ? "border-accent bg-gradient-to-r from-accent-bright to-accent"
          : "border-border bg-glass",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-out-expo",
          checked ? "translate-x-[14px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
