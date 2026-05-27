import { BlurView as NativeBlurView } from "expo-blur";
import { GlassView as NativeGlassView } from "expo-glass-effect";
import { Link as NativeLink } from "expo-router";
import { ScrollView as NativeScrollView } from "react-native-gesture-handler";
import { KeyboardAvoidingView as NativeKeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { cn } from "@workspace/ui";
import { Text } from "@workspace/ui-mobile/text";

import { WIDTH } from "~/utils/device";

export const KeyboardAvoidingView = withUniwind(NativeKeyboardAvoidingView);
export const Link = withUniwind(NativeLink);
export const ScrollView = withUniwind(NativeScrollView);
export const SafeAreaView = withUniwind(NativeSafeAreaView);
export const BlurView = withUniwind(NativeBlurView);
export const GlassView = withUniwind(NativeGlassView);

export const TabBarLabel = ({
  children,
  focused,
}: {
  children: string;
  focused: boolean;
}) => {
  return (
    <Text
      className={cn(
        "text-muted-foreground text-xs",
        focused && "text-primary",
        WIDTH > 640 && "ml-3 text-sm",
      )}
    >
      {children}
    </Text>
  );
};
