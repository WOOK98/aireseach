"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useDebounceCallback } from "@workspace/shared/hooks";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";

import { organization } from "../lib/api";

import type { MemberRole } from "@workspace/auth";

const DEBOUNCE_SET_ACTIVE_MS = 1000;

export const useActiveOrganization = () => {
  const session = authClient.useSession();

  const pathname = usePathname();
  const params = useParams();
  const slug = params.organization?.toString();
  const userId = session.data?.user.id ?? null;

  const allowRefetch = useMemo(
    () => !!(slug ?? pathname.startsWith(pathsConfig.dashboard.user.index)),
    [pathname, slug],
  );

  const activeOrganization = useQuery({
    ...organization.queries.get({ slug: slug ?? "" }),
    enabled: !!slug,
  });

  const activeOrganizationId = activeOrganization.data?.id ?? null;
  const { data: member } = useQuery({
    ...organization.queries.members.getByUserId({
      organizationId: activeOrganizationId ?? "",
      userId: userId ?? "",
    }),
    enabled: !!activeOrganizationId && !!userId,
  });

  const setActiveOrganization = useMutation({
    ...organization.mutations.setActive,
    onSuccess: async () => {
      await session.refetch();
    },
  });

  const debouncedSetActiveOrganization = useDebounceCallback(
    setActiveOrganization.mutate,
    DEBOUNCE_SET_ACTIVE_MS,
  );

  const activeMember = useMemo(() => {
    const data =
      member ??
      activeOrganization.data?.members.find(
        (member) => member.userId === userId,
      );
    return data ? { ...data, role: data.role as MemberRole } : null;
  }, [member, activeOrganization.data, userId]);

  const sessionActiveOrganizationId =
    session.data?.session.activeOrganizationId ?? null;

  const shouldUpdateActiveOrganization = useMemo(() => {
    return (
      !session.isPending &&
      !!session.data &&
      !(activeOrganization.isLoading && !activeOrganizationId) &&
      sessionActiveOrganizationId !== activeOrganizationId &&
      allowRefetch
    );
  }, [
    session.isPending,
    session.data,
    activeOrganization.isLoading,
    activeOrganizationId,
    sessionActiveOrganizationId,
    allowRefetch,
  ]);

  useEffect(() => {
    if (shouldUpdateActiveOrganization) {
      debouncedSetActiveOrganization({
        organizationId: activeOrganizationId,
      });
    }
  }, [
    shouldUpdateActiveOrganization,
    activeOrganizationId,
    debouncedSetActiveOrganization,
  ]);

  return {
    activeOrganization: activeOrganization.data,
    activeMember,
  };
};
