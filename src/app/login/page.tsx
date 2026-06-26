import Image from "next/image";

import { signIn } from "@/auth";
import { MicrosoftSignInButton } from "@/components/microsoft-sign-in-button";
import brandIcon from "../icon.png";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--glow)/0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,hsl(220_14%_14%/0.55),transparent_45%)]"
      />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-surface-elevated p-2 shadow-glow">
            <Image src={brandIcon} alt="Marlowee Inspector" width={32} height={32} className="h-8 w-8" priority />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Marlowee Inspector</h1>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-ink-muted">
            Sign in with your Savvly account to browse container app logs.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-elevated/80 p-6 shadow-glow backdrop-blur-sm">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
            Employee access only
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/" });
            }}
          >
            <MicrosoftSignInButton />
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint">
          Development workspace · read-only access
        </p>
      </div>
    </main>
  );
}
