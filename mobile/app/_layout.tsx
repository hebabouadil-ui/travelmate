import "react-native-gesture-handler";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { colors } from "@/theme";
import { useProfile } from "@/store/useProfile";
import { registerForPushNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useProfile((s) => s._hydrated);
  const router = useRouter();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  // Register notification channel / permissions early (non-blocking).
  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);
  }, []);

  // Tapping a trip-reminder notification deep-links into that trip.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const tripId = res.notification.request.content.data?.tripId;
      if (tripId) router.push(`/trip/${tripId}`);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
