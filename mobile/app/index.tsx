import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/store/useProfile";
import { colors } from "@/theme";

/**
 * Cold-start router: wait for persisted state to hydrate, then send the user to
 * onboarding (first run) or straight into the app.
 */
export default function Index() {
  const router = useRouter();
  const hydrated = useProfile((s) => s._hydrated);
  const onboardingComplete = useProfile((s) => s.onboardingComplete);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(onboardingComplete ? "/(tabs)" : "/onboarding");
  }, [hydrated, onboardingComplete, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
