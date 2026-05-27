import { Platform } from "react-native";

import { SocialProvider, authConfigSchema } from "@workspace/auth";

import env from "../../env.config";

import type { AuthConfig } from "@workspace/auth";

export const authConfig = authConfigSchema.parse({
  providers: {
    password: env.EXPO_PUBLIC_AUTH_PASSWORD,
    magicLink: env.EXPO_PUBLIC_AUTH_MAGIC_LINK,
    emailOtp: env.EXPO_PUBLIC_AUTH_EMAIL_OTP,
    anonymous: env.EXPO_PUBLIC_AUTH_ANONYMOUS,
    oAuth: [
      Platform.select({
        android: SocialProvider.GOOGLE,
        ios: SocialProvider.APPLE,
      }),
      SocialProvider.GITHUB,
    ],
  },
}) satisfies AuthConfig;
