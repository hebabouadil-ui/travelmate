import React, { useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View, Pressable } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  type Region,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import type { GeoPoint, Place } from "@/lib/types";
import { colors, radius, spacing, font, CATEGORY_META } from "@/theme";
import { hasGoogleMaps } from "@/lib/env";

/** Dark map styling (Google) to match the premium UI. */
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d2233" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f1a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1422" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3045" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

function regionFor(center: GeoPoint, places: GeoPoint[]): Region {
  if (places.length === 0) {
    return { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats, center.lat);
  const maxLat = Math.max(...lats, center.lat);
  const minLng = Math.min(...lngs, center.lng);
  const maxLng = Math.max(...lngs, center.lng);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.5),
  };
}

export interface TripMapProps {
  center: GeoPoint;
  places: Place[];
  /** When true, draw the route polyline between places in order. */
  route?: boolean;
  showUser?: boolean;
  height?: number;
  onMarkerPress?: (place: Place) => void;
  style?: object;
}

/**
 * Native map (Google on Android / Apple on iOS) with categorized markers and an
 * optional route polyline. Falls back to a styled placeholder + pin list when no
 * Google Maps key is configured, so the app still works key-free for testing.
 */
export function TripMap({
  center,
  places,
  route,
  showUser,
  height = 240,
  onMarkerPress,
  style,
}: TripMapProps) {
  const mapRef = useRef<MapView>(null);
  const region = useMemo(() => regionFor(center, places), [center, places]);
  const androidNeedsKey = Platform.OS === "android" && !hasGoogleMaps();

  if (androidNeedsKey) {
    return <MapFallback places={places} height={height} onPress={onMarkerPress} style={style} />;
  }

  return (
    <View style={[{ height, borderRadius: radius.lg, overflow: "hidden" }, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={region}
        customMapStyle={Platform.OS === "android" ? DARK_STYLE : undefined}
        showsUserLocation={showUser}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {route && places.length > 1 && (
          <Polyline
            coordinates={places.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor={colors.accent}
            strokeWidth={3}
            lineDashPattern={[1, 6]}
          />
        )}
        {places.map((p, i) => {
          const meta = CATEGORY_META[p.category];
          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={p.name}
              description={meta.label}
              onPress={() => onMarkerPress?.(p)}
            >
              <View style={[styles.pin, { backgroundColor: meta.color }]}>
                {route ? (
                  <Text style={styles.pinNum}>{i + 1}</Text>
                ) : (
                  <Ionicons name={meta.icon as any} size={13} color={colors.white} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

/** Key-free placeholder: a styled "map" with a list of pins. */
function MapFallback({
  places,
  height,
  onPress,
  style,
}: {
  places: Place[];
  height: number;
  onPress?: (p: Place) => void;
  style?: object;
}) {
  return (
    <View style={[styles.fallback, { height }, style]}>
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLineH, { top: (i + 1) * (height / 7) }]} />
        ))}
      </View>
      <Ionicons name="map" size={28} color={colors.primary} style={{ opacity: 0.5 }} />
      <Text style={styles.fallbackTitle}>Map preview</Text>
      <Text style={styles.fallbackHint}>
        Add a Google Maps key to enable the live native map.
      </Text>
      <View style={styles.pinRow}>
        {places.slice(0, 6).map((p) => {
          const meta = CATEGORY_META[p.category];
          return (
            <Pressable key={p.id} onPress={() => onPress?.(p)} style={[styles.miniPin, { borderColor: meta.color }]}>
              <Text style={styles.miniPinEmoji}>{meta.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  pinNum: { color: colors.white, fontWeight: "800", fontSize: 12 },
  fallback: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    overflow: "hidden",
  },
  grid: { ...StyleSheet.absoluteFillObject },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  fallbackTitle: {
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.sm,
    fontSize: font.body,
  },
  fallbackHint: {
    color: colors.textFaint,
    fontSize: font.tiny,
    marginTop: 2,
    textAlign: "center",
  },
  pinRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap", justifyContent: "center" },
  miniPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPinEmoji: { fontSize: 15 },
});
