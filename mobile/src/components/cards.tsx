import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { DestinationMatch, ItineraryStop, Place } from "@/lib/types";
import {
  colors,
  radius,
  spacing,
  font,
  shadow,
  CATEGORY_META,
  DAYPART_META,
} from "@/theme";

/** Airbnb-style destination card with image, match score and reason. */
export function DestinationCard({
  match,
  onPress,
  favorite,
  onToggleFavorite,
}: {
  match: DestinationMatch;
  onPress: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const tone =
    match.score >= 85 ? colors.success : match.score >= 70 ? colors.accent : colors.warning;
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.destCard, shadow.card, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <Image source={{ uri: match.image }} style={styles.destImage} />
      <LinearGradient
        colors={["transparent", "rgba(5,8,16,0.15)", "rgba(5,8,16,0.92)"]}
        style={StyleSheet.absoluteFill}
      />
      {onToggleFavorite && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleFavorite();
          }}
          style={styles.heart}
          hitSlop={10}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={20}
            color={favorite ? colors.danger : colors.white}
          />
        </Pressable>
      )}
      <View style={[styles.scoreBadge, { borderColor: tone }]}>
        <Text style={[styles.scoreBadgeText, { color: tone }]}>{match.score}%</Text>
      </View>
      <View style={styles.destBody}>
        <Text style={styles.destName}>{match.name}</Text>
        <View style={styles.destMetaRow}>
          <Ionicons name="location" size={12} color={colors.textMuted} />
          <Text style={styles.destCountry}>{match.country}</Text>
        </View>
        <Text style={styles.destReason} numberOfLines={2}>
          {match.reason}
        </Text>
      </View>
    </Pressable>
  );
}

/** Compact horizontal destination chip (carousel). */
export function DestinationMini({
  match,
  onPress,
}: {
  match: DestinationMatch;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mini, { opacity: pressed ? 0.9 : 1 }]}>
      <Image source={{ uri: match.image }} style={styles.miniImage} />
      <LinearGradient colors={["transparent", "rgba(5,8,16,0.9)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.miniBody}>
        <Text style={styles.miniName}>{match.name}</Text>
        <Text style={styles.miniScore}>{match.score}% match</Text>
      </View>
    </Pressable>
  );
}

