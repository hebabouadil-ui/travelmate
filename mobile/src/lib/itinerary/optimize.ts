import type { GeoPoint, Place } from "../types";
import { haversineKm } from "../utils";

/**
 * Order a set of stops to minimize walking using a nearest-neighbor route
 * starting from the point closest to `start`. This is the heart of the "never
 * waste time crossing the city" requirement.
 */
export function optimizeRoute<T extends GeoPoint>(
  stops: T[],
  start?: GeoPoint
): T[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const origin =
    start ??
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
 * Decide how many sights each day should get. Spreads the available sights
 * evenly across all days (so later days are never starved) while capping each
 * day at `maxPerDay` for a comfortable pace. A 1-day trip therefore gets the
 * fullest possible day (up to the cap).
 */
export function planPerDay(total: number, days: number, maxPerDay: number): number[] {
  if (days <= 0) return [];
  const counts = new Array(days).fill(0);
  let remaining = Math.min(total, days * maxPerDay);
  let i = 0;
  let guard = 0;
  while (remaining > 0 && guard < days * maxPerDay + days) {
    if (counts[i] < maxPerDay) {
      counts[i]++;
      remaining--;
    }
    i = (i + 1) % days;
    guard++;
  }
  return counts;
}

/**
 * Group sights into geographically-tight day clusters, each anchored on a
 * high-interest sight, so each day stays in one area of the city. `counts`
 * controls how many sights land on each day (see `planPerDay`).
 */
export function clusterIntoDays(sights: Place[], counts: number[]): Place[][] {
  const remaining = [...sights].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const result: Place[][] = [];

  for (let d = 0; d < counts.length; d++) {
    const want = counts[d];
    const group: Place[] = [];
    if (remaining.length && want > 0) {
      const seed = remaining.shift()!;
      group.push(seed);
      remaining.sort((a, b) => haversineKm(seed, a) - haversineKm(seed, b));
      while (group.length < want && remaining.length) {
        group.push(remaining.shift()!);
      }
    }
    result.push(group);
  }
  return result;
}

/**
 * Nearest place matching a predicate to an anchor, preferring ones not already
 * used. When every match has been used and `allowReuse` is true, it returns the
 * nearest match anyway — so days never go without a meal just because the pool
 * is small (important for offline/seed-only plans).
 */
export function nearestWhere(
  anchor: GeoPoint,
  pool: Place[],
  predicate: (p: Place) => boolean,
  exclude: Set<string>,
  allowReuse = false
): Place | undefined {
  let best: Place | undefined;
  let bestDist = Infinity;
  let fallback: Place | undefined;
  let fallbackDist = Infinity;
  for (const p of pool) {
    if (!predicate(p)) continue;
    const d = haversineKm(anchor, p);
    if (exclude.has(p.id)) {
      if (d < fallbackDist) {
        fallbackDist = d;
        fallback = p;
      }
      continue;
    }
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best ?? (allowReuse ? fallback : undefined);
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

/**
 * Restaurant/Café Engine's walking-distance constraint: a meal must come
 * from within walking distance of the current itinerary, not from anywhere
 * in the city. A near, already-used match (reusing a great nearby spot for
 * both lunch and dinner) beats a brand-new match outside `maxKm` — so a meal
 * is never picked from across town just because it hasn't been visited yet.
 * Only widens to the unrestricted nearest match (any distance) when literally
 * nothing in the pool falls within `maxKm`, so a day is never left without
 * food in a thin-data city.
 */
export function nearestWithinRadius(
  anchor: GeoPoint,
  pool: Place[],
  predicate: (p: Place) => boolean,
  exclude: Set<string>,
  maxKm: number,
  allowReuse = false
): Place | undefined {
  const candidates = pool
    .filter(predicate)
    .map((p) => ({ p, d: haversineKm(anchor, p) }));
  const within = candidates.filter((c) => c.d <= maxKm);

  const unusedWithin = within.filter((c) => !exclude.has(c.p.id));
  if (unusedWithin.length) return closest(unusedWithin);
  if (allowReuse && within.length) return closest(within);

  const unused = candidates.filter((c) => !exclude.has(c.p.id));
  if (unused.length) return closest(unused);
  return allowReuse && candidates.length ? closest(candidates) : undefined;
}

function closest(cs: { p: Place; d: number }[]): Place {
  return cs.reduce((best, c) => (c.d < best.d ? c : best)).p;
}

/**
 * Nightlife Engine's district-first rule: prioritize a real nightlife
 * DISTRICT — a cluster of several bars/clubs genuinely close together in the
 * real OSM data, nothing invented — over a single isolated venue that merely
 * happens to be slightly closer to the anchor. Within the winning district,
 * picks the closest unused venue; falls back to reuse only when every
 * nightlife candidate has already been used.
 */
export function bestNightlifeVenue(
  anchor: GeoPoint,
  nightlife: Place[],
  exclude: Set<string>,
  allowReuse = false,
  districtRadiusKm = 0.3
): Place | undefined {
  const density = (p: Place) =>
    nightlife.filter((o) => o.id !== p.id && haversineKm(p, o) <= districtRadiusKm).length;

  const pickBest = (list: Place[]): Place | undefined => {
    if (!list.length) return undefined;
    return list
      .map((p) => ({ p, density: density(p), d: haversineKm(anchor, p) }))
      // Densest real cluster wins; distance to the anchor only breaks ties.
      .sort((a, b) => b.density - a.density || a.d - b.d)[0].p;
  };

  const unused = nightlife.filter((p) => !exclude.has(p.id));
  return pickBest(unused) ?? (allowReuse ? pickBest(nightlife) : undefined);
}
