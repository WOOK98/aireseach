import { ac, roles } from "@workspace/auth";
import {
  createAuthClient,
  passkeyClient,
  lastLoginMethodClient,
  oneTapClient,
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  twoFactorClient,
  adminClient,
  organizationClient,
  inferAdditionalFields,
} from "@workspace/auth/client/web";
import { ExecutionSide, Platform } from "@workspace/shared/constants";

import envConfig from "../../../env.config";

import type { auth } from "@workspace/auth/server";

export const authClient = createAuthClient({
  fetchOptions: {
    headers: {
      "x-client-platform": `${Platform.WEB}-${ExecutionSide.CLIENT}`,
    },
    throw: true,
  },
  plugins: [
    anonymousClient(),
    emailOTPClient(),
    magicLinkClient(),
    twoFactorClient(),
    adminClient(),
    organizationClient({
      ac,
      roles,
    }),
    passkeyClient(),
    lastLoginMethodClient(),
    oneTapClient({
      clientId: envConfig.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID,
    }),
    inferAdditionalFields<typeof auth>(),
  ],
});
