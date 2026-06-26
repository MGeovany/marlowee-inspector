"use client";

import { ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogsSidebar } from "@/components/logs/logs-sidebar";
import { cn } from "@/lib/utils";

interface SourcesPageShellProps {
  title: string;
  userEmail: string | null;
  role: string | null;
  signOutAction: () => Promise<void>;
  loading?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export function SourcesPageShell({
  title,
  userEmail,
  role,
  signOutAction,
  loading,
  onRefresh,
  children,
}: SourcesPageShellProps) {
  return (
    <div className="ambient-bg flex h-dvh overflow-hidden bg-bg">
      <LogsSidebar userEmail={userEmail} role={role} signOutAction={signOutAction} />

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-header shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <div className="dd-breadcrumb flex items-center">
                <span>Sources</span>
                <ChevronRight className="dd-breadcrumb-sep h-3 w-3" />
                <span className="text-fg-muted">{title}</span>
              </div>
              <h1 className="dd-page-title mt-0.5">{title}</h1>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
