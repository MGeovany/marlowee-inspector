import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { highestRole } from "@/lib/authz";
import { NotesView } from "@/components/logs/notes-view";

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <NotesView
      role={highestRole(session.user.roles)}
      userEmail={session.user.email ?? null}
      signOutAction={signOutAction}
    />
  );
}
