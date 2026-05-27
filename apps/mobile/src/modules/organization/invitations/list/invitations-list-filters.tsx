import { useEffect } from "react";
import { View } from "react-native";
import { create } from "zustand";

import { InvitationStatus, MemberRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { useDebounceCallback } from "@workspace/shared/hooks";
import { pickBy } from "@workspace/shared/utils";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Checkbox } from "@workspace/ui-mobile/checkbox";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Text } from "@workspace/ui-mobile/text";

interface FiltersState {
  filters: Record<string, string | string[] | null>;
  setFilter: (key: string, value: string | string[] | null) => void;
  reset: () => void;
}
const useFiltersStore = create<FiltersState>((set) => ({
  filters: {
    status: [InvitationStatus.PENDING],
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  reset: () =>
    set((state) => {
      const { email } = state.filters;
      const next: Record<string, string | string[] | null> = {};
      if (email) next.email = email;
      return { filters: next };
    }),
}));

interface InvitationsListFiltersProps {
  readonly onFiltersChange: (
    filters: Record<string, string | string[] | null>,
  ) => void;
}

export const InvitationsListFilters = ({
  onFiltersChange,
}: InvitationsListFiltersProps) => {
  const { filters } = useFiltersStore();

  const debouncedOnFiltersChange = useDebounceCallback(onFiltersChange, 500);

  useEffect(() => {
    debouncedOnFiltersChange(filters);
  }, [filters, debouncedOnFiltersChange]);

  return (
    <View className="flex-row items-center gap-2">
      <Search />
      <AdvancedFilters />
    </View>
  );
};

const Search = () => {
  const { t } = useTranslation("common");
  const { filters, setFilter } = useFiltersStore();
  const value = filters.email?.toString() ?? "";

  return (
    <View className="flex-1 flex-row items-center">
      <Input
        className="flex-1 pr-10"
        placeholder={`${t("search")}...`}
        value={value}
        onChangeText={(text) => {
          setFilter("email", text);
        }}
      />
      {value.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 z-10"
          onPress={() => setFilter("email", null)}
          accessibilityLabel={t("clear")}
        >
          <Icons.X size={16} className="text-muted-foreground" />
        </Button>
      )}
    </View>
  );
};

const AdvancedFilters = () => {
  const { t } = useTranslation("common");
  const { reset, filters } = useFiltersStore();

  const advancedFilterCount = Object.keys(pickBy(filters, Boolean)).filter(
    (key) => key !== "email",
  ).length;

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-10 shrink-0"
        >
          <Icons.ListFilter size={18} className="text-muted-foreground" />
          {advancedFilterCount > 0 && (
            <View className="bg-primary absolute -top-1.5 -right-1.5 size-4 items-center justify-center rounded-full">
              <Text className="text-primary-foreground text-xs">
                {advancedFilterCount}
              </Text>
            </View>
          )}
        </Button>
      </BottomSheetOpenTrigger>

      <BottomSheetContent name="invitations-advanced-filters">
        <BottomSheetView className="gap-6">
          <View className="flex-row gap-2">
            <StatusFilter />
            <RoleFilter />
          </View>
          <View className="flex-row gap-2">
            <BottomSheetCloseTrigger asChild>
              <Button
                variant="outline"
                onPress={() => reset()}
                className="grow"
              >
                <Text>{t("reset")}</Text>
              </Button>
            </BottomSheetCloseTrigger>
            <BottomSheetCloseTrigger asChild>
              <Button className="grow">
                <Text>{t("save")}</Text>
              </Button>
            </BottomSheetCloseTrigger>
          </View>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
};

const StatusFilter = () => {
  const { t } = useTranslation("common");
  const { filters, setFilter } = useFiltersStore();

  const selectedStatuses = Array.isArray(filters.status)
    ? filters.status
    : typeof filters.status === "string"
      ? [filters.status]
      : [];

  function toggleStatus(status: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selectedStatuses, status]))
      : selectedStatuses.filter((s) => s !== status);
    setFilter("status", next.length ? next : null);
  }

  return (
    <View className="grow gap-2">
      <Text className="text-muted-foreground">{t("status")}</Text>
      {Object.values(InvitationStatus).map((status) => (
        <View key={status} className="flex-row items-center gap-3">
          <Checkbox
            checked={selectedStatuses.includes(status)}
            onCheckedChange={(value) => toggleStatus(status, value)}
          />
          <Text
            onPress={() =>
              toggleStatus(status, !selectedStatuses.includes(status))
            }
            className="text-sm"
          >
            {t(status)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const RoleFilter = () => {
  const { t } = useTranslation("common");
  const { filters, setFilter } = useFiltersStore();

  const selectedRoles = Array.isArray(filters.role)
    ? filters.role
    : typeof filters.role === "string"
      ? [filters.role]
      : [];

  function toggleRole(role: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selectedRoles, role]))
      : selectedRoles.filter((r) => r !== role);
    setFilter("role", next.length ? next : null);
  }

  return (
    <View className="grow gap-2">
      <Text className="text-muted-foreground">{t("role")}</Text>
      {Object.values(MemberRole).map((role) => (
        <View key={role} className="flex-row items-center gap-2">
          <Checkbox
            checked={selectedRoles.includes(role)}
            onCheckedChange={(value) => toggleRole(role, value)}
          />
          <Text
            onPress={() => toggleRole(role, !selectedRoles.includes(role))}
            className="text-sm"
          >
            {t(role)}
          </Text>
        </View>
      ))}
    </View>
  );
};
