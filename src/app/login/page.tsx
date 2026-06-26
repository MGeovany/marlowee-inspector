import Image from "next/image";

import { authProviderId, devBypass, signIn } from "@/auth";
import { MicrosoftSignInButton } from "@/components/microsoft-sign-in-button";
import brandIcon from "../icon.png";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <Image
            src={brandIcon}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] rounded-sm object-cover"
            priority
          />
          <div>
            <h1 className="font-heading text-[13px] tracking-tight text-fg">Marlowee Inspector</h1>
            <p className="mt-0.5 text-[11px] text-fg-subtle">Internal log viewer · Savvly dev workspace</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-sidebar p-5">
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
                className="flex w-full items-center justify-center rounded-sm border border-border bg-panel px-3 py-2 text-micro font-medium text-fg transition-colors hover:border-border-strong hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
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
