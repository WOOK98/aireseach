import { OTPInput } from "input-otp-native";
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { cn } from "@workspace/ui";

import type { SlotProps } from "input-otp-native";

function InputOTPGroup({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="input-otp-group"
      className={cn("flex-row items-center justify-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  char,
  isActive,
  hasFakeCaret,
  className,
  index,
  max,
  ...props
}: React.ComponentProps<typeof View> &
  SlotProps & { index?: number; max?: number }) {
  const isFirst = index === 0;
  const isLast = index === (max ?? 6) - 1;

  return (
    <View
      className={cn(
        "border-input relative flex size-12 items-center justify-center border transition-all outline-none",
        "dark:bg-input/30",
        {
          "border-ring": isActive,
          "rounded-l-md": isFirst,
          "rounded-r-md": isLast,
        },
        className,
      )}
      {...props}
    >
      {char !== null && (
        <Text className="text-foreground font-sans-medium text-xl">{char}</Text>
      )}
      {hasFakeCaret && <FakeCaret />}
    </View>
  );
}

function FakeCaret() {
  const opacity = useSharedValue(1);
  const foregroundColor = useCSSVariable("--foreground");

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle = {
    width: 2,
    height: 20,
    borderRadius: 1,
    ...(foregroundColor && { backgroundColor: foregroundColor.toString() }),
  };

  return (
    <View className="absolute h-full w-full items-center justify-center">
      <Animated.View style={[baseStyle, animatedStyle]} />
    </View>
  );
}

function InputOTPSeparator({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      {...props}
      className={cn("w-1 items-center justify-center", className)}
    >
      <View className="bg-muted-foreground h-0.5 w-1 rounded-sm" />
    </View>
  );
}

export { OTPInput as InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
