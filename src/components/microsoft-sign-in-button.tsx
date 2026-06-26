import { cn } from "@/lib/utils";

type MicrosoftSignInButtonProps = {
  className?: string;
};

export function MicrosoftSignInButton({ className }: MicrosoftSignInButtonProps) {
  return (
    <button
      type="submit"
      className={cn(
        "flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-glass px-3 py-2.5 backdrop-blur-sm",
        "text-[13px] font-semibold text-fg transition-colors",
        "hover:border-border-strong hover:bg-panel-raised",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
        className,
      )}
    >
      <MicrosoftLogo className="h-4 w-4 shrink-0" />
      <span>Continue with Microsoft</span>
    </button>
  );
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
