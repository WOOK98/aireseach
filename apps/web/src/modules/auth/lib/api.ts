import { mutationOptions, queryOptions } from "@tanstack/react-query";

import { authClient } from "~/lib/auth/client";

const KEY = "auth";

const queries = {
  sessions: {
    getAll: queryOptions({
      queryKey: [KEY, "sessions"],
      queryFn: () =>
        authClient.listSessions({
          fetchOptions: {
            throw: true,
          },
        }),
    }),
  },
  accounts: {
    getAll: queryOptions({
      queryKey: [KEY, "accounts"],
      queryFn: () => authClient.listAccounts({ fetchOptions: { throw: true } }),
    }),
  },
  passkeys: {
    getAll: queryOptions({
      queryKey: [KEY, "passkeys"],
      queryFn: () =>
        authClient.passkey.listUserPasskeys({ fetchOptions: { throw: true } }),
    }),
  },
};

const mutations = {
  signIn: {
    email: mutationOptions({
      mutationKey: [KEY, "signIn", "email"],
      mutationFn: (params: Parameters<typeof authClient.signIn.email>[0]) =>
        authClient.signIn.email(params),
    }),
    magicLink: mutationOptions({
      mutationKey: [KEY, "signIn", "magicLink"],
      mutationFn: (params: Parameters<typeof authClient.signIn.magicLink>[0]) =>
        authClient.signIn.magicLink(params),
    }),
    emailOtp: mutationOptions({
      mutationKey: [KEY, "signIn", "emailOtp"],
      mutationFn: (params: Parameters<typeof authClient.signIn.emailOtp>[0]) =>
        authClient.signIn.emailOtp(params),
    }),
    anonymous: mutationOptions({
      mutationKey: [KEY, "signIn", "anonymous"],
      mutationFn: (
        params?: Parameters<typeof authClient.signIn.anonymous>[0],
      ) => authClient.signIn.anonymous(params),
    }),
    social: mutationOptions({
      mutationKey: [KEY, "signIn", "social"],
      mutationFn: (params: Parameters<typeof authClient.signIn.social>[0]) =>
        authClient.signIn.social(params),
    }),
    passkey: mutationOptions({
      mutationKey: [KEY, "signIn", "passkey"],
      mutationFn: (params?: Parameters<typeof authClient.signIn.passkey>[0]) =>
        authClient.signIn.passkey(params),
    }),
  },
  password: {
    forget: mutationOptions({
      mutationKey: [KEY, "password", "forget"],
      mutationFn: (
        params: Parameters<typeof authClient.requestPasswordReset>[0],
      ) => authClient.requestPasswordReset(params),
    }),
    reset: mutationOptions({
      mutationKey: [KEY, "password", "update"],
      mutationFn: (params: Parameters<typeof authClient.resetPassword>[0]) =>
        authClient.resetPassword(params),
    }),
    change: mutationOptions({
      mutationKey: [KEY, "password", "change"],
      mutationFn: (params: Parameters<typeof authClient.changePassword>[0]) =>
        authClient.changePassword(params),
    }),
  },
  signOut: mutationOptions({
    mutationKey: [KEY, "signOut"],
    mutationFn: (params: Parameters<typeof authClient.signOut>[0]) =>
      authClient.signOut(params),
  }),
  signUp: {
    email: mutationOptions({
      mutationKey: [KEY, "signUp", "email"],
      mutationFn: (params: Parameters<typeof authClient.signUp.email>[0]) =>
        authClient.signUp.email(params),
    }),
  },
  twoFactor: {
    enable: mutationOptions({
      mutationKey: [KEY, "twoFactor", "enable"],
      mutationFn: (params: Parameters<typeof authClient.twoFactor.enable>[0]) =>
        authClient.twoFactor.enable({
          ...params,
          fetchOptions: { throw: true },
        }),
    }),
    disable: mutationOptions({
      mutationKey: [KEY, "twoFactor", "disable"],
      mutationFn: (
        params: Parameters<typeof authClient.twoFactor.disable>[0],
      ) => authClient.twoFactor.disable(params),
    }),
    backupCodes: {
      generate: mutationOptions({
        mutationKey: [KEY, "twoFactor", "backupCodes", "generate"],
        mutationFn: (
          params: Parameters<
            typeof authClient.twoFactor.generateBackupCodes
          >[0],
        ) =>
          authClient.twoFactor.generateBackupCodes({
            ...params,
            fetchOptions: {
              throw: true,
            },
          }),
      }),
      verify: mutationOptions({
        mutationKey: [KEY, "twoFactor", "backupCodes", "verify"],
        mutationFn: (
          params: Parameters<typeof authClient.twoFactor.verifyBackupCode>[0],
        ) => authClient.twoFactor.verifyBackupCode(params),
      }),
    },
    totp: {
      getUri: mutationOptions({
        mutationKey: [KEY, "twoFactor", "totp", "getUri"],
        mutationFn: (
          params: Parameters<typeof authClient.twoFactor.getTotpUri>[0],
        ) =>
          authClient.twoFactor.getTotpUri({
            ...params,
            fetchOptions: { throw: true },
          }),
      }),
      verify: mutationOptions({
        mutationKey: [KEY, "twoFactor", "totp", "verify"],
        mutationFn: (
          params: Parameters<typeof authClient.twoFactor.verifyTotp>[0],
        ) => authClient.twoFactor.verifyTotp(params),
      }),
    },
  },
  emailOtp: {
    sendVerificationOtp: mutationOptions({
      mutationKey: [KEY, "emailOtp", "sendVerificationOtp"],
      mutationFn: (
        params: Parameters<typeof authClient.emailOtp.sendVerificationOtp>[0],
      ) => authClient.emailOtp.sendVerificationOtp(params),
    }),
  },
  email: {
    sendVerification: mutationOptions({
      mutationKey: [KEY, "email", "sendVerification"],
      mutationFn: (
        params: Parameters<typeof authClient.sendVerificationEmail>[0],
      ) => authClient.sendVerificationEmail(params),
    }),
    change: mutationOptions({
      mutationKey: [KEY, "email", "change"],
      mutationFn: (params: Parameters<typeof authClient.changeEmail>[0]) =>
        authClient.changeEmail(params),
    }),
  },
  sessions: {
    revoke: mutationOptions({
      mutationKey: [KEY, "sessions", "revoke"],
      mutationFn: (token: string) => authClient.revokeSession({ token }),
    }),
  },
  accounts: {
    connect: mutationOptions({
      mutationKey: [KEY, "accounts", "connect"],
      mutationFn: (params: Parameters<typeof authClient.linkSocial>[0]) =>
        authClient.linkSocial(params),
    }),
    disconnect: mutationOptions({
      mutationKey: [KEY, "accounts", "disconnect"],
      mutationFn: (params: Parameters<typeof authClient.unlinkAccount>[0]) =>
        authClient.unlinkAccount(params),
    }),
  },
  passkeys: {
    add: mutationOptions({
      mutationKey: [KEY, "passkeys", "add"],
      mutationFn: async () => {
        const response = await authClient.passkey.addPasskey();
        if (response.error) {
          const { message, statusText } = response.error;
          throw new Error(typeof message === "string" ? message : statusText);
        }
        return response.data;
      },
    }),
    delete: mutationOptions({
      mutationKey: [KEY, "passkeys", "delete"],
      mutationFn: (
        params: Parameters<typeof authClient.passkey.deletePasskey>[0],
      ) => authClient.passkey.deletePasskey(params),
    }),
  },
};

export const auth = {
  queries,
  mutations,
} as const;
