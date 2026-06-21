import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  MapView,
  Camera,
  MarkerView,
  ShapeSource,
  LineLayer,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GeoPoint, Place } from "@/lib/types";
import { colors, radius, spacing, font, CATEGORY_META } from "@/theme";
import { ENV } from "@/lib/env";

/**
 * Native map powered by MapLibre + free OpenStreetMap vector tiles
 * (OpenFreeMap) — a real, interactive, professional map with NO API key, NO
 * billing and NO Google account. Renders categorized markers and an optional
 * route polyline. Pins still render over a styled background when offline.
 */
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

function boundsFor(center: GeoPoint, places: GeoPoint[]) {
  const pts = places.length ? places : [center];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    ne: [maxLng + 0.004, maxLat + 0.004] as [number, number],
    sw: [minLng - 0.004, minLat - 0.004] as [number, number],
  };
}

export function TripMap({
  center,
  places,
  route,
  showUser,
  height = 240,
  onMarkerPress,
  style,
}: TripMapProps) {
  const bounds = useMemo(() => boundsFor(center, places), [center, places]);

  const routeGeoJSON = useMemo(
    () =>
      ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: places.map((p) => [p.lng, p.lat]),
        },
      }),
    [places]
  );

  const single = places.length <= 1;

  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={ENV.mapStyleUrl}
        logoEnabled={false}
        attributionEnabled
        attributionPosition={{ bottom: 6, right: 6 }}
        compassEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: [center.lng, center.lat],
            zoomLevel: single ? 13 : 11,
          }}
          bounds={
            single
              ? undefined
              : {
                  ne: bounds.ne,
                  sw: bounds.sw,
                  paddingLeft: 40,
                  paddingRight: 40,
                  paddingTop: 60,
                  paddingBottom: 60,
                }
          }
          animationDuration={0}
        />

        {showUser ? <UserLocation visible androidRenderMode="normal" /> : null}

        {route && places.length > 1 ? (
          <ShapeSource id="route-source" shape={routeGeoJSON}>
            <LineLayer
              id="route-line"
              style={{
                lineColor: colors.accent,
                lineWidth: 3.5,
                lineCap: "round",
                lineJoin: "round",
                lineOpacity: 0.9,
              }}
            />
          </ShapeSource>
        ) : null}

        {places.map((p, i) => {
          const meta = CATEGORY_META[p.category];
          return (
            <MarkerView
              key={p.id}
              coordinate={[p.lng, p.lat]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                style={styles.pinWrap}
                onTouchEnd={() => onMarkerPress?.(p)}
              >
                <View style={[styles.pin, { backgroundColor: meta.color }]}>
                  {route ? (
                    <Text style={styles.pinNum}>{i + 1}</Text>
                  ) : (
                    <Ionicons name={meta.icon as any} size={13} color={colors.white} />
                  )}
                </View>
                <View style={[styles.pinTip, { borderTopColor: meta.color }]} />
              </View>
            </MarkerView>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinWrap: { alignItems: "center" },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  pinNum: { color: colors.white, fontWeight: "800", fontSize: 12 },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  // kept for fallback styling references
  fallbackTitle: { color: colors.text, fontWeight: "700", fontSize: font.body },
  hint: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xs },
});
