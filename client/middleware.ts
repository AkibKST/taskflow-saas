import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge route protection. Redirects unauthenticated visitors away from app
 * routes before the protected page renders (stops the "flash then redirect"
 * and the reliance on client-only guards).
 *
 * It checks the `tf_session` presence flag (set on the client domain at login).
 * This is a UX/defense-in-depth gate, NOT the security boundary — every API
 * request is still authorized by bearer token on the server.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/my-tasks",
  "/calendar",
  "/notifications",
  "/team",
  "/settings",
  "/admin",
  "/profile",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.get("tf_session")?.value === "1";

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in → skip the auth pages.
  if (AUTH_PAGES.includes(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
