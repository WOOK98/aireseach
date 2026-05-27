import { AuthProvider } from "@workspace/auth";

export const LOGIN_OPTIONS = [
  AuthProvider.PASSWORD,
  AuthProvider.MAGIC_LINK,
  AuthProvider.EMAIL_OTP,
];

export type LoginOption = (typeof LOGIN_OPTIONS)[number];
