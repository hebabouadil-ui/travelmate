import { Linking, Platform } from "react-native";
import type { GeoPoint } from "./types";

/**
 * Native navigation hand-off: open the platform's maps app with turn-by-turn
 * directions to a destination. Uses Apple Maps on iOS and Google Maps on
 * Android, falling back to a universal Google Maps URL.
 */
export async function openDirections(
  to: GeoPoint,
  label?: string
): Promise<void> {
  const latLng = `${to.lat},${to.lng}`;
  const encodedLabel = encodeURIComponent(label ?? "Destination");

  const url =
    Platform.select({
      ios: `maps://?daddr=${latLng}&q=${encodedLabel}`,
      android: `google.navigation:q=${latLng}`,
    }) ?? `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;

  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;

  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : fallback);
  } catch {
    await Linking.openURL(fallback).catch(() => undefined);
  }
}

/** Open a place pin in the maps app (no routing). */
export async function openInMaps(
  point: GeoPoint,
  label?: string
): Promise<void> {
  const latLng = `${point.lat},${point.lng}`;
  const q = encodeURIComponent(label ?? "Place");
  const url =
    Platform.select({
      ios: `maps://?ll=${latLng}&q=${q}`,
      android: `geo:${latLng}?q=${latLng}(${q})`,
    }) ?? `https://www.google.com/maps/search/?api=1&query=${latLng}`;
  await Linking.openURL(url).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${latLng}`
    ).catch(() => undefined)
  );
}
