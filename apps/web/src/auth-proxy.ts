import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];

const normalizePathname = (pathname: string) => {
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (maybeLocale && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(maybeLocale)) {
    return `/${rest.join("/")}`;
  }

  return pathname;
};

const matchesRoute = (pathname: string, routes: string[]) =>
  routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export const getAuthRedirectResponse = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const normalizedPathname = normalizePathname(pathname);
  const sessionCookie =
    request.cookies.get("turbostarter.session_token") ||
    request.cookies.get("__Secure-turbostarter.session_token");
  const isAuthenticated = !!sessionCookie?.value;

  if (
    matchesRoute(normalizedPathname, PROTECTED_PREFIXES) &&
    !isAuthenticated
  ) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return null;
};
