import { handlers } from "@/auth";

/**
 * Auth.js v5 catch-all route. Mounts the sign-in, callback, sign-out, and
 * session endpoints under /api/auth/*. The handlers come from the NextAuth
 * config in src/auth.ts.
 */
export const { GET, POST } = handlers;
