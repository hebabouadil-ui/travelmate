import "react-native-gesture-handler";
import { useEffect } from "react";
import { Text as RNText, TextInput as RNTextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * Render at the app's designed type scale regardless of the device's system
 * font-size / display-size setting. Phones set to a large accessibility font
 * were blowing every screen up — headings overflowed and words wrapped
 * mid-letter ("Recommende d", "Mediu m"). We allow a *small* bump (1.15) so the
 * app still honours accessibility a little, but never enough to break layout.
 */
type WithDefaults = { defaultProps?: { allowFontScaling?: boolean; maxFontSizeMultiplier?: number } };
const TEXT_DEFAULTS = { allowFontScaling: true, maxFontSizeMultiplier: 1.15 };
(RNText as unknown as WithDefaults).defaultProps = {
  ...(RNText as unknown as WithDefaults).defaultProps,
  ...TEXT_DEFAULTS,
};
(RNTextInput as unknown as WithDefaults).defaultProps = {
  ...(RNTextInput as unknown as WithDefaults).defaultProps,
  ...TEXT_DEFAULTS,
};
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { colors } from "@/theme";
import { useProfile } from "@/store/useProfile";
import { ensureAndroidChannel } from "@/lib/notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useProfile((s) => s._hydrated);
  const router = useRouter();

  // Icons are now Lucide SVGs (react-native-svg) — no glyph font to load, so
  // nothing blocks first render.

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  // Create the Android notification channel (crash-safe, no token / no prompt).
  useEffect(() => {
    ensureAndroidChannel().catch(() => undefined);
  }, []);

  // Tapping a trip-reminder notification deep-links into that trip.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const tripId = res.notification.request.content.data?.tripId;
      if (tripId) router.push(`/trip/${tripId}`);
    });
    return () => sub.remove();
  }, [router]);

  // Wait only for persisted state to hydrate (fonts are embedded natively).
  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="trip/[id]"
            options={{ animation: "slide_from_bottom", presentation: "card" }}
          />
        </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
