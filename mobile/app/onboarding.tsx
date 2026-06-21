import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, font, radius, spacing } from "@/theme";
import { Chip, GradientButton } from "@/components/ui";
import {
  TRAVELER_TYPES,
  INTERESTS,
  FOOD_PREFERENCES,
  BUDGETS,
  ACTIVITY_LEVELS,
} from "@/lib/onboarding-config";
import type {
  ActivityLevel,
  Budget,
  FoodPreference,
  Interest,
  TravelerType,
} from "@/lib/types";
import { useProfile } from "@/store/useProfile";

const STEPS = ["welcome", "type", "interests", "food", "budget", "pace"] as const;

export default function Onboarding() {
  const router = useRouter();
  const { setProfile, completeOnboarding } = useProfile();
  const [step, setStep] = useState(0);

  const [travelerType, setTravelerType] = useState<TravelerType>("explorer");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [foodPreference, setFoodPreference] = useState<FoodPreference>("none");
  const [budget, setBudget] = useState<Budget>("medium");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  const toggleInterest = (i: Interest) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setProfile({ travelerType, interests, foodPreference, budget, activityLevel });
      completeOnboarding();
      router.replace("/(tabs)");
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = STEPS[step];
  const canProceed = current !== "interests" || interests.length > 0;

  return (
    <LinearGradient colors={colors.heroGradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Progress */}
        <View style={styles.progressRow}>
          {step > 0 ? (
            <Pressable onPress={back} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {step + 1}/{STEPS.length}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {current === "welcome" && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.welcome}>
              <View style={styles.logoBadge}>
                <Ionicons name="compass" size={42} color={colors.white} />
              </View>
              <Text style={styles.brand}>Voyage AI</Text>
              <Text style={styles.tagline}>
                Your personal AI travel concierge. Smart, route-optimized trips
                for anywhere on earth — built for your phone.
              </Text>
              <View style={styles.featureList}>
                {[
                  ["sparkles", "AI itineraries tuned to you"],
                  ["map", "Native maps & turn-by-turn"],
                  ["cloud-offline", "Works fully offline"],
                ].map(([icon, label]) => (
                  <View key={label} style={styles.featureItem}>
                    <Ionicons name={icon as any} size={18} color={colors.accent} />
                    <Text style={styles.featureText}>{label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {current === "type" && (
            <StepWrap key="type" title="What kind of traveler are you?" subtitle="We'll tailor every recommendation.">
              <View style={styles.wrap}>
                {TRAVELER_TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    label={t.label}
                    emoji={t.emoji}
                    selected={travelerType === t.value}
                    onPress={() => setTravelerType(t.value)}
                  />
                ))}
              </View>
            </StepWrap>
          )}

          {current === "interests" && (
            <StepWrap key="interests" title="What are you into?" subtitle="Pick as many as you like.">
              <View style={styles.wrap}>
                {INTERESTS.map((t) => (
                  <Chip
                    key={t.value}
                    label={t.label}
                    emoji={t.emoji}
                    selected={interests.includes(t.value)}
                    onPress={() => toggleInterest(t.value)}
                  />
                ))}
              </View>
            </StepWrap>
          )}

          {current === "food" && (
            <StepWrap key="food" title="Any food preferences?" subtitle="We'll prioritize matching restaurants.">
              <View style={styles.wrap}>
                {FOOD_PREFERENCES.map((t) => (
                  <Chip
                    key={t.value}
                    label={t.label}
                    selected={foodPreference === t.value}
                    onPress={() => setFoodPreference(t.value)}
                  />
                ))}
              </View>
            </StepWrap>
          )}

          {current === "budget" && (
            <StepWrap key="budget" title="What's your budget style?" subtitle="Drives cost estimates and picks.">
              <View style={styles.optionList}>
                {BUDGETS.map((t) => (
                  <OptionRow
                    key={t.value}
                    label={t.label}
                    hint={t.hint}
                    selected={budget === t.value}
                    onPress={() => setBudget(t.value)}
                  />
                ))}
              </View>
            </StepWrap>
          )}

          {current === "pace" && (
            <StepWrap key="pace" title="How packed should days be?" subtitle="Set your ideal daily pace.">
              <View style={styles.optionList}>
                {ACTIVITY_LEVELS.map((t) => (
                  <OptionRow
                    key={t.value}
                    label={t.label}
                    hint={t.hint}
                    selected={activityLevel === t.value}
                    onPress={() => setActivityLevel(t.value)}
                  />
                ))}
              </View>
            </StepWrap>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <GradientButton
            label={current === "welcome" ? "Get started" : current === "pace" ? "Start exploring" : "Continue"}
            icon={current === "pace" ? "rocket" : "arrow-forward"}
            onPress={next}
            disabled={!canProceed}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StepWrap({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={SlideInRight.springify().damping(18)}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
      {children}
    </Animated.View>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.optionRow, selected && styles.optionRowSelected]}
    >
      <View>
        <Text style={[styles.optionLabel, selected && { color: colors.text }]}>{label}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? colors.primary : colors.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.primary },
  progressLabel: { color: "rgba(255,255,255,0.85)", fontSize: font.tiny, fontWeight: "700", width: 32, textAlign: "right" },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl, flexGrow: 1 },
  welcome: { alignItems: "center", paddingTop: spacing.xxl },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  brand: { color: colors.white, fontSize: 38, fontWeight: "900", letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.88)", fontSize: font.body, textAlign: "center", lineHeight: 23, marginTop: spacing.md, paddingHorizontal: spacing.md },
  featureList: { marginTop: spacing.xxl, gap: spacing.md, alignSelf: "stretch" },
  featureItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  featureText: { color: colors.white, fontSize: font.body, fontWeight: "600" },
  stepTitle: { color: colors.white, fontSize: font.h1, fontWeight: "900", marginBottom: spacing.xs },
  stepSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: font.body, marginBottom: spacing.xl },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionList: { gap: spacing.md },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "1A" },
  optionLabel: { color: colors.textMuted, fontSize: font.h3, fontWeight: "700" },
  optionHint: { color: colors.textFaint, fontSize: font.small, marginTop: 2 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl },
});
