"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, description, children, className }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  return (
    <div className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-workspace transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-sidebar px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate font-mono text-micro font-medium text-fg">{title}</h2>
            )}
            {description && (
              <p className="mt-1 font-mono text-[11px] tabular-nums text-fg-subtle">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="rounded-sm border border-transparent p-1 text-fg-subtle transition-colors hover:border-border hover:bg-sidebar-hover hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
