import { auth } from "@/auth";

/**
 * Session guard. Unauthenticated requests to app/API routes are redirected to sign-in.
 * Auth routes and static assets are excluded via the matcher below.
 */
const PUBLIC_PREFIXES = ["/api/auth", "/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default auth((req) => {
  if (!req.auth && !isPublicPath(req.nextUrl.pathname)) {
    const signInUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:woff2?|png|svg)).*)"],
};
