import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

/**
 * Auth.js v5 configuration for Microsoft Entra ID (OIDC).
 *
 * App Roles assigned in the "SavLogs" App Registration arrive in the token `roles`
 * claim. We copy that claim into the JWT and expose it on the session so the
 * backend can authorize by role. No Azure credentials ever reach the client.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      // App Roles claim: string[] (e.g. ["Developer"]). Empty if none assigned.
      if (profile && Array.isArray((profile as Record<string, unknown>).roles)) {
        token.roles = (profile as Record<string, unknown>).roles as string[];
      }
      if (profile?.oid) token.oid = profile.oid as string;
      return token;
    },
    async session({ session, token }) {
      session.user.roles = (token.roles as string[]) ?? [];
      session.user.oid = (token.oid as string) ?? null;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      oid: string | null;
    };
  }
}
