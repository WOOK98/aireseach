import { useEffect } from "react";
import { View } from "react-native";
import { create } from "zustand";

import { MemberRole } from "@workspace/auth";
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
  filters: {},
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  reset: () =>
    set((state) => {
      const { q } = state.filters;
      const next: Record<string, string | string[] | null> = {};
      if (q) next.q = q;
      return { filters: next };
    }),
}));

interface MembersListFiltersProps {
  readonly onFiltersChange: (
    filters: Record<string, string | string[] | null>,
  ) => void;
}

export const MembersListFilters = ({
  onFiltersChange,
}: MembersListFiltersProps) => {
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
  const value = filters.q?.toString() ?? "";

  return (
    <View className="flex-1 flex-row items-center">
      <Input
        className="flex-1 pr-10"
        placeholder={`${t("search")}...`}
        value={value}
        onChangeText={(text) => {
          setFilter("q", text);
        }}
      />
      {value.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 z-10"
          onPress={() => setFilter("q", null)}
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
    (key) => key !== "q",
  ).length;

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <Button variant="outline" size="icon" className="relative size-10">
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

      <BottomSheetContent name="members-advanced-filters">
        <BottomSheetView className="gap-6">
          <RoleFilter />
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
    <View className="gap-2">
      <Text className="text-muted-foreground">{t("role")}</Text>
      {Object.values(MemberRole).map((role) => (
        <View key={role} className="flex-row items-center gap-3">
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
