import "react-native-gesture-handler";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { useProfile } from "@/store/useProfile";
import { ensureAndroidChannel } from "@/lib/notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useProfile((s) => s._hydrated);
  const [fontsLoaded] = useFonts(Ionicons.font);
  const router = useRouter();

  const ready = hydrated && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

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

  // Keep the splash up until the icon font is ready so glyphs never render blank.
  if (!ready) return null;

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
