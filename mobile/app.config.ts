import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config so we can inject optional secrets (Google Maps key,
 * Supabase, Gemini) from the environment at build time. Every key is OPTIONAL:
 * the app degrades gracefully to free, on-device engines and a styled map
 * fallback when keys are absent — so it runs at ZERO cost out of the box.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Voyage AI",
  slug: "voyage-ai",
  scheme: "voyageai",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "cover",
    backgroundColor: "#0B0F1A",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.voyageai.travelmate",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Voyage AI uses your location to show nearby attractions, restaurants and hidden gems, and to center the map on you.",
      UIBackgroundModes: ["location", "fetch"],
    },
    config: {
      // Optional: enables Apple Maps directions deep-links; no key required.
    },
  },
  android: {
    package: "com.voyageai.travelmate",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0F1A",
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "FOREGROUND_SERVICE",
      "POST_NOTIFICATIONS",
      "INTERNET",
    ],
    config: {
      googleMaps: {
        // Optional. Without a key the app shows a styled map placeholder + list.
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      },
    },
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/icon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      // Pin Kotlin to satisfy expo-modules-core's Compose Compiler (1.5.15),
      // which requires Kotlin 1.9.25 (the SDK 52 default of 1.9.24 fails CI).
      "expo-build-properties",
      {
        android: {
          kotlinVersion: "1.9.25",
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Voyage AI uses your location to surface nearby places and navigate your itinerary.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#6C5CE7",
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0B0F1A",
        image: "./assets/splash.png",
        resizeMode: "cover",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      // Filled by `eas init`; left blank for local/zero-config builds.
    },
  },
});
