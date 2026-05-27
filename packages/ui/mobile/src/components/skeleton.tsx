import * as React from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@workspace/ui";

const duration = 1000;

function Skeleton({
  className,
  style,
  ...props
}: React.ComponentPropsWithoutRef<typeof Animated.View>) {
  const sv = useSharedValue(1);

  React.useEffect(() => {
    sv.value = withRepeat(
      withSequence(withTiming(0.5, { duration }), withTiming(1, { duration })),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sv.value,
  }));

  return (
    <Animated.View
      style={[animatedStyle, style]}
      className={cn("bg-secondary dark:bg-muted rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
