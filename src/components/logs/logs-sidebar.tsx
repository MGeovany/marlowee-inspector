"use client";

import Image from "next/image";
import {
  Archive,
  EyeOff,
  FileSearch,
  FileText,
  KeyRound,
  Layers,
  ListChecks,
  LogOut,
  MessageSquareText,
  Radio,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ContainerApp } from "@/lib/types";
import brandIcon from "@/app/icon.png";

export type AppSelection = ContainerApp | "all";

interface LogsSidebarProps {
  userEmail: string | null;
  role: string | null;
  signOutAction: () => Promise<void>;
}

const NAV_SECTIONS = [
  {
    title: "Monitor",
    items: [
      { label: "Overview", icon: Layers, active: false },
      { label: "Live Logs", icon: Radio, active: true },
      { label: "Test Sessions", icon: ListChecks, active: false },
      { label: "Search", icon: Search, active: false },
    ],
  },
  {
    title: "Triage",
    items: [
      { label: "Issues", icon: FileSearch, active: false },
      { label: "Resolved", icon: Archive, active: false },
      { label: "Hidden / Suppressed", icon: EyeOff, active: false },
      { label: "Notes", icon: MessageSquareText, active: false },
    ],
  },
  {
    title: "Sources",
    items: [
      { label: "Container Apps", icon: Server, active: false },
      { label: "System Logs", icon: ScrollText, active: false },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Access", icon: KeyRound, active: false },
      { label: "Masking Rules", icon: ShieldCheck, active: false },
      { label: "Audit Log", icon: FileText, active: false },
    ],
  },
];

export function LogsSidebar({ userEmail, role, signOutAction }: LogsSidebarProps) {
  const initials = userInitials(userEmail);

  return (
    <aside className="sidebar-shell flex w-[252px] shrink-0 flex-col">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-glass backdrop-blur-sm">
            <Image src={brandIcon} alt="" width={20} height={20} className="h-5 w-5 rounded-sm object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-[15px] font-semibold leading-tight text-fg">
              Marlowee
            </p>
            <p className="text-[11px] text-fg-subtle">Inspector · Development</p>
          </div>
        </div>
      </div>

      <nav aria-label="Main sections" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.label} icon={item.icon} label={item.label} active={item.active} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-bright to-accent text-[11px] font-bold text-black"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-fg">{userEmail ?? "unknown"}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.05em] text-fg-subtle">
              {role ?? "no role"}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-glass hover:text-fg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn("sidebar-nav-item", active && "sidebar-nav-item-active", !active && "text-fg-muted")}
    >
      <span
        className={cn(
          "sidebar-nav-icon",
          active ? "sidebar-nav-icon-active" : "sidebar-nav-icon-idle",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className={cn("flex-1 text-[13px] leading-none", active ? "font-semibold text-fg" : "font-medium")}>
        {label}
      </span>
    </button>
  );
}

function userInitials(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
