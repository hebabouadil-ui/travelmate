import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Share,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, font, radius, spacing, shadow } from "@/theme";
import { TripMap } from "@/components/TripMap";
import { StopCard } from "@/components/cards";
import { PlaceSheet } from "@/components/PlaceSheet";
import { GradientButton, EmptyState, Pill } from "@/components/ui";
import { useProfile } from "@/store/useProfile";
import { recomputeDay } from "@/lib/itinerary/engine";
import { weatherEmoji } from "@/lib/data/weather";
import { openDirections } from "@/lib/navigation";
import { scheduleTripReminder, notifyNow } from "@/lib/notifications";
import { SEED_CITIES } from "@/lib/data/seed";
import { formatCurrency, humanDate } from "@/lib/utils";
import type { Budget, ItineraryStop } from "@/lib/types";

function cityImage(name: string): string | undefined {
  return Object.values(SEED_CITIES).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )?.image;
}

export default function TripDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useProfile((s) => s.savedTrips.find((t) => t.id === id));
  const updateTrip = useProfile((s) => s.updateTrip);
  const removeTrip = useProfile((s) => s.removeTrip);
  const favorites = useProfile((s) => s.favorites);
  const toggleFavorite = useProfile((s) => s.toggleFavorite);

  const [activeDay, setActiveDay] = useState(0);
  const [sheetStop, setSheetStop] = useState<ItineraryStop | null>(null);
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0, 12);

  const day = trip?.days[activeDay];
  const dayPlaces = useMemo(() => day?.stops.map((s) => s.place) ?? [], [day]);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="alert-circle-outline"
          title="Trip not found"
          message="This itinerary may have been removed."
          cta={<GradientButton label="Back to trips" icon="arrow-back" onPress={() => router.replace("/(tabs)/trips")} />}
        />
      </SafeAreaView>
    );
  }

  // Only use a REAL city photo for the hero; otherwise fall back to the brand
  // gradient (never a generic stock photo that could look like another city).
  const img = trip.imageUrl || cityImage(trip.destination);
  const fav = favorites.includes(trip.id);
  const budget: Budget = (trip.profile.budget as Budget) ?? "medium";

  const removeStop = (stopIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const current = trip.days[activeDay];
    const newStops = current.stops.filter((_, i) => i !== stopIndex);
    const recomputed = recomputeDay({ ...current, stops: newStops }, trip.center, budget);
    const newDays = trip.days.map((d, i) => (i === activeDay ? recomputed : d));
    const total = newDays.reduce((s, d) => s + d.estimatedCost, 0);
    updateTrip({ ...trip, days: newDays, totalEstimatedCost: total });
  };

  const onShare = async () => {
    const lines = trip.days
      .map(
        (d) =>
          `Day ${d.day} — ${d.title}\n` +
          d.stops.map((s) => `  • ${s.place.name}`).join("\n")
      )
      .join("\n\n");
    await Share.share({
      title: `My ${trip.destination} trip`,
      message: `My ${trip.days.length}-day Voyage AI plan for ${trip.destination}:\n\n${lines}`,
    }).catch(() => undefined);
  };

  const onReminder = async () => {
    try {
      await scheduleTripReminder(trip);
      await notifyNow("Reminder set ✅", `We'll remind you about ${trip.destination}.`);
      Alert.alert("Reminder set", `You'll get a notification for your ${trip.destination} trip.`);
    } catch {
      Alert.alert("Couldn't set reminder", "Enable notifications in settings and try again.");
    }
  };

  const onDelete = () => {
    Alert.alert("Delete trip?", `Remove your ${trip.destination} plan?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { removeTrip(trip.id); router.back(); } },
    ]);
  };

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} />
          ) : (
            <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={["rgba(5,8,16,0.5)", "transparent", "rgba(11,15,26,1)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroNav, { paddingTop: topPad }]}>
            <Pressable onPress={() => router.back()} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable onPress={onShare} style={styles.navBtn} hitSlop={8}>
                <Ionicons name="share-outline" size={20} color={colors.white} />
              </Pressable>
              <Pressable onPress={() => { Haptics.selectionAsync(); toggleFavorite(trip.id); }} style={styles.navBtn} hitSlop={8}>
                <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={fav ? colors.danger : colors.white} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{trip.destination}</Text>
            <View style={styles.heroMeta}>
              <Pill label={`${trip.days.length} days`} icon="calendar" color={colors.white} />
              <Pill label={formatCurrency(trip.totalEstimatedCost, trip.currency)} icon="wallet" color={colors.accent} />
              <Pill label={trip.engine === "gemini" ? "AI plan" : "Smart plan"} icon="sparkles" color={colors.success} />
            </View>
          </View>
        </View>

        {/* Why visit */}
        {trip.overview ? (
          <View style={styles.section}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.white} />
                </View>
                <Text style={styles.overviewTitle}>Why visit {trip.destination}</Text>
              </View>
              <Text style={styles.overviewText}>{trip.overview}</Text>
              {trip.highlights?.length ? (
                <View style={styles.highlightWrap}>
                  {trip.highlights.map((h) => (
                    <View key={h} style={styles.highlightChip}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Map */}
        <View style={styles.section}>
          <TripMap
            center={trip.center}
            places={dayPlaces}
            route
            routeGeometry={day?.routeGeometry}
            height={220}
            onMarkerPress={(p) => {
              const s = day?.stops.find((st) => st.place.id === p.id);
              if (s) setSheetStop(s);
            }}
          />
        </View>

        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {trip.days.map((d, i) => (
            <Pressable
              key={d.day}
              onPress={() => { Haptics.selectionAsync(); setActiveDay(i); }}
              style={[styles.dayTab, activeDay === i && styles.dayTabActive]}
            >
              <Text style={[styles.dayTabNum, activeDay === i && styles.dayTabNumActive]}>Day {d.day}</Text>
              {d.date ? <Text style={[styles.dayTabDate, activeDay === i && { color: colors.white }]}>{humanDate(d.date)}</Text> : null}
            </Pressable>
          ))}
        </ScrollView>

        {/* Day content */}
        {day && (
          <Animated.View key={activeDay} entering={FadeIn} style={styles.section}>
            <Text style={styles.dayTitle}>{day.title}</Text>
            {day.summary ? <Text style={styles.daySummary}>{day.summary}</Text> : null}

            {/* Weather + budget strip */}
            <View style={styles.strip}>
              {day.weather && (
                <View style={styles.stripItem}>
                  <Text style={styles.stripEmoji}>{weatherEmoji(day.weather.weatherCode)}</Text>
                  <View>
                    <Text style={styles.stripValue}>{day.weather.tempMaxC}° / {day.weather.tempMinC}°</Text>
                    <Text style={styles.stripLabel}>{day.weather.summary}</Text>
                  </View>
                </View>
              )}
              <View style={styles.stripItem}>
                <Ionicons name="wallet" size={20} color={colors.accent} />
                <View>
                  <Text style={styles.stripValue}>{formatCurrency(day.estimatedCost, trip.currency)}</Text>
                  <Text style={styles.stripLabel}>est. for the day</Text>
                </View>
              </View>
            </View>

            {day.weather?.rainRisk && (
              <View style={styles.rain}>
                <Ionicons name="umbrella" size={14} color={colors.rain} />
                <Text style={styles.rainText}>Rain likely — pack an umbrella or plan indoor stops.</Text>
              </View>
            )}

            {/* Stops timeline */}
            <View style={{ marginTop: spacing.lg }}>
              {day.stops.length === 0 ? (
                <Text style={styles.emptyDay}>No stops left for this day. Remove fewer, or regenerate the trip.</Text>
              ) : (
                day.stops.map((stop, i) => (
                  <Animated.View key={`${stop.place.id}-${i}`} layout={Layout.springify()}>
                    <StopCard
                      stop={stop}
                      index={i}
                      city={trip.destination}
                      currency={trip.currency}
                      onPress={() => setSheetStop(stop)}
                      onRemove={() => removeStop(i)}
                      onNavigate={() => openDirections(stop.place, stop.place.name)}
                    />
                  </Animated.View>
                ))
              )}
            </View>
          </Animated.View>
        )}

        {/* Actions */}
        <View style={[styles.section, { gap: spacing.md }]}>
          <GradientButton label="Set trip reminder" icon="notifications" onPress={onReminder} />
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>Delete trip</Text>
          </Pressable>
        </View>
      </ScrollView>

      <PlaceSheet
        stop={sheetStop}
        city={trip.destination}
        visible={!!sheetStop}
        onClose={() => setSheetStop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 280, justifyContent: "space-between" },
  heroNav: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(5,8,16,0.4)", alignItems: "center", justifyContent: "center" },
  heroBody: { padding: spacing.lg },
  heroTitle: { color: colors.white, fontSize: 38, fontWeight: "900", letterSpacing: -0.5 },
  heroMeta: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  overviewCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  overviewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  overviewIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  overviewTitle: { color: colors.text, fontSize: font.h3, fontWeight: "800", flex: 1 },
  overviewText: { color: colors.textMuted, fontSize: font.body, lineHeight: 23 },
  highlightWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  highlightChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent + "14", borderColor: colors.accent + "44", borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  highlightText: { color: colors.accent, fontSize: font.tiny, fontWeight: "700" },
  dayTabs: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.lg },
  dayTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", minWidth: 80 },
  dayTabActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.float },
  dayTabNum: { color: colors.textMuted, fontWeight: "800", fontSize: font.small },
  dayTabNumActive: { color: colors.white },
  dayTabDate: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  dayTitle: { color: colors.text, fontSize: font.h1, fontWeight: "900" },
  daySummary: { color: colors.textMuted, fontSize: font.body, lineHeight: 22, marginTop: spacing.xs },
  strip: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  stripItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  stripEmoji: { fontSize: 26 },
  stripValue: { color: colors.text, fontSize: font.body, fontWeight: "800" },
  stripLabel: { color: colors.textFaint, fontSize: font.tiny },
  rain: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.rain + "1A", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  rainText: { color: colors.rain, fontSize: font.small, flex: 1 },
  emptyDay: { color: colors.textMuted, fontSize: font.body, textAlign: "center", paddingVertical: spacing.xl },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 50 },
  deleteText: { color: colors.danger, fontWeight: "700", fontSize: font.body },
});
