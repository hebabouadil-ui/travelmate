import type { Budget, GeoPoint, Place, TravelMode } from "../types";
import { haversineKm, walkingMinutes } from "../utils";

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
  allowReuse = false,
  rank?: (p: Place) => number
): Place | undefined {
  const candidates = pool
    .filter(predicate)
    .map((p) => ({ p, d: haversineKm(anchor, p) }));
  const within = candidates.filter((c) => c.d <= maxKm);

  // 1. Best UNUSED option within walking distance — the ideal.
  const unusedWithin = within.filter((c) => !exclude.has(c.p.id));
  if (unusedWithin.length) return pick(unusedWithin, rank);

  // 2. Best UNUSED option anywhere. Variety beats proximity here: serving a
  //    fresh restaurant a little farther away is far better than recommending
  //    the same place at lunch and dinner three days running (the "food
  //    recommendations barely change" / duplicate-stop complaint). A short
  //    transit leg is acceptable; a repeated venue is not.
  const unused = candidates.filter((c) => !exclude.has(c.p.id));
  if (unused.length) return pick(unused, rank);

  // 3. Only once everything is used do we reuse — nearest-within first, then
  //    anywhere — so a thin-data city still never leaves a meal slot empty.
  if (allowReuse && within.length) return pick(within, rank);
  return allowReuse && candidates.length ? pick(candidates, rank) : undefined;
}

function closest(cs: { p: Place; d: number }[]): Place {
  return cs.reduce((best, c) => (c.d < best.d ? c : best)).p;
}

/** Best-ranked candidate when a `rank` function is supplied (higher wins —
 *  used to fold in budget fit/fame/rating); otherwise the plain
 *  closest-by-distance choice, so existing callers see no behavior change
 *  unless they opt in. */
function pick(cs: { p: Place; d: number }[], rank?: (p: Place) => number): Place {
  if (!rank) return closest(cs);
  return cs.reduce((best, c) => (rank(c.p) > rank(best.p) ? c : best)).p;
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
  districtRadiusKm = 0.3,
  rank?: (p: Place) => number
): Place | undefined {
  const density = (p: Place) =>
    nightlife.filter((o) => o.id !== p.id && haversineKm(p, o) <= districtRadiusKm).length;

  const pickBest = (list: Place[]): Place | undefined => {
    if (!list.length) return undefined;
    return list
      .map((p) => ({ p, density: density(p), q: rank ? rank(p) : 0, d: haversineKm(anchor, p) }))
      // Densest real cluster wins; quality (fame/budget fit/rating, when
      // supplied) breaks ties among similarly-dense venues; raw distance to
      // the anchor is the final tie-break.
      .sort((a, b) => b.density - a.density || b.q - a.q || a.d - b.d)[0].p;
  };

  const unused = nightlife.filter((p) => !exclude.has(p.id));
  return pickBest(unused) ?? (allowReuse ? pickBest(nightlife) : undefined);
}

/** Route/Transport Engine: walk/transit distance ceilings per budget tier. The
 *  `medium` row matches the original distance-only thresholds exactly, so a
 *  caller that doesn't pass a budget sees no behavior change. */
const MODE_CEILINGS_KM: Record<Budget, { walk: number; transit: number }> = {
  economy: { walk: 2.5, transit: 15 },
  medium: { walk: 1.8, transit: 12 },
  luxury: { walk: 1.0, transit: 6 },
};

/** Walking Fatigue model: once a day's cumulative walked distance reaches
 *  this, the walk ceiling collapses so further legs prefer transit even when
 *  individually short — a real traveller doesn't keep walking 1.5km legs
 *  back-to-back all day. */
const FATIGUE_THRESHOLD_KM = 3;
const FATIGUED_WALK_CEILING_KM = 0.3;

/**
 * Choose a realistic travel mode for a leg, tiered by budget (luxury
 * travellers default to taxis sooner; economy travellers walk and transit
 * further) and aware of how much the traveller has already walked today
 * (`walkedSoFarKm`) so a day doesn't silently demand 5+ walking legs back to
 * back. This is the single source of truth for mode decisions — previously
 * `routing.ts` and two independent inline copies in `engine.ts` each
 * reimplemented this with silently drifting thresholds.
 */
export function decideTravelMode(
  distanceKm: number,
  budget: Budget = "medium",
  walkedSoFarKm = 0
): TravelMode {
  const ceilings = MODE_CEILINGS_KM[budget] ?? MODE_CEILINGS_KM.medium;
  const walkCeiling =
    walkedSoFarKm >= FATIGUE_THRESHOLD_KM ? FATIGUED_WALK_CEILING_KM : ceilings.walk;
  if (distanceKm <= walkCeiling) return "walk";
  if (distanceKm <= ceilings.transit) return "transit";
  return "taxi";
}

/** Minutes for a leg of `distanceKm` at the given mode; `walkSec` (from a real
 *  routing engine) is preferred over the haversine walking-speed estimate. */
export function legDurationMin(distanceKm: number, mode: TravelMode, walkSec?: number): number {
  if (mode === "walk") return walkSec ? Math.round(walkSec / 60) : walkingMinutes(distanceKm);
  const speed = mode === "transit" ? 20 : 35; // km/h
  return Math.max(6, Math.round((distanceKm / speed) * 60));
}
