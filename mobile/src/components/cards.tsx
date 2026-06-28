import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import type { DestinationMatch, ItineraryStop, Place } from "@/lib/types";
import { getKnowledgePack } from "@/lib/data/knowledge";
import { currencySymbol } from "@/lib/currency";
import { SmartImage } from "./SmartImage";
import {
  colors,
  radius,
  spacing,
  font,
  shadow,
  CATEGORY_META,
  DAYPART_META,
  SLOT_META,
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
  const pack = getKnowledgePack(match.name);
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.destCard, shadow.card, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <SmartImage uri={match.image} style={styles.destImage} />
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
          <Icon
            name={favorite ? "heart" : "heart-outline"}
            size={20}
            color={favorite ? colors.danger : colors.white}
          />
        </Pressable>
      )}
      <View style={styles.scoreBadge}>
        <View style={[styles.scoreDot, { backgroundColor: tone }]} />
        <Text style={styles.scoreBadgeText}>{match.score}% match</Text>
      </View>
      <View style={styles.destBody}>
        <Text style={styles.destName}>{match.name}</Text>
        <View style={styles.destMetaRow}>
          <Icon name="location" size={12} color={colors.textMuted} />
          <Text style={styles.destCountry}>{match.country}</Text>
        </View>
        <Text style={styles.destReason} numberOfLines={2}>
          {match.reason}
        </Text>
        {pack ? (
          <View style={styles.destFacts}>
            <Icon name="location" size={11} color={colors.white} />
            <Text style={styles.destFact}>{pack.attractionCount} sights</Text>
            <Text style={styles.destFactDot}>·</Text>
            <Icon name="calendar" size={11} color={colors.white} />
            <Text style={styles.destFact}>Best {pack.bestMonths[0]}–{pack.bestMonths[pack.bestMonths.length - 1]}</Text>
            <Text style={styles.destFactDot}>·</Text>
            <Icon name="wallet" size={11} color={colors.white} />
            <Text style={styles.destFact}>~${pack.budgetPerDay.medium}/day</Text>
          </View>
        ) : null}
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
      <SmartImage uri={match.image} style={styles.miniImage} />
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
  currency = "EUR",
  onRemove,
  onNavigate,
  onPress,
}: {
  stop: ItineraryStop;
  index: number;
  currency?: string;
  onRemove?: () => void;
  onNavigate?: () => void;
  onPress?: () => void;
}) {
  const meta = CATEGORY_META[stop.place.category];
  const daypart = DAYPART_META[stop.daypart];
  // Prefer the guided-day slot (Breakfast, Sunset…) over the generic daypart.
  const slot = stop.slot ? SLOT_META[stop.slot] : null;
  const momentLabel = slot?.label ?? daypart.label;
  const momentIcon = slot?.icon ?? daypart.icon;
  const momentColor = slot?.color ?? daypart.color;
  const transport = TRANSPORT_META[stop.travelMode ?? "walk"];

  return (
    <View>
      {stop.travelFromPrevMin ? (
        <View style={styles.travelConnector}>
          <Icon name={transport.icon as any} size={12} color={colors.textMuted} />
          <Text style={styles.travelText}>
            {transport.label} · {stop.travelFromPrevMin} min
            {stop.travelDistanceKm ? ` · ${stop.travelDistanceKm} km` : ""}
          </Text>
        </View>
      ) : null}

      <View style={styles.stop}>
        <View style={styles.timeline}>
          <Text style={styles.stopTime}>{stop.startTime ?? `#${index + 1}`}</Text>
          <View style={[styles.stopDot, { backgroundColor: momentColor }]}>
            <Icon name={momentIcon as any} size={13} color={colors.white} />
          </View>
          <View style={styles.timelineLine} />
        </View>

        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.stopCard, { transform: [{ scale: pressed ? 0.99 : 1 }] }]}
        >
          <View style={styles.stopCardRow}>
            <LinearGradient
              colors={[meta.color + "33", meta.color + "12"]}
              style={styles.stopIconBadge}
            >
              <Icon name={meta.icon as any} size={24} color={meta.color} strokeWidth={2} />
            </LinearGradient>

            <View style={styles.stopBody}>
              <View style={styles.stopHeader}>
                <View style={[styles.daypartPill, { backgroundColor: momentColor + "22" }]}>
                  <Icon name={momentIcon as any} size={11} color={momentColor} />
                  <Text style={[styles.daypartText, { color: momentColor }]}>{momentLabel}</Text>
                </View>
                <View style={styles.badgeRow}>
                  {stop.place.tier === 1 && (
                    <View style={styles.tier1}>
                      <Icon name="star" size={10} color={colors.warning} fill />
                      <Text style={styles.tier1Text}>Must-see</Text>
                    </View>
                  )}
                  {stop.place.hiddenGem && (
                    <View style={styles.gem}>
                      <Icon name="diamond" size={10} color={colors.accent} />
                      <Text style={styles.gemText}>Hidden gem</Text>
                    </View>
                  )}
                  {stop.place.verified && (
                    <View style={styles.verified}>
                      <Icon name="checkmark-circle" size={11} color={colors.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.stopName} numberOfLines={2} ellipsizeMode="tail">
                {stop.place.name}
              </Text>
              <View style={styles.stopMetaRow}>
                <Icon name={meta.icon} size={13} color={meta.color} strokeWidth={2} />
                <Text style={styles.stopMeta}>{meta.label}</Text>
                <Text style={styles.stopDot2}>·</Text>
                <Icon name="time-outline" size={12} color={colors.textFaint} />
                <Text style={styles.stopMeta}>{stop.durationMin}m</Text>
                {stop.estimatedCost ? (
                  <>
                    <Text style={styles.stopDot2}>·</Text>
                    <Text style={styles.stopMeta}>{currencySymbol(currency)}{stop.estimatedCost}</Text>
                  </>
                ) : null}
                {stop.place.bestTime ? (
                  <>
                    <Text style={styles.stopDot2}>·</Text>
                    <Icon name="sunny-outline" size={12} color={colors.accent} />
                    <Text style={[styles.stopMeta, { color: colors.accent }]}>{stop.place.bestTime}</Text>
                  </>
                ) : null}
                {typeof stop.place.confidence === "number" ? (
                  <>
                    <Text style={styles.stopDot2}>·</Text>
                    <View style={[styles.confDot, { backgroundColor: confColor(stop.place.confidence) }]} />
                    <Text style={[styles.stopMeta, { color: confColor(stop.place.confidence), fontWeight: "700" }]}>
                      {Math.round(stop.place.confidence * 100)}%
                    </Text>
                  </>
                ) : null}
              </View>

              {stop.note ? <Text style={styles.stopNote} numberOfLines={2}>{stop.note}</Text> : null}

              {stop.place.recommendationReason ? (
                <View style={styles.reasonRow}>
                  <Icon name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={styles.reasonText} numberOfLines={2}>{stop.place.recommendationReason}</Text>
                </View>
              ) : null}

              <View style={styles.stopActions}>
                <View style={styles.stopAction}>
                  <Icon name="information-circle-outline" size={14} color={colors.primary} />
                  <Text style={[styles.stopActionText, { color: colors.primary }]}>Details</Text>
                </View>
                {onNavigate && (
                  <Pressable onPress={onNavigate} style={styles.stopAction} hitSlop={6}>
                    <Icon name="navigate" size={14} color={colors.accent} />
                    <Text style={[styles.stopActionText, { color: colors.accent }]}>Go</Text>
                  </Pressable>
                )}
                {onRemove && (
                  <Pressable onPress={onRemove} style={styles.stopAction} hitSlop={6}>
                    <Icon name="trash-outline" size={14} color={colors.danger} />
                    <Text style={[styles.stopActionText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function confColor(c: number): string {
  if (c >= 0.85) return colors.success;
  if (c >= 0.7) return colors.accent;
  return colors.warning;
}

const TRANSPORT_META: Record<string, { icon: string; label: string }> = {
  walk: { icon: "walk", label: "Walk" },
  transit: { icon: "bus", label: "Transit" },
  taxi: { icon: "car-sport", label: "Taxi" },
  car: { icon: "car", label: "Drive" },
};

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
        <Icon name={meta.icon as any} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.rowMeta}>
          {meta.label}
          {place.cuisine ? ` · ${place.cuisine}` : ""}
          {place.hiddenGem ? " · hidden gem" : ""}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,21,26,0.58)",
  },
  scoreDot: { width: 6, height: 6, borderRadius: 3 },
  scoreBadgeText: { fontWeight: "700", fontSize: font.tiny, color: colors.white, letterSpacing: 0.2 },
  destBody: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  destName: { color: colors.white, fontSize: font.h2, fontWeight: "800" },
  destMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  destCountry: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  destReason: { color: "rgba(255,255,255,0.82)", fontSize: font.small, marginTop: spacing.xs, lineHeight: 18 },
  destFacts: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, flexWrap: "wrap" },
  destFact: { color: colors.white, fontSize: font.tiny, fontWeight: "700" },
  destFactDot: { color: "rgba(255,255,255,0.5)", fontSize: font.tiny },

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
  timeline: { alignItems: "center", width: 44 },
  stopTime: { color: colors.text, fontWeight: "800", fontSize: font.small, marginBottom: 4 },
  stopDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  stopCardRow: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, alignItems: "flex-start" },
  stopIconBadge: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  stopBody: { flex: 1 },
  travelConnector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 56,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  stopHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  daypartPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  daypartText: { fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tier1: { flexDirection: "row", alignItems: "center", gap: 3 },
  tier1Text: { color: colors.warning, fontSize: font.tiny, fontWeight: "800" },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  gem: { flexDirection: "row", alignItems: "center", gap: 3 },
  gemText: { color: colors.accent, fontSize: font.tiny, fontWeight: "700" },
  verified: { flexDirection: "row", alignItems: "center", gap: 3 },
  verifiedText: { color: colors.success, fontSize: font.tiny, fontWeight: "700" },
  stopName: { color: colors.text, fontSize: font.h3, fontWeight: "700" },
  stopMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  stopMeta: { color: colors.textMuted, fontSize: font.small },
  stopDot2: { color: colors.textFaint, fontSize: font.small },
  stopNote: { color: colors.textMuted, fontSize: font.small, lineHeight: 19, marginTop: spacing.sm, fontStyle: "italic" },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: spacing.sm },
  reasonText: { color: colors.success, fontSize: font.tiny, lineHeight: 17, flex: 1, fontWeight: "600" },
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
