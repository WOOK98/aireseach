import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
} from "@tanstack/react-query";
import * as Linking from "expo-linking";

import {
  getInvitationsResponseSchema,
  getMembersResponseSchema,
} from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth";

import type { InferRequestType } from "hono/client";

const KEY = "organizations";

const queries = {
  get: (params: { slug: string } | { id: string }) =>
    queryOptions({
      queryKey: [KEY, params],
      queryFn: () =>
        authClient.organization.getFullOrganization({
          query:
            "id" in params
              ? { organizationId: params.id }
              : { organizationSlug: params.slug },
          fetchOptions: {
            throw: true,
          },
        }),
    }),
  members: {
    getAll: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.organizations)[":id"]["members"]["$get"]
    >["query"] & { id: string }) =>
      infiniteQueryOptions({
        queryKey: [...queries.get({ id }).queryKey, "members", query],
        queryFn: ({ pageParam }) =>
          handle(api.organizations[":id"].members.$get, {
            schema: getMembersResponseSchema,
          })({
            query: {
              ...query,
              page: pageParam.toString(),
            },
            param: {
              id,
            },
          }),
        initialPageParam: 1,
        getNextPageParam: ({ total }, pages) =>
          total > pages.length * Number(query.perPage)
            ? pages.length + 1
            : undefined,
      }),
  },
  invitations: {
    get: ({ id }: { id: string }) =>
      queryOptions({
        queryKey: [...queries.get({ id }).queryKey, "invitations"],
        queryFn: () =>
          authClient.organization.getInvitation({
            query: {
              id,
            },
            fetchOptions: {
              throw: true,
            },
          }),
      }),
    getAll: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.organizations)[":id"]["invitations"]["$get"]
    >["query"] & { id: string }) =>
      infiniteQueryOptions({
        queryKey: [...queries.get({ id }).queryKey, "invitations", query],
        queryFn: ({ pageParam }) =>
          handle(api.organizations[":id"].invitations.$get, {
            schema: getInvitationsResponseSchema,
          })({
            query: {
              ...query,
              page: pageParam.toString(),
            },
            param: {
              id,
            },
          }),
        initialPageParam: 1,
        getNextPageParam: ({ total }, pages) =>
          total > pages.length * Number(query.perPage)
            ? pages.length + 1
            : undefined,
      }),
  },
  canLeave: ({ id }: { id: string }) =>
    queryOptions({
      queryKey: [KEY, "can-leave", id],
      queryFn: () =>
        handle(api.organizations[":id"]["can-leave"].$get)({ param: { id } }),
    }),
  getBlockingAccountDeletion: queryOptions({
    queryKey: [KEY, "blocking-account-deletion"],
    queryFn: () =>
      handle(api.organizations["blocking-account-deletion"].$get)({}),
  }),
};

const mutations = {
  getSlug: mutationOptions({
    mutationKey: [KEY, "slug"],
    mutationFn: (data: InferRequestType<typeof api.organizations.slug.$get>) =>
      handle(api.organizations.slug.$get)(data),
  }),
  setActive: mutationOptions({
    mutationKey: [KEY, "active"],
    mutationFn: (
      params: Parameters<typeof authClient.organization.setActive>[0],
    ) => authClient.organization.setActive(params),
  }),
  delete: mutationOptions({
    mutationKey: [KEY, "delete"],
    mutationFn: (
      params: Parameters<typeof authClient.organization.delete>[0],
    ) => authClient.organization.delete(params),
  }),
  leave: mutationOptions({
    mutationKey: [KEY, "members", "leave"],
    mutationFn: (params: Parameters<typeof authClient.organization.leave>[0]) =>
      authClient.organization.leave(params),
  }),
  create: mutationOptions({
    mutationKey: [KEY, "create"],
    mutationFn: (
      params: Parameters<typeof authClient.organization.create>[0],
    ) =>
      authClient.organization.create({
        ...params,
        fetchOptions: { throw: true },
      }),
  }),
  update: mutationOptions({
    mutationKey: [KEY, "update"],
    mutationFn: (
      params: Parameters<typeof authClient.organization.update>[0],
    ) => authClient.organization.update(params),
  }),
  invitations: {
    accept: mutationOptions({
      mutationKey: [KEY, "invitations", "accept"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.acceptInvitation>[0],
      ) => authClient.organization.acceptInvitation(params),
    }),
    reject: mutationOptions({
      mutationKey: [KEY, "invitations", "reject"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.rejectInvitation>[0],
      ) => authClient.organization.rejectInvitation(params),
    }),
    cancel: mutationOptions({
      mutationKey: [KEY, "invitations", "cancel"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.cancelInvitation>[0],
      ) => authClient.organization.cancelInvitation(params),
    }),
    resend: mutationOptions({
      mutationKey: [KEY, "invitations", "resend"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.inviteMember>[0],
      ) =>
        authClient.organization.inviteMember(
          {
            ...params,
            resend: true,
          },
          {
            headers: {
              "x-url": Linking.createURL(pathsConfig.setup.auth.join),
            },
          },
        ),
    }),
  },
  members: {
    remove: mutationOptions({
      mutationKey: [KEY, "members", "remove"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.removeMember>[0],
      ) => authClient.organization.removeMember(params),
    }),
    invite: mutationOptions({
      mutationKey: [KEY, "members", "invite"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.inviteMember>[0],
      ) =>
        authClient.organization.inviteMember(params, {
          headers: {
            "x-url": Linking.createURL(pathsConfig.setup.auth.join),
          },
        }),
    }),
    updateRole: mutationOptions({
      mutationKey: [KEY, "members", "update-role"],
      mutationFn: (
        params: Parameters<typeof authClient.organization.updateMemberRole>[0],
      ) => authClient.organization.updateMemberRole(params),
    }),
  },
};

export const organization = {
  queries,
  mutations,
} as const;
