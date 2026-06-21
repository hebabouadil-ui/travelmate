import { Redirect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useProfile } from "@/store/useProfile";
import { colors } from "@/theme";

/**
 * Cold-start gate. Renders a branded splash until persisted state hydrates,
 * then declaratively redirects with <Redirect> — the navigator-safe way (an
 * imperative router.replace() in an effect can fire before the Root Layout
 * navigator is mounted and crash the production build).
 */
export default function Index() {
  const hydrated = useProfile((s) => s._hydrated);
  const onboardingComplete = useProfile((s) => s.onboardingComplete);

  const scale = useSharedValue(0.9);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(withTiming(0.9, { duration: 1100 }), -1, true);
  }, [glow, scale]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  if (hydrated) {
    return <Redirect href={onboardingComplete ? "/(tabs)" : "/onboarding"} />;
  }

  return (
    <LinearGradient colors={colors.heroGradient} style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={[styles.badge, badgeStyle]}>
        <Ionicons name="compass" size={52} color={colors.white} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
});
