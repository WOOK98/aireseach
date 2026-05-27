import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Fragment } from "react/jsx-runtime";

import { useTranslation } from "@workspace/i18n";
import { pickBy } from "@workspace/shared/utils";
import { cn } from "@workspace/ui";
import { Text } from "@workspace/ui-mobile/text";

import { authClient } from "~/lib/auth";
import { organization } from "~/modules/organization/lib/api";

import { MembersListFilters } from "./members-list-filters";
import { MembersListItem, MembersListItemSkeleton } from "./members-list-item";

export const MembersList = () => {
  const { t } = useTranslation("common");
  const [filters, setFilters] = useState<
    Record<string, string | string[] | null>
  >({});

  const activeOrganization = authClient.useActiveOrganization();
  const perPage = 20;

  const params = {
    id: activeOrganization.data?.id ?? "",
    perPage: perPage.toString(),
    sort: JSON.stringify([{ id: "user.name", desc: false }]),
    ...pickBy(filters, Boolean),
  };

  const members = useInfiniteQuery(organization.queries.members.getAll(params));

  const data = members.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View className="flex-1 gap-2">
      <MembersListFilters onFiltersChange={setFilters} />
      <View className="border-border flex-1 overflow-hidden rounded-md border">
        <FlatList
          data={data}
          renderItem={({ item }) => <MembersListItem member={item} />}
          contentContainerClassName={cn({
            "flex-1": !data.length,
            "items-center justify-center": !data.length && !members.isLoading,
          })}
          ItemSeparatorComponent={() => (
            <View className="bg-border h-px w-full" />
          )}
          showsVerticalScrollIndicator={false}
          onEndReached={() => members.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            members.isFetchingNextPage && (
              <View>
                {Array.from({ length: 10 }).map((_, index) => (
                  <Fragment key={index}>
                    <View className="bg-border h-px w-full" />
                    <MembersListItemSkeleton />
                  </Fragment>
                ))}
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={members.isRefetching}
              onRefresh={() => members.refetch()}
              tintColorClassName="accent-primary"
              colorsClassName="accent-primary"
            />
          }
          ListEmptyComponent={
            members.isLoading ? (
              <View className="w-full items-start">
                {Array.from({ length: 15 }).map((_, index, arr) => (
                  <Fragment key={index}>
                    <MembersListItemSkeleton />
                    {index !== arr.length - 1 && (
                      <View className="bg-border h-px w-full" />
                    )}
                  </Fragment>
                ))}
              </View>
            ) : (
              <Text>{t("noResults")}</Text>
            )
          }
        />
      </View>
    </View>
  );
};
