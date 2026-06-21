import { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
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
  FadeOut,
} from "react-native-reanimated";
import { colors, font, radius, spacing } from "@/theme";

const STEPS = [
  { icon: "search", label: "Scouting the best places…" },
  { icon: "sparkles", label: "Tuning it to your interests…" },
  { icon: "map", label: "Mapping walking routes…" },
  { icon: "image", label: "Adding photos & details…" },
  { icon: "checkmark-circle", label: "Almost ready…" },
];

/** Full-screen animated overlay shown while the AI builds the itinerary. */
export function GeneratingOverlay({
  visible,
  destination,
}: {
  visible: boolean;
  destination: string;
}) {
  const [step, setStep] = useState(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, [visible, scale]);

  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const current = STEPS[step];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <LinearGradient colors={colors.heroGradient} style={styles.fill}>
        <Animated.View style={[styles.badge, badge]}>
          <Ionicons name="compass" size={48} color={colors.white} />
        </Animated.View>
        <Text style={styles.title}>Crafting your trip</Text>
        <Text style={styles.dest}>{destination}</Text>

        <View style={styles.stepRow}>
          <Animated.View key={step} entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.stepInner}>
            <Ionicons name={current.icon as any} size={16} color={colors.white} />
            <Text style={styles.stepText}>{current.label}</Text>
          </Animated.View>
        </View>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { opacity: i <= step ? 1 : 0.3 }]} />
          ))}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { color: colors.white, fontSize: font.h1, fontWeight: "900" },
  dest: { color: "rgba(255,255,255,0.85)", fontSize: font.h3, fontWeight: "600", marginTop: 4 },
  stepRow: { height: 30, marginTop: spacing.xxl, justifyContent: "center" },
  stepInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepText: { color: colors.white, fontSize: font.body, fontWeight: "600" },
  dots: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
});
