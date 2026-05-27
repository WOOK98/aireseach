import {
  createAuthClient,
  adminClient,
  anonymousClient,
  twoFactorClient,
  organizationClient,
  inferAdditionalFields,
} from "@workspace/auth/client/web";
import { Platform } from "@workspace/shared/constants";

import { getBaseUrl } from "~/lib/api";

import type { auth } from "@workspace/auth/server";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  fetchOptions: {
    headers: {
      "x-client-platform": Platform.EXTENSION,
    },
    throw: true,
  },
  plugins: [
    anonymousClient(),
    twoFactorClient(),
    organizationClient(),
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
