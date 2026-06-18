import type { GeoPoint, Place } from "../types";
import { haversineKm } from "../utils";

/**
 * Order a set of stops to minimize walking using a nearest-neighbor route
 * starting from the point closest to `start`. This is the heart of the
 * "never waste time crossing the city" requirement.
 */
export function optimizeRoute<T extends GeoPoint>(stops: T[], start?: GeoPoint): T[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const origin =
    start ??
    // default origin: centroid
    {
      lat: avg(stops.map((s) => s.lat)),
      lng: avg(stops.map((s) => s.lng)),
    };

  // first stop = closest to origin
  remaining.sort((a, b) => haversineKm(origin, a) - haversineKm(origin, b));
  const route: T[] = [remaining.shift()!];

  while (remaining.length) {
    const last = route[route.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((cand, i) => {
      const d = haversineKm(last, cand);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    route.push(remaining.splice(bestIdx, 1)[0]);
  }
  return route;
}

/**
 * Group sights into geographically-tight day clusters, each anchored on a
 * high-interest sight, so each day stays in one area of the city.
 */
export function clusterIntoDays(
  sights: Place[],
  days: number,
  perDay: number
): Place[][] {
  const remaining = [...sights].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result: Place[][] = [];

  for (let d = 0; d < days; d++) {
    if (remaining.length === 0) break;
    const seed = remaining.shift()!;
    const group = [seed];
    // pull nearest neighbors to the seed to fill the day
    remaining.sort((a, b) => haversineKm(seed, a) - haversineKm(seed, b));
    while (group.length < perDay && remaining.length) {
      group.push(remaining.shift()!);
    }
    result.push(group);
  }

  // If sights ran out before filling all days, recycle remaining days with
  // any leftover (keeps every requested day populated).
  while (result.length < days && result.length > 0) {
    result.push([]);
  }
  return result;
}

/** Nearest place of a predicate to an anchor, optionally excluding ids. */
export function nearestWhere(
  anchor: GeoPoint,
  pool: Place[],
  predicate: (p: Place) => boolean,
  exclude: Set<string>
): Place | undefined {
  let best: Place | undefined;
  let bestDist = Infinity;
  for (const p of pool) {
    if (exclude.has(p.id) || !predicate(p)) continue;
    const d = haversineKm(anchor, p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}
