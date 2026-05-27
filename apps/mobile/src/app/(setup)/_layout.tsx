import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack
      initialRouteName="welcome"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 200,
      }}
    />
  );
}
