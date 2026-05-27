import { SocialProvider, authConfigSchema } from "@workspace/auth";

import env from "../../env.config";

import type { AuthConfig } from "@workspace/auth";

export const authConfig = authConfigSchema.parse({
  providers: {
    password: env.NEXT_PUBLIC_AUTH_PASSWORD,
    magicLink: env.NEXT_PUBLIC_AUTH_MAGIC_LINK,
    emailOtp: env.NEXT_PUBLIC_AUTH_EMAIL_OTP,
    passkey: env.NEXT_PUBLIC_AUTH_PASSKEY,
    anonymous: env.NEXT_PUBLIC_AUTH_ANONYMOUS,
    oAuth: [SocialProvider.APPLE, SocialProvider.GOOGLE, SocialProvider.GITHUB],
  },
}) satisfies AuthConfig;
