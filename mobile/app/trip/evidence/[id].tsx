import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { colors, font, radius, spacing } from "@/theme";
import { GradientButton, EmptyState } from "@/components/ui";
import { useProfile } from "@/store/useProfile";
import type { Place } from "@/lib/types";

/**
 * Generation Evidence — the proof, on the device. For the active plan it shows
 * exactly what a premium engine should expose: every selected stop with its
 * FINAL SCORE, data SOURCE and the deterministic reason it won, plus the
 * rejected candidates the engine considered and beat. This is how the running
 * APK demonstrates that interests, budget and curation actually drove the plan.
 */

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SOURCE_LABEL: Record<string, string> = {
  mock: "Curated",
  overpass: "OSM / Foursquare",
  wikidata: "Wikidata",
  wikipedia: "Wikipedia",
  opentripmap: "OpenTripMap",
  ai: "AI",
};

function sourceLabel(p: Place): string {
  if (p.curated) return "Curated";
  return SOURCE_LABEL[p.source] ?? p.source;
}

function scoreText(n?: number): string {
  return typeof n === "number" ? n.toFixed(2) : "—";
}

function Badge({ text, tone = "muted" }: { text: string; tone?: "muted" | "gold" | "green" | "blue" }) {
  const bg =
    tone === "gold" ? "#C8A24622" : tone === "green" ? colors.success + "22" : tone === "blue" ? colors.primary + "22" : colors.surfaceAlt;
  const fg =
    tone === "gold" ? "#E5C06B" : tone === "green" ? colors.success : tone === "blue" ? colors.primary : colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

function priceText(p?: 1 | 2 | 3 | 4): string | null {
  if (!p) return null;
  return "$".repeat(p);
}

export default function Evidence() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useProfile((s) => s.savedTrips.find((t) => t.id === id));
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0, 12);

  const selectedNames = useMemo(
    () => new Set((trip?.days ?? []).flatMap((d) => d.stops.map((s) => norm(s.place.name)))),
    [trip]
  );
  const rejected = useMemo(
    () => (trip?.debugPool ?? []).filter((p) => !selectedNames.has(norm(p.name))).slice(0, 40),
    [trip, selectedNames]
  );

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="alert-circle-outline"
          title="No plan"
          message="Generate a trip first to see its evidence."
          cta={<GradientButton label="Back" icon="arrow-back" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const interests = trip.profile.interests ?? [];
  const candidateCount = trip.debugPool?.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={[styles.nav, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.navBtn} hitSlop={8}>
          <Icon name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Generation evidence</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.h1}>{trip.destination}</Text>
          <View style={styles.metaRow}>
            <Badge text={`${trip.profile.budget ?? "medium"} budget`} tone="gold" />
            {interests.length ? interests.map((i) => <Badge key={i} text={i} tone="blue" />) : <Badge text="best-of" />}
          </View>
          <View style={styles.statRow}>
            <Stat value={typeof trip.generationMs === "number" ? `${(trip.generationMs / 1000).toFixed(1)}s` : "—"} label="Generation time" />
            <Stat value={`${candidateCount}`} label="Candidates scored" />
            <Stat value={`${trip.audit?.qualityScore ?? "—"}`} label="Quality score" />
          </View>
          <Text style={styles.note}>
            Final score = fame + category value + interest match + curation + must-see tier + budget price-fit. Higher wins; the engine selects the highest-scoring real places per slot — never the first API result.
          </Text>
        </View>

        {/* Selected, per day */}
        <Text style={styles.section}>Selected — why each won</Text>
        {trip.days.map((d) => (
          <View key={d.day} style={styles.card}>
            <Text style={styles.dayTitle}>
              Day {d.day} · {d.theme ?? d.title}
            </Text>
            {d.stops.map((s, i) => {
              const p = s.place;
              return (
                <View key={`${p.id}-${i}`} style={styles.row}>
                  <View style={styles.rowHead}>
                    <Text style={styles.placeName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.score}>{scoreText(p.score)}</Text>
                  </View>
                  <View style={styles.chips}>
                    <Badge text={p.category} />
                    <Badge text={sourceLabel(p)} tone={p.curated ? "green" : "muted"} />
                    {p.tier === 1 ? <Badge text="must-see" tone="gold" /> : null}
                    {priceText(p.priceLevel) ? <Badge text={priceText(p.priceLevel)!} tone="muted" /> : null}
                  </View>
                  {p.recommendationReason ? (
                    <Text style={styles.reason}>{p.recommendationReason}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        {/* Rejected */}
        <Text style={styles.section}>Rejected candidates ({rejected.length})</Text>
        <View style={styles.card}>
          {rejected.length === 0 ? (
            <Text style={styles.note}>No other candidates were available for this destination.</Text>
          ) : (
            rejected.map((p, i) => (
              <View key={`${p.id}-${i}`} style={styles.rejRow}>
                <Text style={styles.rejName} numberOfLines={1}>
                  {p.name}
                </Text>
                <View style={styles.chips}>
                  <Badge text={p.category} />
                  <Badge text={sourceLabel(p)} tone={p.curated ? "green" : "muted"} />
                  {priceText(p.priceLevel) ? <Badge text={priceText(p.priceLevel)!} /> : null}
                </View>
                <Text style={styles.rejScore}>{scoreText(p.score)}</Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  navTitle: { color: colors.text, fontSize: font.body, fontWeight: "800" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  h1: { color: colors.text, fontSize: font.h1, fontWeight: "900", letterSpacing: -0.5 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  statRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  statValue: { color: colors.text, fontSize: font.h2, fontWeight: "900" },
  statLabel: { color: colors.textFaint, fontSize: font.tiny, marginTop: 2 },
  note: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, marginTop: spacing.md },
  section: { color: colors.text, fontSize: font.body, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.sm },
  dayTitle: { color: colors.primary, fontSize: font.small, fontWeight: "800", marginBottom: spacing.sm },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingVertical: spacing.md },
  rowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  placeName: { color: colors.text, fontSize: font.body, fontWeight: "700", flex: 1 },
  score: { color: colors.success, fontSize: font.body, fontWeight: "900", fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: font.tiny, fontWeight: "700" },
  reason: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, marginTop: 6 },
  rejRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingVertical: spacing.sm },
  rejName: { color: colors.textMuted, fontSize: font.small, fontWeight: "600", flex: 1 },
  rejScore: { color: colors.textFaint, fontSize: font.small, fontWeight: "800", fontVariant: ["tabular-nums"], width: 48, textAlign: "right" },
});
