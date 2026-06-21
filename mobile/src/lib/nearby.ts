import type { GeoPoint, Place } from "./types";
import { overpassPlaces } from "./data/overpass";
import { haversineKm } from "./utils";
import { withCache } from "./cache";

/**
 * Live GPS mode: nearby attractions / restaurants / hidden gems sorted by
 * distance. Mirrors the old /api/nearby route but runs on-device, with caching
 * so a previously-visited area still works offline.
 */
export async function nearbyPlaces(
  center: GeoPoint,
  radiusM = 1500
): Promise<(Place & { distanceKm: number })[]> {
  const radius = Math.min(radiusM, 5000);
  const cacheKey = `nearby:${center.lat.toFixed(3)},${center.lng.toFixed(
    3
  )}:${radius}`;

  let places = await withCache<Place[]>(
    cacheKey,
    1000 * 60 * 30, // 30 minutes
    () => overpassPlaces(center, radius),
    (v) => v.length === 0
  ).catch(() => [] as Place[]);

  // Escalate the search radius if nothing turned up nearby.
  if (places.length === 0) {
    const wider = Math.min(radius * 3, 5000);
    places = await overpassPlaces(center, wider).catch(() => [] as Place[]);
  }

  return places
    .map((p) => ({
      ...p,
      distanceKm: Math.round(haversineKm(center, p) * 100) / 100,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40);
}
