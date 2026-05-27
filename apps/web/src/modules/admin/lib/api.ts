import { mutationOptions, queryOptions } from "@tanstack/react-query";

import {
  getInvitationsResponseSchema,
  getMembersResponseSchema,
  getOrganizationOrdersResponseSchema,
  getOrganizationSubscriptionsResponseSchema,
  getOrganizationResponseSchema,
  getUserAccountsResponseSchema,
  getUserInvitationsResponseSchema,
  getUserMembershipsResponseSchema,
  getUserOrdersResponseSchema,
  getUserSubscriptionsResponseSchema,
} from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";

import { api } from "~/lib/api/client";
import { authClient } from "~/lib/auth/client";

import type { User } from "@workspace/auth";
import type { InferRequestType } from "hono/client";

const KEY = "admin";

const queries = {
  users: {
    get: ({ id }: { id: string }) =>
      queryOptions({
        queryKey: [KEY, "users", id],
        queryFn: () =>
          authClient.admin.getUser({
            query: { id },
            fetchOptions: { throw: true },
          }) as Promise<User>,
      }),
    getAccounts: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.users)[":id"]["accounts"]["$get"]
    >["query"] & { id: string }) => ({
      queryKey: [KEY, "users", id, "accounts", query],
      queryFn: () =>
        handle(api.admin.users[":id"].accounts.$get, {
          schema: getUserAccountsResponseSchema,
        })({
          query,
          param: {
            id,
          },
        }),
    }),
    getSubscriptions: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.users)[":id"]["subscriptions"]["$get"]
    >["query"] & { id: string }) => ({
      queryKey: [KEY, "users", id, "subscriptions", query],
      queryFn: () =>
        handle(api.admin.users[":id"].subscriptions.$get, {
          schema: getUserSubscriptionsResponseSchema,
        })({ query, param: { id } }),
    }),
    getOrders: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.users)[":id"]["orders"]["$get"]
    >["query"] & { id: string }) => ({
      queryKey: [KEY, "users", id, "orders", query],
      queryFn: () =>
        handle(api.admin.users[":id"].orders.$get, {
          schema: getUserOrdersResponseSchema,
        })({ query, param: { id } }),
    }),
    getMemberships: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.users)[":id"]["memberships"]["$get"]
    >["query"] & { id: string }) =>
      queryOptions({
        queryKey: [KEY, "users", id, "memberships", query],
        queryFn: () =>
          handle(api.admin.users[":id"].memberships.$get, {
            schema: getUserMembershipsResponseSchema,
          })({ query, param: { id } }),
      }),
    getInvitations: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.users)[":id"]["invitations"]["$get"]
    >["query"] & { id: string }) =>
      queryOptions({
        queryKey: [KEY, "users", id, "invitations", query],
        queryFn: () =>
          handle(api.admin.users[":id"].invitations.$get, {
            schema: getUserInvitationsResponseSchema,
          })({ query, param: { id } }),
      }),
    getSessions: ({ id }: { id: string }) =>
      queryOptions({
        queryKey: [KEY, "users", id, "sessions"],
        queryFn: () =>
          authClient.admin.listUserSessions({
            userId: id,
            fetchOptions: { throw: true },
          }),
      }),
  },
  organizations: {
    get: ({ id }: { id: string }) =>
      queryOptions({
        queryKey: [KEY, "organizations", id],
        queryFn: () =>
          handle(api.admin.organizations[":id"].$get, {
            schema: getOrganizationResponseSchema,
          })({
            param: { id },
          }),
      }),
    getMembers: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.organizations)[":id"]["members"]["$get"]
    >["query"] & { id: string }) =>
      queryOptions({
        queryKey: [
          ...queries.organizations.get({ id }).queryKey,
          "members",
          query,
        ],
        queryFn: () =>
          handle(api.admin.organizations[":id"].members.$get, {
            schema: getMembersResponseSchema,
          })({
            query,
            param: {
              id,
            },
          }),
      }),
    getInvitations: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.organizations)[":id"]["invitations"]["$get"]
    >["query"] & { id: string }) =>
      queryOptions({
        queryKey: [
          ...queries.organizations.get({ id }).queryKey,
          "invitations",
          query,
        ],
        queryFn: () =>
          handle(api.admin.organizations[":id"].invitations.$get, {
            schema: getInvitationsResponseSchema,
          })({ query, param: { id } }),
      }),
    getSubscriptions: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.organizations)[":id"]["subscriptions"]["$get"]
    >["query"] & { id: string }) => ({
      queryKey: [
        ...queries.organizations.get({ id }).queryKey,
        "subscriptions",
        query,
      ],
      queryFn: () =>
        handle(api.admin.organizations[":id"].subscriptions.$get, {
          schema: getOrganizationSubscriptionsResponseSchema,
        })({ query, param: { id } }),
    }),
    getOrders: ({
      id,
      ...query
    }: InferRequestType<
      (typeof api.admin.organizations)[":id"]["orders"]["$get"]
    >["query"] & { id: string }) => ({
      queryKey: [
        ...queries.organizations.get({ id }).queryKey,
        "orders",
        query,
      ],
      queryFn: () =>
        handle(api.admin.organizations[":id"].orders.$get, {
          schema: getOrganizationOrdersResponseSchema,
        })({ query, param: { id } }),
    }),
  },
};

