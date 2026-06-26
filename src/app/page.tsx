import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">Marlowee Inspector</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Log viewer</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Signed in as {session?.user?.email ?? session?.user?.name ?? "unknown user"}.
      </p>
    </main>
  );
}
