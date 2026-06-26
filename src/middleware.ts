import { auth } from "@/auth";

/**
 * Session guard. Unauthenticated requests to app/API routes are redirected to sign-in.
 * Auth routes and static assets are excluded via the matcher below.
 */
export default auth((req) => {
  if (!req.auth && !req.nextUrl.pathname.startsWith("/api/auth")) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:woff2?|png|svg)).*)"],
};
