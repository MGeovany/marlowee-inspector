"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

type NavItemDef = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  adminOnly?: boolean;
  disabled?: boolean;
};

const NAV_SECTIONS: { title: string; items: NavItemDef[] }[] = [
  {
    title: "Monitor",
    items: [
      { label: "Overview", icon: Layers, href: "/overview" },
      { label: "Live Logs", icon: Radio, href: "/logs" },
      { label: "Test Sessions", icon: ListChecks, href: "/logs", disabled: true },
      { label: "Search", icon: Search, href: "/logs", disabled: true },
    ],
  },
  {
    title: "Triage",
    items: [
      { label: "Issues", icon: FileSearch, href: "/logs", disabled: true },
      { label: "Resolved", icon: Archive, href: "/logs", disabled: true },
      { label: "Hidden / Suppressed", icon: EyeOff, href: "/logs", disabled: true },
      { label: "Notes", icon: MessageSquareText, href: "/logs", disabled: true },
    ],
  },
  {
    title: "Sources",
    items: [
      { label: "Container Apps", icon: Server, href: "/logs", disabled: true },
      { label: "System Logs", icon: ScrollText, href: "/logs", disabled: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Access", icon: KeyRound, href: "/logs", disabled: true, adminOnly: true },
      { label: "Masking Rules", icon: ShieldCheck, href: "/logs", disabled: true, adminOnly: true },
      { label: "Audit Log", icon: FileText, href: "/audit", adminOnly: true },
    ],
  },
];

interface LogsSidebarProps {
  userEmail: string | null;
  role: string | null;
  signOutAction: () => Promise<void>;
}

export function LogsSidebar({ userEmail, role, signOutAction }: LogsSidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "Admin";
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
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavItem key={item.label} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          );
        })}
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
              className="motion-press flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-glass hover:text-fg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, pathname }: { item: NavItemDef; pathname: string }) {
  const Icon = item.icon;
  const active = isNavActive(pathname, item.href, item.label);

  if (item.disabled) {
    return (
      <span
        className="sidebar-nav-item cursor-not-allowed text-fg-subtle opacity-45"
        title="Coming soon"
      >
        <span className="sidebar-nav-icon sidebar-nav-icon-idle">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-[13px] font-medium leading-none">{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
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
        {item.label}
      </span>
    </Link>
  );
}

function isNavActive(pathname: string, href: string, label: string): boolean {
  if (label === "Live Logs") return pathname === "/logs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function userInitials(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
