import { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { colors, font, radius, shadow, spacing } from "@/theme";

const PHRASES = [
  { icon: "search", label: "Scouting standout places" },
  { icon: "sparkles", label: "Tuning it to your taste" },
  { icon: "map", label: "Mapping the smartest route" },
  { icon: "image", label: "Curating photos & details" },
  { icon: "checkmark-circle", label: "Polishing your plan" },
];

const TRACK = 240;
const HILITE = 96;

/** Premium full-screen overlay shown while the itinerary is generated. Light,
 *  editorial, with a soft radar pulse and a continuous (indeterminate) progress
 *  highlight so it never looks "stuck". */
export function GeneratingOverlay({
  visible,
  destination,
}: {
  visible: boolean;
  destination: string;
}) {
  const [phrase, setPhrase] = useState(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const slide = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setPhrase(0);
      return;
    }
    const pulse = (sv: typeof ring1, delay: number) => {
      sv.value = 0;
      sv.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }), -1, false)
      );
    };
    pulse(ring1, 0);
    pulse(ring2, 870);
    pulse(ring3, 1740);
    slide.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    breathe.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2200);
    return () => clearInterval(id);
  }, [visible, ring1, ring2, ring3, slide, breathe]);

  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.7, 2.1]) }],
    opacity: interpolate(ring1.value, [0, 0.15, 1], [0, 0.28, 0]),
  }));
  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.7, 2.1]) }],
    opacity: interpolate(ring2.value, [0, 0.15, 1], [0, 0.28, 0]),
  }));
  const r3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring3.value, [0, 1], [0.7, 2.1]) }],
    opacity: interpolate(ring3.value, [0, 0.15, 1], [0, 0.28, 0]),
  }));
  const badge = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.06]) }],
  }));
  const hilite = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(slide.value, [0, 1], [-HILITE, TRACK]) }],
  }));

  const current = PHRASES[phrase];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.fill}>
        <View style={styles.center}>
          <View style={styles.radar}>
            <Animated.View style={[styles.ring, r1]} />
            <Animated.View style={[styles.ring, r2]} />
            <Animated.View style={[styles.ring, r3]} />
            <Animated.View style={[styles.badge, badge]}>
              <Icon name="compass" size={36} color={colors.white} strokeWidth={2} />
            </Animated.View>
          </View>

          <Text style={styles.kicker}>VOYAGE AI</Text>
          <Text style={styles.title}>Designing your itinerary</Text>
          <Text style={styles.dest}>{destination}</Text>

          <View style={styles.phraseRow}>
            <Animated.View
              key={phrase}
              entering={FadeIn.duration(360)}
              exiting={FadeOut.duration(220)}
              style={styles.phraseInner}
            >
              <Icon name={current.icon} size={15} color={colors.primary} strokeWidth={2} />
              <Text style={styles.phraseText}>{current.label}</Text>
            </Animated.View>
          </View>

          <View style={styles.track}>
            <Animated.View style={[styles.hilite, hilite]} />
          </View>
        </View>

        <Text style={styles.footnote}>Curating real places, routes & photos…</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing.xl },
  center: { alignItems: "center" },
  radar: { width: 200, height: 200, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  ring: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + "0D",
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.float,
  },
  kicker: { color: colors.primary, fontSize: font.tiny, fontWeight: "800", letterSpacing: 3, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.h1, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  dest: { color: colors.textMuted, fontSize: font.h3, fontWeight: "600", marginTop: 4 },
  phraseRow: { height: 26, marginTop: spacing.xxl, justifyContent: "center" },
  phraseInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  phraseText: { color: colors.text, fontSize: font.body, fontWeight: "600" },
  track: {
    width: TRACK,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.xl,
    overflow: "hidden",
  },
  hilite: { width: HILITE, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  footnote: { position: "absolute", bottom: spacing.xxxl, color: colors.textFaint, fontSize: font.small },
});
