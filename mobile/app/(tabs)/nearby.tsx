import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { colors, font, radius, spacing } from "@/theme";
import { GradientButton, EmptyState, Chip } from "@/components/ui";
import { PlaceRow } from "@/components/cards";
import { TripMap } from "@/components/TripMap";
import { useLocation } from "@/hooks/useLocation";
import { nearbyPlaces } from "@/lib/nearby";
import { openInMaps, openDirections } from "@/lib/navigation";
import type { GeoPoint, Place } from "@/lib/types";
import { browseGroupFor, type BrowseCategory } from "@/lib/itinerary/interests";

// V3 category separation: each chip is a real browse GROUP that partitions
// every place category, so no place is hidden under "All" only and none shows
// under two buckets (see BROWSE_GROUPS in itinerary/interests.ts).
const FILTERS: { key: BrowseCategory | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "compass" },
  { key: "food", label: "Food", icon: "utensils" },
  { key: "history", label: "History", icon: "sparkles" },
  { key: "museums", label: "Museums", icon: "sparkles" },
  { key: "nature", label: "Nature", icon: "trees" },
  { key: "shopping", label: "Shopping", icon: "compass" },
  { key: "nightlife", label: "Nightlife", icon: "wine" },
  { key: "culture", label: "Culture", icon: "sparkles" },
];

export default function Nearby() {
  const { requestLocation, loading: gpsLoading } = useLocation();
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [places, setPlaces] = useState<(Place & { distanceKm: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<BrowseCategory | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const discover = async () => {
    setError(null);
    const location = await requestLocation();
    if (!location) {
      setError("Location permission is needed to find places near you.");
      return;
    }
    setCoords(location);
    setLoading(true);
    try {
      const found = await nearbyPlaces(location, 2500);
      setPlaces(found);
      if (found.length === 0) setError("No places found nearby. Try again later.");
    } catch {
      setError("Couldn't load nearby places.");
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    filter === "all" ? places : places.filter((p) => browseGroupFor(p.category) === filter);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby</Text>
          <Text style={styles.subtitle}>Discover what's around you right now</Text>
        </View>
        <Icon name="navigate-circle" size={34} color={colors.primary} />
      </View>

      {!coords ? (
        <EmptyState
          icon="location-outline"
          title="Find places near you"
          message="Use your phone's GPS to discover attractions, restaurants and hidden gems within walking distance."
          cta={
            <GradientButton
              label={gpsLoading ? "Locating…" : "Use my location"}
              icon="navigate"
              loading={gpsLoading}
              onPress={discover}
            />
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TripMap
            center={coords}
            places={filtered}
            showUser
            height={200}
            onMarkerPress={(p) => openInMaps(p, p.name)}
            style={{ marginBottom: spacing.lg }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={f.label} icon={f.icon} selected={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ marginTop: spacing.sm }}>
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Finding great places around you…</Text>
              </View>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.skeleton}>
                  <View style={styles.skelIcon} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={[styles.skelBar, { width: "60%" }]} />
                    <View style={[styles.skelBar, { width: "35%" }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.countRow}>
                <Text style={styles.count}>{filtered.length} places nearby</Text>
                <Pressable onPress={discover} hitSlop={8} style={styles.refresh}>
                  <Icon name="refresh" size={16} color={colors.accent} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </Pressable>
              </View>
              {filtered.map((p) => (
                <PlaceRow key={p.id} place={p} onPress={() => openDirections(p, p.name)} />
              ))}
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  loadingText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  skeleton: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  skelIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  skelBar: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceAlt },
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { color: colors.text, fontSize: font.hero, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 110 },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  count: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  refresh: { flexDirection: "row", alignItems: "center", gap: 4 },
  refreshText: { color: colors.accent, fontSize: font.small, fontWeight: "700" },
  error: { color: colors.danger, fontSize: font.small, textAlign: "center", marginTop: spacing.lg },
});
