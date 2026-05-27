import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import * as React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { FadeIn } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

import { cn } from "@workspace/ui";

import { Icons } from "./icons";
import { TextClassContext } from "./text";

import type { StyleProp, TextProps, ViewStyle } from "react-native";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: DropdownMenuPrimitive.SubTriggerProps &
  React.RefAttributes<DropdownMenuPrimitive.SubTriggerRef> & {
    children?: React.ReactNode;
    iconClassName?: string;
    inset?: boolean;
  }) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const Icon = open ? Icons.ChevronUp : Icons.ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        "group-active:text-accent-foreground text-sm select-none",
        open && "text-accent-foreground",
      )}
    >
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          "active:bg-accent group flex flex-row items-center rounded-sm px-2 py-2 sm:py-1.5",
          open && "bg-accent",
          inset && "pl-8",
          className,
        )}
        {...props}
      >
        <>{children}</>
        <Icon
          size={16}
          className={cn(
            "text-foreground ml-auto size-4 shrink-0",
            iconClassName,
          )}
        />
      </DropdownMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: DropdownMenuPrimitive.SubContentProps &
  React.RefAttributes<DropdownMenuPrimitive.SubContentRef>) {
  return (
    <Animated.View entering={FadeIn}>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          "bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5",
          className,
        )}
        {...props}
      />
    </Animated.View>
  );
}

const FullWindowOverlay =
  Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function DropdownMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: DropdownMenuPrimitive.ContentProps &
  React.RefAttributes<DropdownMenuPrimitive.ContentRef> & {
    overlayStyle?: StyleProp<ViewStyle>;
    overlayClassName?: string;
    portalHost?: string;
  }) {
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={
            overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as typeof StyleSheet.absoluteFill,
                ])
              : StyleSheet.absoluteFill
          }
          className={overlayClassName}
        >
          <Animated.View entering={FadeIn}>
            <TextClassContext.Provider value="text-popover-foreground">
              <DropdownMenuPrimitive.Content
                className={cn(
                  "bg-popover border-border min-w-32 overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5",
                  className,
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </Animated.View>
        </DropdownMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: DropdownMenuPrimitive.ItemProps &
  React.RefAttributes<DropdownMenuPrimitive.ItemRef> & {
    className?: string;
    inset?: boolean;
    variant?: "default" | "destructive";
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        "text-popover-foreground group-active:text-popover-foreground text-sm select-none",
        variant === "destructive" &&
          "text-destructive group-active:text-destructive",
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          "active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5",
          variant === "destructive" &&
            "active:bg-destructive/10 dark:active:bg-destructive/20",
          props.disabled && "opacity-50",
          inset && "pl-8",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: DropdownMenuPrimitive.CheckboxItemProps &
  React.RefAttributes<DropdownMenuPrimitive.CheckboxItemRef> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          "active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5",
          props.disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Icons.Check className={cn("text-foreground size-4")} />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: DropdownMenuPrimitive.RadioItemProps &
  React.RefAttributes<DropdownMenuPrimitive.RadioItemRef> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          "active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 sm:py-1.5",
          props.disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuPrimitive.LabelProps &
  React.RefAttributes<DropdownMenuPrimitive.LabelRef> & {
    className?: string;
    inset?: boolean;
  }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "text-foreground font-sans-medium px-2 py-2 text-xs sm:py-1.5",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuPrimitive.SeparatorProps &
  React.RefAttributes<DropdownMenuPrimitive.SeparatorRef>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: TextProps & React.RefAttributes<Text>) {
  return (
    <Text
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
