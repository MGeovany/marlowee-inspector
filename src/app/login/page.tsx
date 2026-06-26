import Image from "next/image";

import { authProviderId, devBypass, signIn } from "@/auth";
import { MicrosoftSignInButton } from "@/components/microsoft-sign-in-button";
import brandIcon from "../icon.png";

export default function LoginPage() {
  return (
    <main className="ambient-bg relative flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="relative z-[1] w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="glass-card mb-4 flex h-14 w-14 items-center justify-center rounded-xl">
            <Image
              src={brandIcon}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-cover"
              priority
            />
          </div>
          <h1 className="font-heading text-xl font-semibold text-fg">Marlowee Inspector</h1>
          <p className="mt-1 text-[12px] text-fg-subtle">
            Internal log viewer · Savvly dev workspace
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <p className="section-label mb-4">
            {devBypass ? "Local dev · no Azure login" : "Employee access only"}
          </p>

          <form
            action={async () => {
              "use server";
              await signIn(authProviderId, { redirectTo: "/" });
            }}
          >
            {devBypass ? (
              <button
                type="submit"
                className="motion-press flex w-full items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-accent-bright to-accent px-3 py-2.5 text-[13px] font-semibold text-black hover:from-[#6dffc0] hover:to-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
              >
                Continue as Dev ({process.env.AUTH_DEV_ROLE ?? "Admin"})
              </button>
            ) : (
              <MicrosoftSignInButton />
            )}
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-fg-subtle">
          law-savvly-dev-main · read-only · 30d retention
        </p>
      </div>
    </main>
  );
}