const mutations = {
  users: {
    ban: mutationOptions({
      mutationKey: [KEY, "users", "ban"],
      mutationFn: (params: Parameters<typeof authClient.admin.banUser>[0]) =>
        authClient.admin.banUser(params),
    }),
    unban: mutationOptions({
      mutationKey: [KEY, "users", "unban"],
      mutationFn: (params: Parameters<typeof authClient.admin.unbanUser>[0]) =>
        authClient.admin.unbanUser(params),
    }),
    delete: mutationOptions({
      mutationKey: [KEY, "users", "delete"],
      mutationFn: (params: Parameters<typeof authClient.admin.removeUser>[0]) =>
        authClient.admin.removeUser(params),
    }),
    impersonate: mutationOptions({
      mutationKey: [KEY, "users", "impersonate"],
      mutationFn: (
        params: Parameters<typeof authClient.admin.impersonateUser>[0],
      ) => authClient.admin.impersonateUser(params),
    }),
    stopImpersonating: mutationOptions({
      mutationKey: [KEY, "users", "impersonate", "stop"],
      mutationFn: () => authClient.admin.stopImpersonating(),
    }),
    update: mutationOptions({
      mutationKey: [KEY, "users", "update"],
      mutationFn: (params: Parameters<typeof authClient.admin.updateUser>[0]) =>
        authClient.admin.updateUser(params),
    }),
    setPassword: mutationOptions({
      mutationKey: [KEY, "users", "setPassword"],
      mutationFn: (
        params: Parameters<typeof authClient.admin.setUserPassword>[0],
      ) => authClient.admin.setUserPassword(params),
    }),
    accounts: {
      delete: mutationOptions({
        mutationKey: [KEY, "users", "accounts", "delete"],
        mutationFn: (
          param: InferRequestType<
            (typeof api.admin.users)[":id"]["accounts"][":accountId"]["$delete"]
          >["param"],
        ) =>
          handle(api.admin.users[":id"].accounts[":accountId"].$delete)({
            param,
          }),
      }),
    },
    sessions: {
      revoke: mutationOptions({
        mutationKey: [KEY, "users", "sessions", "revoke"],
        mutationFn: (
          params: Parameters<typeof authClient.admin.revokeUserSession>[0],
        ) => authClient.admin.revokeUserSession(params),
      }),
      revokeAll: mutationOptions({
        mutationKey: [KEY, "users", "sessions", "revokeAll"],
        mutationFn: (
          params: Parameters<typeof authClient.admin.revokeUserSessions>[0],
        ) => authClient.admin.revokeUserSessions(params),
      }),
    },
  },
  organizations: {
    delete: mutationOptions({
      mutationKey: [KEY, "organizations", "delete"],
      mutationFn: (
        param: InferRequestType<
          (typeof api.admin.organizations)[":id"]["$delete"]
        >["param"],
      ) =>
        handle(api.admin.organizations[":id"].$delete)({
          param,
        }),
    }),
    update: mutationOptions({
      mutationKey: [KEY, "organizations", "update"],
      mutationFn: ({
        id,
        ...json
      }: InferRequestType<
        (typeof api.admin.organizations)[":id"]["$patch"]
      >["json"] & { id: string }) =>
        handle(api.admin.organizations[":id"].$patch)({ param: { id }, json }),
    }),
    members: {
      remove: mutationOptions({
        mutationKey: [KEY, "organizations", "members", "remove"],
        mutationFn: (
          param: InferRequestType<
            (typeof api.admin.organizations)[":id"]["members"][":memberId"]["$delete"]
          >["param"],
        ) =>
          handle(api.admin.organizations[":id"].members[":memberId"].$delete)({
            param,
          }),
      }),
      update: mutationOptions({
        mutationKey: [KEY, "organizations", "members", "update"],
        mutationFn: ({
          id,
          memberId,
          ...json
        }: InferRequestType<
          (typeof api.admin.organizations)[":id"]["members"][":memberId"]["$patch"]
        >["json"] & { id: string; memberId: string }) =>
          handle(api.admin.organizations[":id"].members[":memberId"].$patch)({
            param: { id, memberId },
            json,
          }),
      }),
    },
    invitations: {
      delete: mutationOptions({
        mutationKey: [KEY, "organizations", "invitations", "delete"],
        mutationFn: (
          param: InferRequestType<
            (typeof api.admin.organizations)[":id"]["invitations"][":invitationId"]["$delete"]
          >["param"],
        ) =>
          handle(
            api.admin.organizations[":id"].invitations[":invitationId"].$delete,
          )({
            param,
          }),
      }),
    },
  },
};

export const admin = {
  queries,
  mutations,
} as const;
