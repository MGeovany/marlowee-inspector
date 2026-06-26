"use client";

import Image from "next/image";
import { LayoutDashboard, ScrollText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import brandIcon from "@/app/icon.png";

interface AppIconRailProps {
  className?: string;
}

export function AppIconRail({ className }: AppIconRailProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "glass-rail flex w-12 shrink-0 flex-col items-center py-3",
        className,
      )}
    >
      <div className="mb-4 flex h-8 w-8 items-center justify-center">
        <Image
          src={brandIcon}
          alt="Marlowee Inspector"
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-sm object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <RailIcon icon={LayoutDashboard} label="Dashboards" disabled title="Coming soon" />
        <RailIcon icon={ScrollText} label="Logs" active />
        <RailIcon icon={Settings} label="Settings" disabled title="Coming soon" />
      </div>

      <div className="mt-auto flex flex-col items-center gap-1 pt-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-bright to-accent text-[10px] font-bold text-black shadow-accent"
          title="Savvly Dev"
        >
          S
        </div>
      </div>
    </nav>
  );
}

function RailIcon({
  icon: Icon,
  label,
  active,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent-soft text-accent-bright"
          : "text-fg-subtle hover:bg-glass hover:text-fg",
        disabled && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-fg-subtle",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
      )}
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
