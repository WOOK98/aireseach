import { useMemo } from "react";
import { Pressable } from "react-native";

import { cn } from "@workspace/ui";
import { Icons } from "@workspace/ui-mobile/icons";
import { Spin } from "@workspace/ui-mobile/spin";
import { TextClassContext } from "@workspace/ui-mobile/text";

interface SettingsTileProps {
  readonly icon: React.ElementType;
  readonly children: React.ReactNode;
  readonly onPress?: () => void;
  readonly destructive?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
}

export const SettingsTile = ({
  icon: Icon,
  onPress,
  children,
  destructive,
  loading = false,
  disabled = false,
}: SettingsTileProps) => {
  const textClassName = useMemo(
    () =>
      cn("mr-auto text-base", {
        "text-destructive": destructive,
      }),
    [destructive],
  );
  return (
    <Pressable
      hitSlop={4}
      className={cn(
        "bg-background active:bg-accent dark:active:bg-accent/50 flex-row items-center justify-between gap-4 px-6 py-3.5 transition-colors",
        {
          "opacity-50": disabled,
        },
      )}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon
        width={24}
        height={24}
        className={cn("text-muted-foreground", {
          "text-destructive": destructive,
        })}
      />
      <TextClassContext.Provider value={textClassName}>
        {children}
      </TextClassContext.Provider>

      {loading ? (
        <Spin>
          <Icons.Loader2
            className="text-muted-foreground"
            width={20}
            height={20}
          />
        </Spin>
      ) : (
        <Icons.ChevronRight
          className="text-muted-foreground"
          width={20}
          height={20}
        />
      )}
    </Pressable>
  );
};
