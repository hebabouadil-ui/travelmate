import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, font, radius, spacing } from "@/theme";
import { SectionTitle } from "@/components/ui";
import { DestinationCard, DestinationMini } from "@/components/cards";
import { matchDestinations } from "@/lib/match";
import { useProfile } from "@/store/useProfile";
import { TRAVELER_TYPES } from "@/lib/onboarding-config";
import { useNetwork } from "@/hooks/useNetwork";

export default function Discover() {
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const favorites = useProfile((s) => s.favorites);
  const toggleFavorite = useProfile((s) => s.toggleFavorite);
  const savedTrips = useProfile((s) => s.savedTrips);
  const { online } = useNetwork();

  const matches = useMemo(() => matchDestinations(profile), [profile]);
  const top = matches.slice(0, 5);
  const rest = matches.slice(0, 8);

  const typeLabel =
    TRAVELER_TYPES.find((t) => t.value === profile.travelerType)?.label ?? "Traveler";

  const goPlan = (destination: string) =>
    router.push({ pathname: "/(tabs)/plan", params: { destination } });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title}>Where to next?</Text>
          </View>
          <Pressable style={styles.typeBadge} onPress={() => router.push("/(tabs)/profile")}>
            <Icon name="person" size={22} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        {!online && (
          <View style={styles.offline}>
            <Icon name="cloud-offline" size={14} color={colors.warning} />
            <Text style={styles.offlineText}>Offline — showing cached recommendations</Text>
          </View>
        )}

        {/* Search prompt */}
        <Pressable style={styles.search} onPress={() => router.push("/(tabs)/plan")}>
          <Icon name="search" size={18} color={colors.textFaint} />
          <Text style={styles.searchText}>Search a city or plan a trip…</Text>
        </Pressable>

        {/* Saved trips quick access */}
        {savedTrips.length > 0 && (
          <Pressable style={styles.resume} onPress={() => router.push(`/trip/${savedTrips[0].id}`)}>
            <View style={styles.resumeIcon}>
              <Icon name="briefcase" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeLabel}>Continue planning</Text>
              <Text style={styles.resumeName}>{savedTrips[0].destination}</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Top matches carousel */}
        <SectionTitle
          title="Your top matches"
          subtitle={`Curated for a ${typeLabel.toLowerCase()}`}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.xl }}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          {top.map((m) => (
            <DestinationMini key={m.name} match={m} onPress={() => goPlan(m.name)} />
          ))}
        </ScrollView>

        {/* Recommended list */}
        <SectionTitle title="Recommended for you" subtitle="AI match score based on your profile" />
        {rest.map((m, i) => (
          <Animated.View key={m.name} entering={FadeInDown.delay(i * 60).springify()}>
            <DestinationCard
              match={m}
              favorite={favorites.includes(m.name)}
              onToggleFavorite={() => toggleFavorite(m.name)}
              onPress={() => goPlan(m.name)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  greeting: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  title: { color: colors.text, fontSize: font.hero, fontWeight: "900", letterSpacing: -0.5 },
  typeBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
  offline: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.warning + "1A", borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  offlineText: { color: colors.warning, fontSize: font.tiny, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, height: 50, marginBottom: spacing.lg },
  searchText: { color: colors.textFaint, fontSize: font.body },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xl },
  resumeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  resumeLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: "600" },
  resumeName: { color: colors.text, fontSize: font.body, fontWeight: "700", marginTop: 1 },
});
