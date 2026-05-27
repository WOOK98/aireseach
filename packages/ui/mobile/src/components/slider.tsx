import { createContext, useContext } from "react";
import { Dimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { cn } from "@workspace/ui";

import type { FlatList } from "react-native";
import type { ViewProps } from "react-native";
import type {
  SharedValue,
  ScrollHandlerProcessed,
  FlatListPropsWithLayout,
} from "react-native-reanimated";

interface SliderContextType {
  threshold: number;
  scrollX: SharedValue<number> | null;
  onScroll: ScrollHandlerProcessed;
}

const SliderContext = createContext<SliderContextType>({
  threshold: Dimensions.get("window").width,
  scrollX: null,
  onScroll: () => null,
});

const Slider = ({
  className,
  threshold = Dimensions.get("window").width,
  ...props
}: ViewProps & { threshold?: number }) => {
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: ({ contentOffset: { x } }) => {
      scrollX.value = x;
    },
  });

  return (
    <SliderContext.Provider value={{ scrollX, onScroll, threshold }}>
      <View {...props} className={cn("flex-1 items-center gap-4", className)} />
    </SliderContext.Provider>
  );
};

const SliderList = <ItemT,>(
  props: FlatListPropsWithLayout<ItemT> & {
    ref?: React.ForwardedRef<FlatList>;
  },
) => {
  const { onScroll, threshold } = useContext(SliderContext);
  const native = Gesture.Native();

  return (
    <GestureDetector gesture={native}>
      <Animated.FlatList
        onScroll={onScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToAlignment="start"
        pagingEnabled
        snapToInterval={threshold}
        {...props}
      />
    </GestureDetector>
  );
};

const SliderListItem = ({
  index,
  style,
  ...props
}: ViewProps & { index: number }) => {
  const { scrollX, threshold } = useContext(SliderContext);
  const opacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX?.value ?? 0,
      [(index - 1) * threshold, index * threshold, (index + 1) * threshold],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return <Animated.View style={[style, opacity]} {...props} />;
};

const SliderPaginationDots = ({ className, ...props }: ViewProps) => {
  return <View className={cn("flex-row gap-1.5", className)} {...props} />;
};

const SliderPaginationDot = ({
  className,
  index = 0,
  ...props
}: ViewProps & { index?: number }) => {
  const { scrollX, threshold } = useContext(SliderContext);

  const animatedDot = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX?.value ?? 0,
      [(index - 1) * threshold, index * threshold, (index + 1) * threshold],
      [0.7, 1, 0.7],
    ),
    width: interpolate(
      scrollX?.value ?? 0,
      [(index - 1) * threshold, index * threshold, (index + 1) * threshold],
      [11, 28, 11],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      className={cn("bg-primary h-3 rounded-full opacity-50", className)}
      style={animatedDot}
      {...props}
    />
  );
};

export {
  Slider,
  SliderList,
  SliderListItem,
  SliderPaginationDots,
  SliderPaginationDot,
};
