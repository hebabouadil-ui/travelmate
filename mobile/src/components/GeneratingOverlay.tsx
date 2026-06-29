import { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import { SEED_CITIES } from "@/lib/data/seed";
import { font, spacing } from "@/theme";

// Premium, cinematic loading messages (rotate while the plan is generated).
const MESSAGES = [
  "Designing your perfect journey…",
  "Finding hidden gems…",
  "Optimizing every day of your adventure…",
  "Crafting unforgettable experiences…",
  "Mapping the smartest route…",
  "Curating real places & photos…",
];

// Proven, high-quality cityscape photos for the blurred background slideshow
// (the curated seed destinations — Tokyo, Paris, Marrakech, Dubai, NYC…).
const SLIDES: string[] = Object.values(SEED_CITIES)
  .map((c) => c.image)
  .filter((u): u is string => Boolean(u));

const TRACK = 240;
const HILITE = 96;

// White-on-dark palette for the immersive overlay.
const C = {
  white: "#FFFFFF",
  whiteDim: "rgba(255,255,255,0.78)",
  whiteFaint: "rgba(255,255,255,0.55)",
  ring: "rgba(255,255,255,0.9)",
  teal: "#13837A",
};

/**
 * Cinematic full-screen overlay shown while the itinerary is generated: a
 * blurred, slowly-zooming destination slideshow with a dark gradient, smooth
 * crossfades, rotating premium messages, a soft pulse and an indeterminate
 * progress bar — an immersive "designing your trip" moment, not a spinner.
 */
export function GeneratingOverlay({
  visible,
  destination,
}: {
  visible: boolean;
  destination: string;
}) {
  const [msg, setMsg] = useState(0);
  const [slide, setSlide] = useState(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const kenburns = useSharedValue(0);
  const progress = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setMsg(0);
      setSlide(0);
      return;
    }
    const pulse = (sv: typeof ring1, delay: number) => {
      sv.value = 0;
      sv.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false)
      );
    };
    pulse(ring1, 0);
    pulse(ring2, 1100);
    kenburns.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }), -1, true);
    progress.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, false);
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
    const m = setInterval(() => setMsg((p) => (p + 1) % MESSAGES.length), 2400);
    const s = setInterval(() => setSlide((p) => (p + 1) % Math.max(1, SLIDES.length)), 3600);
    return () => {
      clearInterval(m);
      clearInterval(s);
    };
  }, [visible, ring1, ring2, kenburns, progress, breathe]);

  const r1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.8, 2.3]) }],
    opacity: interpolate(ring1.value, [0, 0.15, 1], [0, 0.5, 0]),
  }));
  const r2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.8, 2.3]) }],
    opacity: interpolate(ring2.value, [0, 0.15, 1], [0, 0.5, 0]),
  }));
  const kb = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(kenburns.value, [0, 1], [1.04, 1.16]) },
      { translateX: interpolate(kenburns.value, [0, 1], [-8, 8]) },
    ],
  }));
  const badge = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [1, 1.07]) }],
  }));
  const hilite = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-HILITE, TRACK]) }],
  }));

  const bg = SLIDES.length ? SLIDES[slide % SLIDES.length] : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.fill}>
        {/* Blurred, slowly-zooming destination slideshow (crossfading) */}
        {bg ? (
          <Animated.View
            key={bg}
            entering={FadeIn.duration(1100)}
            exiting={FadeOut.duration(1100)}
            style={StyleSheet.absoluteFill}
          >
            <Animated.Image
              source={{ uri: bg }}
              blurRadius={12}
              resizeMode="cover"
              style={[StyleSheet.absoluteFill, kb]}
            />
          </Animated.View>
        ) : null}
        {/* Dark gradient for legibility + cinematic depth */}
        <LinearGradient
          colors={["rgba(8,10,18,0.55)", "rgba(8,10,18,0.45)", "rgba(8,10,18,0.9)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.center}>
          <View style={styles.radar}>
            <Animated.View style={[styles.ring, r1]} />
            <Animated.View style={[styles.ring, r2]} />
            <Animated.View style={[styles.badge, badge]}>
              <Icon name="compass" size={34} color={C.white} strokeWidth={2} />
            </Animated.View>
          </View>

          <Text style={styles.kicker}>VOYAGE AI</Text>
          <Text style={styles.dest}>{destination}</Text>

          <View style={styles.msgRow}>
            <Animated.Text
              key={msg}
              entering={FadeIn.duration(420)}
              exiting={FadeOut.duration(260)}
              style={styles.msg}
            >
              {MESSAGES[msg]}
            </Animated.Text>
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
  fill: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0E16", padding: spacing.xl },
  center: { alignItems: "center" },
  radar: { width: 200, height: 200, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  ring: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: C.ring,
  },
  badge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  kicker: { color: C.white, fontSize: font.tiny, fontWeight: "800", letterSpacing: 4, marginBottom: spacing.sm, opacity: 0.85 },
  dest: { color: C.white, fontSize: font.h1, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  msgRow: { height: 26, marginTop: spacing.lg, justifyContent: "center", alignItems: "center" },
  msg: { color: C.whiteDim, fontSize: font.body, fontWeight: "600", textAlign: "center" },
  track: {
    width: TRACK,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: spacing.xl,
    overflow: "hidden",
  },
  hilite: { width: HILITE, height: 4, borderRadius: 2, backgroundColor: C.white },
  footnote: { position: "absolute", bottom: spacing.xxxl, color: C.whiteFaint, fontSize: font.small },
});
