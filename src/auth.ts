import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js v5 configuration for Microsoft Entra ID (OIDC).
 *
 * App Roles assigned in the "Marlowee Inspector" App Registration arrive in the token `roles`
 * claim. We copy that claim into the JWT and expose it on the session so the
 * backend can authorize by role. No Azure credentials ever reach the client.
 *
 * Local dev bypass: when no Entra client id is configured
 * (`AUTH_MICROSOFT_ENTRA_ID_ID` empty), we swap the OIDC provider for a
 * one-click Credentials provider that mints a dev session. This lets the UI and
 * log viewer run with zero Azure changes — Log Analytics queries use `az login`
 * (DefaultAzureCredential), not this app registration. The dev session's role is
 * read from `AUTH_DEV_ROLE` (defaults to `Admin`) so the §4 permission matrix can
 * be exercised locally. The Entra provider is used as soon as a client id exists.
 */
export const devBypass = !process.env.AUTH_MICROSOFT_ENTRA_ID_ID;

/** Provider id the login page must hand to `signIn()` for the active mode. */
export const authProviderId = devBypass ? "credentials" : "microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  providers: devBypass
    ? [
        Credentials({
          id: "credentials",
          name: "Dev login",
          credentials: {},
          authorize: () => ({
            id: "dev",
            name: "Dev (local)",
            email: "marlon@savvly.com",
            roles: [process.env.AUTH_DEV_ROLE ?? "Admin"],
            oid: "dev-oid",
          }),
        }),
      ]
    : [
        MicrosoftEntraID({
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
        }),
      ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile, user }) {
      // Entra path: App Roles claim is a string[] (e.g. ["Developer"]) on the profile.
      if (profile && Array.isArray((profile as Record<string, unknown>).roles)) {
        token.roles = (profile as Record<string, unknown>).roles as string[];
      }
      if (profile?.oid) token.oid = profile.oid as string;
      // Dev bypass path: the Credentials `authorize` return arrives as `user` on first sign-in.
      if (user && Array.isArray((user as Record<string, unknown>).roles)) {
        token.roles = (user as Record<string, unknown>).roles as string[];
        token.oid = ((user as Record<string, unknown>).oid as string) ?? null;
      }
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

  interface User {
    roles?: string[];
    oid?: string | null;
  }
}
