import { memo } from "react";
import { View } from "react-native";

import { Text } from "@workspace/ui-mobile/text";

interface AuthHeaderProps {
  readonly title: React.ReactNode;
  readonly description: React.ReactNode;
}

export const AuthHeader = memo<AuthHeaderProps>(({ title, description }) => {
  return (
    <View className="gap-1">
      <Text className="font-sans-bold text-3xl tracking-tighter">{title}</Text>
      <Text className="text-muted-foreground text-sm">{description}</Text>
    </View>
  );
});

AuthHeader.displayName = "AuthHeader";
