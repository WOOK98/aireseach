import { mutationOptions, queryOptions } from "@tanstack/react-query";
import * as Linking from "expo-linking";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";

const KEY = "user";

const queries = {
  invitations: {
    getAll: queryOptions({
      queryKey: [KEY, "invitations"],
      queryFn: () =>
        authClient.organization.listUserInvitations({
          fetchOptions: { throw: true },
        }),
    }),
  },
};

const mutations = {
  delete: {
    user: mutationOptions({
      mutationKey: [KEY, "delete"],
      mutationFn: (params: Parameters<typeof authClient.deleteUser>[0]) =>
        authClient.deleteUser(params, {
          headers: {
            "x-url": Linking.createURL(
              pathsConfig.dashboard.user.settings.index,
            ),
          },
        }),
    }),
    anonymous: mutationOptions({
      mutationKey: [KEY, "delete", "anonymous"],
      mutationFn: (
        params?: Parameters<typeof authClient.deleteAnonymousUser>[0],
      ) => authClient.deleteAnonymousUser(params),
    }),
  },
  update: mutationOptions({
    mutationKey: [KEY, "update"],
    mutationFn: (params: Parameters<typeof authClient.updateUser>[0]) =>
      authClient.updateUser(params),
  }),
};

export const user = {
  queries,
  mutations,
} as const;