/** A single itinerary stop — timeline style. */
export function StopCard({
  stop,
  index,
  onRemove,
  onNavigate,
}: {
  stop: ItineraryStop;
  index: number;
  onRemove?: () => void;
  onNavigate?: () => void;
}) {
  const meta = CATEGORY_META[stop.place.category];
  const daypart = DAYPART_META[stop.daypart];
  return (
    <View style={styles.stop}>
      <View style={styles.timeline}>
        <View style={[styles.stopDot, { backgroundColor: meta.color }]}>
          <Text style={styles.stopDotNum}>{index + 1}</Text>
        </View>
        <View style={styles.timelineLine} />
      </View>

      <View style={styles.stopCard}>
        <View style={styles.stopHeader}>
          <View style={[styles.daypartPill, { backgroundColor: daypart.color + "22" }]}>
            <Ionicons name={daypart.icon as any} size={11} color={daypart.color} />
            <Text style={[styles.daypartText, { color: daypart.color }]}>{daypart.label}</Text>
          </View>
          {stop.place.hiddenGem && (
            <View style={styles.gem}>
              <Ionicons name="diamond" size={10} color={colors.accent} />
              <Text style={styles.gemText}>Hidden gem</Text>
            </View>
          )}
        </View>

        <Text style={styles.stopName}>{stop.place.name}</Text>
        <View style={styles.stopMetaRow}>
          <Text style={styles.stopMeta}>{meta.emoji} {meta.label}</Text>
          <Text style={styles.stopDot2}>·</Text>
          <Ionicons name="time-outline" size={12} color={colors.textFaint} />
          <Text style={styles.stopMeta}>{stop.durationMin}m</Text>
          {stop.estimatedCost ? (
            <>
              <Text style={styles.stopDot2}>·</Text>
              <Text style={styles.stopMeta}>€{stop.estimatedCost}</Text>
            </>
          ) : null}
        </View>

        {stop.note ? <Text style={styles.stopNote}>{stop.note}</Text> : null}

        {stop.travelFromPrevMin ? (
          <View style={styles.travelRow}>
            <Ionicons
              name={
                stop.travelMode === "walk"
                  ? "walk"
                  : stop.travelMode === "transit"
                  ? "bus"
                  : "car"
              }
              size={12}
              color={colors.textFaint}
            />
            <Text style={styles.travelText}>
              {stop.travelFromPrevMin} min {stop.travelMode} from previous stop
            </Text>
          </View>
        ) : null}

        <View style={styles.stopActions}>
          {onNavigate && (
            <Pressable onPress={onNavigate} style={styles.stopAction} hitSlop={6}>
              <Ionicons name="navigate" size={14} color={colors.accent} />
              <Text style={[styles.stopActionText, { color: colors.accent }]}>Navigate</Text>
            </Pressable>
          )}
          {onRemove && (
            <Pressable onPress={onRemove} style={styles.stopAction} hitSlop={6}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.stopActionText, { color: colors.danger }]}>Remove</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/** Nearby place list row (distance-sorted). */
export function PlaceRow({
  place,
  onPress,
}: {
  place: Place & { distanceKm?: number };
  onPress: () => void;
}) {
  const meta = CATEGORY_META[place.category];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: meta.color + "22" }]}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.rowMeta}>
          {meta.label}
          {place.cuisine ? ` · ${place.cuisine}` : ""}
          {place.hiddenGem ? " · 💎 gem" : ""}
        </Text>
      </View>
      {typeof place.distanceKm === "number" && (
        <View style={styles.distancePill}>
          <Text style={styles.distanceText}>
            {place.distanceKm < 1
              ? `${Math.round(place.distanceKm * 1000)} m`
              : `${place.distanceKm.toFixed(1)} km`}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  destCard: {
    height: 230,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  destImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heart: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(5,8,16,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: "rgba(5,8,16,0.55)",
  },
  scoreBadgeText: { fontWeight: "800", fontSize: font.small },
  destBody: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  destName: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  destMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  destCountry: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  destReason: { color: "rgba(255,255,255,0.82)", fontSize: font.small, marginTop: spacing.xs, lineHeight: 18 },

  mini: {
    ...shadow.card,
    width: 150,
    height: 190,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginRight: spacing.md,
    backgroundColor: colors.surface,
  },
  miniImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  miniBody: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md },
  miniName: { color: colors.white, fontSize: font.h3, fontWeight: "800" },
  miniScore: { color: colors.accent, fontSize: font.tiny, fontWeight: "700", marginTop: 2 },

  stop: { flexDirection: "row", gap: spacing.md },
  timeline: { alignItems: "center", width: 28 },
  stopDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  stopDotNum: { color: colors.white, fontWeight: "800", fontSize: 12 },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  stopCard: {
    ...shadow.soft,
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  stopHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  daypartPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  daypartText: { fontSize: font.tiny, fontWeight: "700" },
  gem: { flexDirection: "row", alignItems: "center", gap: 3 },
  gemText: { color: colors.accent, fontSize: font.tiny, fontWeight: "700" },
  stopName: { color: colors.text, fontSize: font.h3, fontWeight: "700" },
  stopMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  stopMeta: { color: colors.textMuted, fontSize: font.small },
  stopDot2: { color: colors.textFaint, fontSize: font.small },
  stopNote: { color: colors.textMuted, fontSize: font.small, lineHeight: 19, marginTop: spacing.sm, fontStyle: "italic" },
  travelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  travelText: { color: colors.textFaint, fontSize: font.tiny },
  stopActions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  stopAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  stopActionText: { fontSize: font.small, fontWeight: "600" },

  row: {
    ...shadow.soft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowName: { color: colors.text, fontSize: font.body, fontWeight: "700" },
  rowMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  distancePill: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  distanceText: { color: colors.accent, fontSize: font.tiny, fontWeight: "700" },
});
