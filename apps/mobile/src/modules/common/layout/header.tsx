import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { AccountSwitcher } from "~/modules/organization/account-switcher";

interface BaseHeaderProps {
  readonly onBack?: () => void;
  readonly title?: string;
}

export const BaseHeader = ({ onBack, title }: BaseHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-background"
      style={{
        paddingTop: Platform.select({
          ios: insets.top + 8,
          android: insets.top + 16,
        }),
      }}
    >
      <View className="h-12 w-full flex-row items-center justify-center gap-3 pb-1">
        {onBack && (
          <Button
            size="icon"
            variant="outline"
            onPress={() => onBack()}
            className="absolute bottom-2 left-6"
          >
            <Icons.ChevronLeft
              width={22}
              height={22}
              className="text-muted-foreground"
            />
          </Button>
        )}

        {title && (
          <Text className="font-sans-medium mt-0.5 leading-none">{title}</Text>
        )}
      </View>
    </View>
  );
};

export const UserHeader = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-background w-full flex-row items-center justify-between pr-6 pb-1 pl-4"
      style={{
        paddingTop: Platform.select({
          ios: insets.top,
          android: insets.top + 8,
        }),
      }}
    >
      <AccountSwitcher />
      <Button size="icon" variant="ghost">
        <Icons.Bell size={20} className="text-muted-foreground" />
      </Button>
    </View>
  );
};
