import type { ConfigContext, ExpoConfig } from "expo/config";

const SPLASH = {
  imageWidth: 150,
  image: "./public/images/splash/splash.png",
  dark: {
    image: "./public/images/splash/splash.png",
    backgroundColor: "#0D121C",
  },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TurboStarter",
  slug: "turbostarter",
  scheme: "turbostarter",
  version: "1.4.0",
  orientation: "portrait",
  icon: "./public/images/icon/ios.png",
  userInterfaceStyle: "automatic",
  assetBundlePatterns: ["**/*"],
  platforms: ["ios", "android"],
  updates: {
    url: "https://u.expo.dev/a7958179-7450-4e6f-8791-da222215909e",
  },
  ios: {
    bundleIdentifier: "com.turbostarter.core",
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.turbostarter.core",
    adaptiveIcon: {
      monochromeImage: "./public/images/icon/android/monochrome.png",
      foregroundImage: "./public/images/icon/android/adaptive.png",
      backgroundColor: "#0D121C",
    },
  },
  extra: {
    eas: {
      projectId: "a7958179-7450-4e6f-8791-da222215909e",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-image-picker",
    "expo-web-browser",
    "expo-apple-authentication",
    "@react-native-google-signin/google-signin",
    /* required to enable i18n */
    "expo-localization",
    [
      "expo-build-properties",
      {
        android: {
          /* https://github.com/expo/expo/issues/15761 */
          enableProguardInReleaseBuilds: true,
          extraProguardRules: "-keep public class com.horcrux.svg.** {*;}",
          allowBackup: false,
        },
      },
    ],
    [
      "expo-tracking-transparency",
      {
        /* 🍎 Describe why you need access to the user's data */
        userTrackingPermission:
          "This identifier will be used to deliver personalized ads to you.",
      },
    ],
    ["expo-splash-screen", SPLASH],
  ],
});
