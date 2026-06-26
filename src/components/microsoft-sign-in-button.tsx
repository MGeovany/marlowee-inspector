import { cn } from "@/lib/utils";

type MicrosoftSignInButtonProps = {
  className?: string;
};

export function MicrosoftSignInButton({ className }: MicrosoftSignInButtonProps) {
  return (
    <button
      type="submit"
      className={cn(
        "group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3",
        "text-sm font-medium text-zinc-900 shadow-sm transition-all duration-200",
        "hover:border-white/20 hover:bg-zinc-50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated",
        "active:scale-[0.99]",
        className,
      )}
    >
      <MicrosoftLogo className="h-[18px] w-[18px] shrink-0" />
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
