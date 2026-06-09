import { authConfigSchema } from "@workspace/auth";

import env from "../../env.config";

import type { AuthConfig } from "@workspace/auth";

const toBool = (value: boolean | string) =>
  typeof value === "boolean" ? value : value === "true";

export const authConfig = authConfigSchema.parse({
  providers: {
    password: toBool(env.NEXT_PUBLIC_AUTH_PASSWORD),
    magicLink: toBool(env.NEXT_PUBLIC_AUTH_MAGIC_LINK),
    emailOtp: toBool(env.NEXT_PUBLIC_AUTH_EMAIL_OTP),
    passkey: toBool(env.NEXT_PUBLIC_AUTH_PASSKEY),
    anonymous: toBool(env.NEXT_PUBLIC_AUTH_ANONYMOUS),
    oAuth: [],
  },
}) satisfies AuthConfig;
