import { i18nRouter } from "next-i18n-router";

import { config as i18nConfig } from "@workspace/i18n";

import { getAuthRedirectResponse } from "./auth-proxy";

import type { NextRequest } from "next/server";

export const proxy = (request: NextRequest) => {
  const authRedirect = getAuthRedirectResponse(request);

  if (authRedirect) {
    return authRedirect;
  }

  return i18nRouter(request, {
    locales: i18nConfig.locales,
    defaultLocale: "en",
    localeCookie: i18nConfig.cookie,
  });
};

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
  unstable_allowDynamic: ["**/node_modules/lodash*/**/*.js"],
};
