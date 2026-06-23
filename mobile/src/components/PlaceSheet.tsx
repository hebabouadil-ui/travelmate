import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import type { ItineraryStop } from "@/lib/types";
import { colors, font, radius, spacing, CATEGORY_META } from "@/theme";
import { resolveStopMedia } from "@/lib/data/media";
import { reverseGeocode } from "@/lib/data/geocode";
import { openDirections, openInMaps } from "@/lib/navigation";
import { hasExactPhoto } from "@/lib/itinerary/validate";
import { GradientButton, GhostButton } from "./ui";

/**
 * Rich place-detail sheet. Lazily fetches a high-quality photo + description
 * from Wikipedia when opened, and shows why-visit, duration, best time, area
 * and opening hours, with native directions.
 */
export function PlaceSheet({
  stop,
  city,
  visible,
  onClose,
}: {
  stop: ItineraryStop | null;
  city: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | undefined>();
  const [desc, setDesc] = useState<string | undefined>();
  const [address, setAddress] = useState<string | undefined>();

  const place = stop?.place;

  useEffect(() => {
    let active = true;
    if (visible && place) {
      setImage(place.imageUrl);
      setDesc(place.description);
      setAddress(place.address);
      setLoading(true);
      resolveStopMedia(place, city)
        .then((m) => {
          if (!active) return;
          if (m.imageUrl) setImage(m.imageUrl);
          if (m.description) setDesc(m.description);
        })
        .finally(() => active && setLoading(false));
      // Never show raw coordinates: reverse-geocode a human address when one
      // isn't already on the place (free, keyless, cached).
      if (!place.address) {
        reverseGeocode(place).then((a) => {
          if (active && a) setAddress(a);
        });
      }
    }
    return () => {
      active = false;
    };
  }, [visible, place, city]);

  if (!place) return null;
  const meta = CATEGORY_META[place.category];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              {image ? (
                <Image source={{ uri: image }} style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={colors.gradient} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient
                colors={["transparent", "rgba(5,8,16,0.85)"]}
                style={StyleSheet.absoluteFill}
              />
              {loading ? (
                <ActivityIndicator color={colors.white} style={styles.heroLoading} />
              ) : !hasExactPhoto(place) ? (
                // V3 photo honesty: never pass off a placeholder as the real
                // thing — say so rather than implying a generic image is exact.
                <View style={styles.placeholderChip}>
                  <Icon name="image-outline" size={11} color={colors.white} />
                  <Text style={styles.placeholderText}>Representative image</Text>
                </View>
              ) : null}
              <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
                <Icon name="close" size={20} color={colors.white} />
              </Pressable>
              <View style={styles.heroBody}>
                <View style={[styles.catChip, { backgroundColor: meta.color }]}>
                  <Icon name={meta.icon as any} size={12} color={colors.white} />
                  <Text style={styles.catText}>{meta.label}</Text>
                </View>
                <Text style={styles.name}>{place.name}</Text>
                {place.neighborhood ? (
                  <Text style={styles.area}>
                    <Icon name="location" size={12} color="rgba(255,255,255,0.85)" />{" "}
                    {place.neighborhood}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.content}>
              {place.whyVisit ? (
                <View style={styles.whyBox}>
                  <Icon name="sparkles" size={15} color={colors.primary} />
                  <Text style={styles.whyText}>{place.whyVisit}</Text>
                </View>
              ) : null}

              {place.recommendationReason ? (
                <View style={styles.reasonBox}>
                  <Icon name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.reasonText}>{place.recommendationReason}</Text>
                </View>
              ) : null}

              {desc ? <Text style={styles.desc}>{desc}</Text> : null}

              <View style={styles.verifyRow}>
                <Icon
                  name={place.verified ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={place.verified ? colors.success : colors.textFaint}
                />
                <Text style={[styles.verifyText, place.verified && { color: colors.success }]}>
                  {place.verified
                    ? "Verified location · OpenStreetMap"
                    : "Location approximate — not independently verified"}
                  {typeof place.confidence === "number"
                    ? `  ·  ${Math.round(place.confidence * 100)}% confidence`
                    : ""}
                </Text>
              </View>

              <View style={styles.infoGrid}>
                <Info icon="time-outline" label="Suggested" value={`${stop?.durationMin ?? 60} min`} />
                <Info icon="sunny-outline" label="Best time" value={place.bestTime || "Information unavailable"} />
                <Info icon="alarm-outline" label="Hours" value={place.openingHours || "Information unavailable"} />
                {place.cuisine ? <Info icon="restaurant-outline" label="Cuisine" value={place.cuisine} /> : null}
                <Info icon="location-outline" label="Address" value={address || "Address unavailable"} />
                {place.website ? (
                  <Pressable
                    style={styles.info}
                    onPress={() => Linking.openURL(place.website!).catch(() => {})}
                  >
                    <Icon name="globe-outline" size={16} color={colors.primary} />
                    <View>
                      <Text style={styles.infoLabel}>Website</Text>
                      <Text style={[styles.infoValue, { color: colors.primary }]} numberOfLines={1}>
                        Open official site
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.actions}>
                <GradientButton
                  label="Directions"
                  icon="navigate"
                  onPress={() => openDirections(place, place.name)}
                  style={{ flex: 1 }}
                />
                <GhostButton label="Map" icon="map" onPress={() => openInMaps(place, place.name)} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Info({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Icon name={icon} size={16} color={colors.textMuted} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(5,8,16,0.5)" },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "88%",
    overflow: "hidden",
    paddingBottom: spacing.xl,
  },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginTop: spacing.sm, marginBottom: spacing.xs, zIndex: 2 },
  hero: { height: 240, justifyContent: "flex-end" },
  heroLoading: { position: "absolute", top: spacing.lg, alignSelf: "center" },
  close: { position: "absolute", top: spacing.md, right: spacing.md, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(5,8,16,0.45)", alignItems: "center", justifyContent: "center" },
  heroBody: { padding: spacing.lg },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.sm },
  catText: { color: colors.white, fontSize: font.tiny, fontWeight: "700" },
  name: { color: colors.white, fontSize: font.h1, fontWeight: "900" },
  area: { color: "rgba(255,255,255,0.85)", fontSize: font.small, marginTop: 4 },
  content: { padding: spacing.lg },
  whyBox: { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.primary + "12", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  whyText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 21, fontWeight: "600" },
  reasonBox: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.success + "12", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  reasonText: { flex: 1, color: colors.success, fontSize: font.small, lineHeight: 19, fontWeight: "700" },
  placeholderChip: { position: "absolute", top: spacing.md, left: spacing.md, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(5,8,16,0.55)", paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  placeholderText: { color: colors.white, fontSize: font.tiny, fontWeight: "600" },
  verifyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  verifyText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: "600" },
  desc: { color: colors.textMuted, fontSize: font.body, lineHeight: 22, marginBottom: spacing.lg },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  info: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minWidth: "44%", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  infoLabel: { color: colors.textFaint, fontSize: font.tiny },
  infoValue: { color: colors.text, fontSize: font.small, fontWeight: "700" },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
});
