import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
  withRepeat,
  useSharedValue,
} from "react-native-reanimated";

export const Spin = ({ children }: { children: React.ReactNode }) => {
  const rotation = useSharedValue(0);
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotateZ: `${rotation.value}deg`,
        },
      ],
    };
  }, [rotation]);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  return (
    <Animated.View
      style={[
        animatedStyles,
        {
          alignSelf: "center",
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
