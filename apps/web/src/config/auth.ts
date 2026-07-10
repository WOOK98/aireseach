import { SocialProvider, authConfigSchema } from "@workspace/auth";

import env from "../../env.config";

import type { AuthConfig } from "@workspace/auth";

const toBool = (value: boolean | string) =>
  typeof value === "boolean" ? value : value === "true";

const oAuthProviders = [
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? [SocialProvider.GOOGLE]
    : []),
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? [SocialProvider.GITHUB]
    : []),
];

const anonymousEnabled =
  toBool(env.NEXT_PUBLIC_AUTH_ANONYMOUS) || env.VERCEL_ENV === "preview";

export const authConfig = authConfigSchema.parse({
  providers: {
    password: toBool(env.NEXT_PUBLIC_AUTH_PASSWORD),
    magicLink: toBool(env.NEXT_PUBLIC_AUTH_MAGIC_LINK),
    emailOtp: toBool(env.NEXT_PUBLIC_AUTH_EMAIL_OTP),
    passkey: toBool(env.NEXT_PUBLIC_AUTH_PASSKEY),
    anonymous: anonymousEnabled,
    oAuth: oAuthProviders,
  },
}) satisfies AuthConfig;
