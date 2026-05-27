import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@workspace/auth/server";
import { ExecutionSide, Platform } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";

import type { User } from "@workspace/auth/server";

const getHeaders = async () => {
  const newHeaders = new Headers(await headers());
  newHeaders.set(
    "x-client-platform",
    `${Platform.WEB}-${ExecutionSide.SERVER}`,
  );
  return newHeaders;
};

export const getSession = cache(async () => {
  const data = await auth.api.getSession({
    headers: await getHeaders(),
  });

  return {
    session: data?.session ?? null,
    user: data?.user ?? null,
  };
});

export const getOrganization = cache(
  async ({ id, slug }: { slug?: string; id?: string }) => {
    try {
      return await auth.api.getFullOrganization({
        query: {
          organizationId: id,
          organizationSlug: slug,
        },
        headers: await getHeaders(),
      });
    } catch (error) {
      logger.error(error);
      return null;
    }
  },
);

export const getInvitation = cache(async ({ id }: { id: string }) => {
  try {
    return await auth.api.getInvitation({
      query: {
        id,
      },
      headers: await getHeaders(),
    });
  } catch {
    return null;
  }
});

export const getUser = cache(async ({ id }: { id: string }) => {
  try {
    return (await auth.api.getUser({
      query: { id },
      headers: await getHeaders(),
    })) as User;
  } catch {
    return null;
  }
});

export const getMemberByUserId = cache(
  async ({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }) => {
    try {
      return (
        (
          await auth.api.listMembers({
            query: {
              organizationId,
              filterField: "userId",
              filterValue: userId,
              filterOperator: "eq",
            },
            headers: await getHeaders(),
          })
        ).members[0] ?? null
      );
    } catch {
      return null;
    }
  },
);
