import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

import { cn } from "@workspace/ui";

import { Icons } from "./icons";
import { TextClassContext } from "./text";

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

function SelectValue({
  ref,
  className,
  ...props
}: SelectPrimitive.ValueProps &
  React.RefAttributes<SelectPrimitive.ValueRef> & {
    className?: string;
  }) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        "text-foreground line-clamp-1 flex flex-row items-center gap-2 font-sans text-sm",
        !value && "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  ref,
  className,
  children,
  size = "default",
  ...props
}: SelectPrimitive.TriggerProps &
  React.RefAttributes<SelectPrimitive.TriggerRef> & {
    children?: React.ReactNode;
    size?: "default" | "sm";
  }) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "border-input dark:bg-input/30 dark:active:bg-input/50 bg-background flex h-10 flex-row items-center justify-between gap-2 rounded-sm border px-3 py-2 shadow-sm shadow-black/5",
        props.disabled && "opacity-50",
        size === "sm" && "h-8 py-2 sm:py-1.5",
        className,
      )}
      {...props}
    >
      <>{children}</>
      <Icons.ChevronDown
        aria-hidden={true}
        className="text-muted-foreground"
        size={16}
      />
    </SelectPrimitive.Trigger>
  );
}

const FullWindowOverlay =
  Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function SelectContent({
  className,
  children,
  position = "popper",
  portalHost,
  ...props
}: SelectPrimitive.ContentProps &
  React.RefAttributes<SelectPrimitive.ContentRef> & {
    className?: string;
    portalHost?: string;
  }) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay
          style={StyleSheet.absoluteFill}
          className="z-50"
        >
          <TextClassContext.Provider value="text-popover-foreground font-sans">
            <Animated.View className="z-50" entering={FadeIn} exiting={FadeOut}>
              <SelectPrimitive.Content
                className={cn(
                  "bg-popover border-border relative min-w-32 rounded-sm border p-1 shadow-md shadow-black/5",
                  className,
                )}
                position={position}
                {...props}
              >
                <SelectPrimitive.Viewport
                  className={cn("p-1", position === "popper" && cn("w-full"))}
                >
                  {children}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </Animated.View>
          </TextClassContext.Provider>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.LabelProps & React.RefAttributes<SelectPrimitive.LabelRef>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "text-muted-foreground px-2 py-2 text-xs sm:py-1.5",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.ItemProps & React.RefAttributes<SelectPrimitive.ItemRef>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "active:bg-accent group relative flex w-full flex-row items-center gap-2 rounded-sm py-2 pr-8 pl-2 sm:py-1.5",
        Platform.select({
          web: "focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-disabled:pointer-events-none [&_svg]:pointer-events-none *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        }),
        props.disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <View className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icons.Check className="text-muted-foreground shrink-0" size={16} />
        </SelectPrimitive.ItemIndicator>
      </View>
      <TextClassContext.Provider value="text-foreground font-sans group-active:text-accent-foreground text-sm select-none">
        {children as React.ReactNode}
      </TextClassContext.Provider>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.SeparatorProps &
  React.RefAttributes<SelectPrimitive.SeparatorRef>) {
  return (
    <SelectPrimitive.Separator
      className={cn(
        "bg-border -mx-1 my-1 h-px",
        Platform.select({ web: "pointer-events-none" }),
        className,
      )}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type Option,
};
