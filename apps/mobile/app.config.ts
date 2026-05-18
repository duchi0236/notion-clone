import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "ClawNote",
  slug: "clawnote-mobile",
  scheme: "clawnote",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.clawnote.mobile"
  },
  android: {
    package: "com.clawnote.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
  },
  plugins: ["expo-router", "expo-secure-store"]
};

export default config;
