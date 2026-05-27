import { Portal } from "@rn-primitives/portal";
import { Fragment } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

import { isIOS } from "~/utils/device";

const FullWindowOverlay = isIOS ? RNFullWindowOverlay : Fragment;

interface SpinnerProps {
  readonly modal?: boolean;
}

export const Spinner = ({ modal = true }: SpinnerProps) => {
  if (!modal) {
    return (
      <View
        style={StyleSheet.absoluteFill}
        className="bg-background flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" colorClassName="accent-primary" />
      </View>
    );
  }

  return (
    <Portal name="spinner">
      <FullWindowOverlay>
        <View
          style={StyleSheet.absoluteFill}
          className="flex-1 items-center justify-center"
        >
          <View style={StyleSheet.absoluteFill} className="bg-background/80" />
          <ActivityIndicator size="large" colorClassName="accent-primary" />
        </View>
      </FullWindowOverlay>
    </Portal>
  );
};
