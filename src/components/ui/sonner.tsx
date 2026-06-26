"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "glass-panel group !rounded-[var(--radius-md)] !border !border-border !bg-[rgba(20,21,22,0.92)] !text-fg !shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
          title: "!font-heading !text-[13px] !font-semibold !text-fg",
          description: "!font-mono !text-[11px] !leading-relaxed !text-fg-muted",
          actionButton:
            "!rounded-md !border !border-[rgba(0,217,115,0.35)] !bg-[rgba(0,217,115,0.12)] !font-mono !text-[10px] !font-semibold !uppercase !tracking-[0.04em] !text-[var(--green)]",
          cancelButton: "!font-mono !text-[10px] !text-fg-subtle",
          closeButton:
            "!border-border !bg-glass !text-fg-subtle hover:!text-fg",
          error: "!border-[rgba(242,77,77,0.35)] !shadow-[0_0_24px_rgba(242,77,77,0.12)]",
          success: "!border-[rgba(0,217,115,0.35)]",
          info: "!border-[rgba(69,217,255,0.28)]",
        },
      }}
      {...props}
    />
  );
}
