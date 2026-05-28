import { i18nRouter } from "next-i18n-router";

import { config as i18nConfig } from "@workspace/i18n";
import { getLocaleFromRequest } from "@workspace/i18n/server";

import { appConfig } from "~/config/app";

import env from "../env.config";
import { getAuthRedirectResponse } from "./auth-proxy";

import type { NextRequest } from "next/server";

export const proxy = (request: NextRequest) => {
  const authRedirect = getAuthRedirectResponse(request);

  if (authRedirect) {
    return authRedirect;
  }

  return i18nRouter(request, {
    locales: i18nConfig.locales,
    defaultLocale:
      appConfig.locale || env.DEFAULT_LOCALE || i18nConfig.defaultLocale,
    localeCookie: i18nConfig.cookie,
    localeDetector: getLocaleFromRequest,
  });
};

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)",
  unstable_allowDynamic: ["**/node_modules/lodash*/**/*.js"],
};
