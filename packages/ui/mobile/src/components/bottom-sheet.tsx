import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetFooter as GBottomSheetFooter,
  BottomSheetView as GBottomSheetView,
  BottomSheetScrollView as GBottomSheetScrollView,
  useBottomSheetModal,
  SCROLLABLE_TYPE,
  createBottomSheetScrollableComponent,
} from "@gorhom/bottom-sheet";
import { useTheme } from "@react-navigation/native";
import * as Slot from "@rn-primitives/slot";
import * as React from "react";
import { memo } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@workspace/ui";

import { inputVariants } from "./input";
import { Text } from "./text";

import type {
  BottomSheetBackdropProps,
  BottomSheetScrollViewMethods,
  BottomSheetFooterProps as GBottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import type { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import type { GestureResponderEvent, ViewStyle } from "react-native";

interface BottomSheetContext {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

const BottomSheetContext = React.createContext<BottomSheetContext | null>(null);

function BottomSheet({ ...props }: React.ComponentProps<typeof View>) {
  const sheetRef = React.useRef<BottomSheetModal>(null);

  return (
    <BottomSheetContext.Provider value={{ sheetRef: sheetRef }}>
      <View {...props} />
    </BottomSheetContext.Provider>
  );
}

function useBottomSheetContext() {
  const context = React.useContext(BottomSheetContext);
  if (!context) {
    throw new Error(
      "BottomSheet compound components cannot be rendered outside the BottomSheet component",
    );
  }
  return context;
}

const CLOSED_INDEX = -1;

type BottomSheetContentRef = React.ComponentRef<typeof BottomSheetModal>;

type BottomSheetContentProps = Omit<
  React.ComponentProps<typeof BottomSheetModal>,
  "backdropComponent"
> & {
  backdropProps?: Partial<React.ComponentProps<typeof BottomSheetBackdrop>>;
};

const BottomSheetContent = ({
  enablePanDownToClose = true,
  enableDynamicSizing = true,
  backdropProps,
  backgroundStyle,
  ref,
  ...props
}: BottomSheetContentProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { sheetRef } = useBottomSheetContext();

  React.useImperativeHandle(ref, () => {
    if (!sheetRef.current) {
      return {} as BottomSheetModalMethods;
    }
    return sheetRef.current;
  }, [sheetRef]);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => {
      const {
        pressBehavior = "close",
        disappearsOnIndex = CLOSED_INDEX,
        style,
        onPress,
        ...rest
      } = {
        ...props,
        ...backdropProps,
      };
      return (
        <BottomSheetBackdrop
          disappearsOnIndex={disappearsOnIndex}
          pressBehavior={pressBehavior}
          style={style}
          onPress={() => {
            if (Keyboard.isVisible()) {
              Keyboard.dismiss();
            }
            onPress?.();
          }}
          {...rest}
        />
      );
    },
    [backdropProps],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={enableDynamicSizing}
      stackBehavior="replace"
      backgroundStyle={[{ backgroundColor: colors.card }, backgroundStyle]}
      handleIndicatorStyle={{
        backgroundColor: colors.border,
      }}
      topInset={insets.top}
      {...props}
    />
  );
};

function BottomSheetOpenTrigger({
  onPress,
  asChild = false,
  ...props
}: React.ComponentProps<typeof Pressable> & {
  asChild?: boolean;
}) {
  const { sheetRef } = useBottomSheetContext();
  function handleOnPress(ev: GestureResponderEvent) {
    sheetRef.current?.present();
    onPress?.(ev);
  }
  const Trigger = asChild ? Slot.Pressable : Pressable;
  return <Trigger onPress={handleOnPress} {...props} />;
}

function BottomSheetCloseTrigger({
  onPress,
  asChild = false,
  ...props
}: React.ComponentProps<typeof Pressable> & {
  asChild?: boolean;
}) {
  const { dismiss } = useBottomSheetModal();
  function handleOnPress(ev: GestureResponderEvent) {
    dismiss();
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
    onPress?.(ev);
  }
  const Trigger = asChild ? Slot.Pressable : Pressable;
  return <Trigger onPress={handleOnPress} {...props} />;
}

const BOTTOM_SHEET_HEADER_HEIGHT = 60;

function BottomSheetView({
  className,
  children,
  hadHeader = false,
  style,
  ...props
}: Omit<React.ComponentProps<typeof GBottomSheetView>, "style"> & {
  hadHeader?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();

  const paddingBottom =
    insets.bottom + 8 + (hadHeader ? BOTTOM_SHEET_HEADER_HEIGHT : 0);

  return (
    <GBottomSheetView
      style={[
        {
          paddingBottom,
        },
        style,
      ]}
      className={cn(`gap-4 px-6 pt-4`, className)}
      {...props}
    >
      {children}
    </GBottomSheetView>
  );
}

const BottomSheetScrollViewComponent = createBottomSheetScrollableComponent<
  BottomSheetScrollViewMethods,
  BottomSheetScrollViewProps
>(SCROLLABLE_TYPE.SCROLLVIEW, Animated.ScrollView);

const BottomSheetKeyboardAwareScrollView = memo<BottomSheetScrollViewProps>(
  (props) => {
    const insets = useSafeAreaInsets();

    return (
      <KeyboardAwareScrollView
        {...props}
        mode="layout"
        extraKeyboardSpace={-insets.bottom + 16}
        ScrollViewComponent={BottomSheetScrollViewComponent}
      />
    );
  },
);

type BottomSheetScrollViewProps = Omit<
  React.ComponentProps<typeof GBottomSheetScrollView>,
  "style"
> & {
  hadHeader?: boolean;
  className?: string;
  contentContainerClassName?: string;
  style?: ViewStyle;
};

function BottomSheetScrollView({
  children,
  hadHeader = false,
  className,
  contentContainerClassName,
  contentContainerStyle,
  ...props
}: BottomSheetScrollViewProps) {
  const insets = useSafeAreaInsets();

  const paddingBottom =
    insets.bottom - 8 + (hadHeader ? BOTTOM_SHEET_HEADER_HEIGHT : 0);

  return (
    <BottomSheetKeyboardAwareScrollView
      className={cn("h-full px-6", className)}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      showsVerticalScrollIndicator={false}
      contentContainerClassName={cn("gap-4 pt-4", contentContainerClassName)}
      contentContainerStyle={[
        {
          paddingBottom,
        },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </BottomSheetKeyboardAwareScrollView>
  );
}

function BottomSheetHeader({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return <View className={cn("items-start gap-0.5", className)} {...props} />;
}

/**
 * To be used in a useCallback function as a props to BottomSheetContent
 */
function BottomSheetFooter({
  bottomSheetFooterProps,
  children,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<typeof View>, "style"> & {
  bottomSheetFooterProps: GBottomSheetFooterProps;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <GBottomSheetFooter {...bottomSheetFooterProps}>
      <View
        style={[{ paddingBottom: insets.bottom + 6 }, style]}
        className={cn("px-6 pt-1.5", className)}
        {...props}
      >
        {children}
      </View>
    </GBottomSheetFooter>
  );
}

function BottomSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn(
        "font-sans-semibold text-xl leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function BottomSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function BottomSheetInput({
  className,
  placeholderTextColorClassName,
  selectionColorClassName,
  ...props
}: React.ComponentProps<typeof BottomSheetTextInput>) {
  return (
    <BottomSheetTextInput
      placeholderTextColorClassName={cn(
        "accent-muted-foreground",
        placeholderTextColorClassName,
      )}
      selectionColorClassName={cn("accent-foreground", selectionColorClassName)}
      className={cn(
        inputVariants(),
        props.editable === false && "opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function useBottomSheet() {
  const ref = React.useRef<BottomSheetContentRef>(null);

  const open = React.useCallback(() => {
    ref.current?.present();
  }, []);

  const close = React.useCallback(() => {
    ref.current?.dismiss();
  }, []);

  return { ref, open, close };
}

export {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetScrollView,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetView,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetInput,
  type BottomSheetContentRef,
  useBottomSheet,
};
