import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        animation: "fade",
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="organization" options={{ headerShown: false }} />
    </Stack>
  );
}
