"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onOpenChange]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={() => !busy && onOpenChange(false)}
        className="modal-overlay-in absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="modal-panel-in glass-card relative z-[1] w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-border shadow-2xl"
      >
        <button
          type="button"
          onClick={() => !busy && onOpenChange(false)}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm border border-transparent p-1 text-fg-subtle transition-colors hover:border-border hover:bg-sidebar-hover hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex gap-3 px-4 pb-2 pt-4">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              isDanger
                ? "bg-[rgba(242,77,77,0.12)] text-[#ff8a8a]"
                : "bg-[rgba(0,217,115,0.12)] text-[var(--green)]",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 pr-5">
            <h2 className="text-[13px] font-semibold text-fg">{title}</h2>
            {description && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border bg-glass px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "default"}
            size="sm"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
