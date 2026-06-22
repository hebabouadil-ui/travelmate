import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, font, radius, spacing } from "@/theme";
import { Chip, GradientButton } from "@/components/ui";
import { INTERESTS, BUDGETS } from "@/lib/onboarding-config";
import type { Budget, GeoPoint, Interest, ItineraryMode, TripRequest } from "@/lib/types";
import { generateItinerary } from "@/lib/itinerary/engine";
import { useProfile } from "@/store/useProfile";
import { SEED_CITIES } from "@/lib/data/seed";
import { searchCities, type CitySuggestion } from "@/lib/data/search";
import { GeneratingOverlay } from "@/components/GeneratingOverlay";

const POPULAR = Object.values(SEED_CITIES).map((c) => c.name);

const WHEN_OPTIONS: { key: string; label: string; offset: number | null }[] = [
  { key: "none", label: "Flexible", offset: null },
  { key: "today", label: "Today", offset: 0 },
  { key: "tomorrow", label: "Tomorrow", offset: 1 },
  { key: "weekend", label: "This weekend", offset: -1 },
];

export default function Plan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string }>();
  const profile = useProfile((s) => s.profile);
  const saveTrip = useProfile((s) => s.saveTrip);

  const [destination, setDestination] = useState(params.destination ?? "");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<Budget>(profile.budget ?? "medium");
  const [interests, setInterests] = useState<Interest[]>(profile.interests ?? []);
  const [when, setWhen] = useState("none");
  const [mode, setMode] = useState<ItineraryMode>("personalized");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [picked, setPicked] = useState(false);
  const [pickedCenter, setPickedCenter] = useState<GeoPoint | null>(null);

  useEffect(() => {
    if (params.destination) {
      setDestination(params.destination);
      setPicked(true);
    }
  }, [params.destination]);

  // Debounced global city search (any city worldwide).
  useEffect(() => {
    if (picked || destination.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const q = destination;
    const t = setTimeout(() => {
      searchCities(q).then((r) => {
        // ignore if the field changed meanwhile
        if (q === destination) setSuggestions(r);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [destination, picked]);

  const toggleInterest = (i: Interest) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const computeStartDate = (): string | undefined => {
    const opt = WHEN_OPTIONS.find((o) => o.key === when);
    if (!opt || opt.offset === null) return undefined;
    const d = new Date();
    if (opt.offset === -1) {
      // next Saturday
      const day = d.getDay();
      d.setDate(d.getDate() + ((6 - day + 7) % 7 || 7));
    } else {
      d.setDate(d.getDate() + opt.offset);
    }
    return d.toISOString().slice(0, 10);
  };

  const onGenerate = async () => {
    if (!destination.trim()) {
      setError("Please enter a destination");
      return;
    }
    setError(null);
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const req: TripRequest = {
        destination: destination.trim(),
        center: pickedCenter ?? undefined,
        days,
        budget,
        interests,
        mode,
        startDate: computeStartDate(),
        profile: { ...profile, budget, interests },
      };
      const itinerary = await Promise.race([
        generateItinerary(req),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 55000)
        ),
      ]);
      const totalStops = itinerary.days.reduce((n, d) => n + d.stops.length, 0);
      if (totalStops === 0) throw new Error("empty");
      saveTrip(itinerary);
      router.push(`/trip/${itinerary.id}`);
    } catch (e) {
      const msg = (e as Error)?.message;
      setError(
        msg === "timeout"
          ? "That took too long — check your connection and try again."
          : msg === "empty"
          ? "Couldn't find places for that spot. Try a nearby bigger city."
          : "Couldn't build a plan right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Plan a trip</Text>
          <Text style={styles.subtitle}>AI builds an optimized day-by-day plan in seconds.</Text>

          {/* Destination */}
          <Text style={styles.label}>Destination</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              value={destination}
              onChangeText={(t) => { setDestination(t); setPicked(false); setPickedCenter(null); }}
              placeholder="Search any city worldwide…"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              returnKeyType="search"
              autoCorrect={false}
            />
            {destination.length > 0 && (
              <Pressable onPress={() => { setDestination(""); setSuggestions([]); setPicked(false); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textFaint} />
              </Pressable>
            )}
          </View>

          {suggestions.length > 0 && !picked ? (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable
                  key={s.label}
                  style={styles.suggestion}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDestination(s.value);
                    setPickedCenter(s.center);
                    setPicked(true);
                    setSuggestions([]);
                  }}
                >
                  <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.suggestionText} numberOfLines={1}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}>
              {POPULAR.map((c) => (
                <Chip key={c} label={c} selected={destination === c} onPress={() => {
                  setDestination(c);
                  const seed = Object.values(SEED_CITIES).find((x) => x.name === c);
                  setPickedCenter(seed ? seed.center : null);
                  setPicked(true);
                  setSuggestions([]);
                }} />
              ))}
            </ScrollView>
          )}

          {/* Itinerary mode */}
          <Text style={styles.label}>Itinerary type</Text>
          <View style={styles.modeRow}>
            {([
              { key: "personalized", label: "Personalized", hint: "Based on your interests", icon: "person" },
              { key: "recommended", label: "Recommended", hint: "Best of the city", icon: "star" },
            ] as const).map((m) => (
              <Pressable
                key={m.key}
                onPress={() => { Haptics.selectionAsync(); setMode(m.key); }}
                style={[styles.modeCard, mode === m.key && styles.modeCardSelected]}
              >
                <Text style={{ fontSize: 18 }}>{m.key === "personalized" ? "🎯" : "⭐"}</Text>
                <Text style={[styles.modeLabel, mode === m.key && { color: colors.text }]}>{m.label}</Text>
                <Text style={styles.modeHint}>{m.hint}</Text>
              </Pressable>
            ))}
          </View>

          {/* Days */}
          <Text style={styles.label}>How many days?</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setDays((d) => Math.max(1, d - 1)); }}
              style={styles.stepBtn}
            >
              <Text style={styles.stepGlyph}>−</Text>
            </Pressable>
            <View style={styles.stepValue}>
              <Text style={styles.stepNum}>{days}</Text>
              <Text style={styles.stepUnit}>{days === 1 ? "day" : "days"}</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setDays((d) => Math.min(10, d + 1)); }}
              style={styles.stepBtn}
            >
              <Text style={styles.stepGlyph}>+</Text>
            </Pressable>
          </View>

          {/* When */}
          <Text style={styles.label}>When?</Text>
          <View style={styles.wrap}>
            {WHEN_OPTIONS.map((o) => (
              <Chip key={o.key} label={o.label} selected={when === o.key} onPress={() => setWhen(o.key)} />
            ))}
          </View>

          {/* Budget */}
          <Text style={styles.label}>Budget</Text>
          <View style={styles.budgetRow}>
            {BUDGETS.map((b) => (
              <Pressable
                key={b.value}
                onPress={() => { Haptics.selectionAsync(); setBudget(b.value); }}
                style={[styles.budgetCard, budget === b.value && styles.budgetCardSelected]}
              >
                <Text style={[styles.budgetLabel, budget === b.value && { color: colors.text }]}>{b.label}</Text>
                <Text style={styles.budgetHint}>{b.hint}</Text>
              </Pressable>
            ))}
          </View>

          {/* Interests */}
          <Text style={styles.label}>Interests</Text>
          <View style={styles.wrap}>
            {INTERESTS.map((t) => (
              <Chip key={t.value} label={t.label} emoji={t.emoji} selected={interests.includes(t.value)} onPress={() => toggleInterest(t.value)} />
            ))}
          </View>

          {error && (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <GradientButton
            label={loading ? "Building your plan…" : "Generate itinerary"}
            icon="sparkles"
            loading={loading}
            onPress={onGenerate}
          />
        </View>
      </KeyboardAvoidingView>
      <GeneratingOverlay visible={loading} destination={destination.trim() || "your trip"} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { color: colors.text, fontSize: font.hero, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: font.body, marginTop: 2, marginBottom: spacing.lg },
  label: { color: colors.text, fontSize: font.body, fontWeight: "700", marginTop: spacing.xl, marginBottom: spacing.md },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 54 },
  input: { flex: 1, color: colors.text, fontSize: font.body },
  suggestions: { marginTop: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  suggestionText: { color: colors.text, fontSize: font.body, flex: 1 },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  modeCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "12" },
  modeLabel: { color: colors.textMuted, fontWeight: "800", fontSize: font.body, marginTop: spacing.sm },
  modeHint: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  stepBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  stepGlyph: { fontSize: 26, fontWeight: "800", color: colors.text, lineHeight: 30 },
  stepValue: { alignItems: "center", flexDirection: "row", gap: 6 },
  stepNum: { color: colors.text, fontSize: font.h1, fontWeight: "900" },
  stepUnit: { color: colors.textMuted, fontSize: font.body },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  budgetRow: { flexDirection: "row", gap: spacing.sm },
  budgetCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: "center" },
  budgetCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + "1A" },
  budgetLabel: { color: colors.textMuted, fontWeight: "800", fontSize: font.body },
  budgetHint: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  error: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.lg, backgroundColor: colors.danger + "1A", borderRadius: radius.md, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: font.small, flex: 1 },
  footer: { padding: spacing.lg, paddingBottom: 86, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
});
