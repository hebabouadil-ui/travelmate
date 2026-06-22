import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { FadeIn, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, font, radius, spacing } from "@/theme";
import { EmptyState, GhostButton, Pill } from "@/components/ui";
import { SmartImage } from "@/components/SmartImage";
import { useProfile } from "@/store/useProfile";
import { SEED_CITIES } from "@/lib/data/seed";
import { formatCurrency, humanDate } from "@/lib/utils";
import type { Itinerary } from "@/lib/types";

function cityImage(name: string): string | undefined {
  const hit = Object.values(SEED_CITIES).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return hit?.image;
}

export default function Trips() {
  const router = useRouter();
  const savedTrips = useProfile((s) => s.savedTrips);
  const removeTrip = useProfile((s) => s.removeTrip);
  const favorites = useProfile((s) => s.favorites);
  const toggleFavorite = useProfile((s) => s.toggleFavorite);

  const confirmDelete = (trip: Itinerary) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete trip?", `Remove your ${trip.destination} plan?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeTrip(trip.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My trips</Text>
        <Pill label={`${savedTrips.length} saved`} icon="briefcase" />
      </View>

      {savedTrips.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="No trips yet"
          message="Generate your first AI itinerary and it'll be saved here — available even offline."
          cta={<GhostButton label="Plan a trip" icon="add" onPress={() => router.push("/(tabs)/plan")} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>Swipe a trip left to delete</Text>
          {savedTrips.map((trip) => {
            const img = trip.imageUrl || cityImage(trip.destination);
            const fav = favorites.includes(trip.id);
            return (
              <Reanimated.View key={trip.id} entering={FadeIn} layout={Layout.springify()}>
                <ReanimatedSwipeable
                  renderRightActions={() => (
                    <Pressable style={styles.deleteAction} onPress={() => confirmDelete(trip)}>
                      <Icon name="trash" size={22} color={colors.white} />
                    </Pressable>
                  )}
                  overshootRight={false}
                >
                  <Pressable
                    style={styles.tripCard}
                    onPress={() => router.push(`/trip/${trip.id}`)}
                  >
                    <SmartImage uri={img} emoji="🧳" style={styles.tripThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripName}>{trip.destination}</Text>
                      <Text style={styles.tripMeta}>
                        {trip.days.length} {trip.days.length === 1 ? "day" : "days"} ·{" "}
                        {formatCurrency(trip.totalEstimatedCost, trip.currency)}
                      </Text>
                      <View style={styles.tripTags}>
                        <Pill
                          label={trip.engine === "gemini" ? "AI" : "Smart"}
                          icon="sparkles"
                          color={colors.accent}
                        />
                        {trip.days[0]?.date ? (
                          <Text style={styles.tripDate}>{humanDate(trip.days[0].date)}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
                      hitSlop={10}
                      onPress={() => { Haptics.selectionAsync(); toggleFavorite(trip.id); }}
                    >
                      <Icon
                        name={fav ? "heart" : "heart-outline"}
                        size={22}
                        color={fav ? colors.danger : colors.textFaint}
                      />
                    </Pressable>
                  </Pressable>
                </ReanimatedSwipeable>
              </Reanimated.View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { color: colors.text, fontSize: font.hero, fontWeight: "900", letterSpacing: -0.5 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 110 },
  hint: { color: colors.textFaint, fontSize: font.tiny, marginBottom: spacing.md },
  tripCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  tripThumb: { width: 64, height: 64, borderRadius: radius.md },
  tripThumbFallback: { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  tripName: { color: colors.text, fontSize: font.h3, fontWeight: "800" },
  tripMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  tripTags: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  tripDate: { color: colors.textFaint, fontSize: font.tiny },
  deleteAction: { backgroundColor: colors.danger, justifyContent: "center", alignItems: "center", width: 76, borderRadius: radius.lg, marginBottom: spacing.md, marginLeft: spacing.sm },
});
