import type { GeoPoint, ItineraryDay, Place, PlaceCategory, QualityLabel } from "../types";
import type { ConfidenceBand } from "../types";
import { haversineKm } from "../utils";
import { parseHM, pathDistance } from "./dayflow";

export type { ConfidenceBand, QualityLabel };

/**
 * Candidate Validation: every place collected from a real data source must
 * clear these checks before it can ever be scored, tiered or scheduled. A
 * rejected candidate carries a reason (no silent filtering) and is simply
 * excluded — never displayed, never "fixed" by guessing.
 */
export type RejectionReason =
  | "missing_coordinates"
  | "unknown_category"
  | "low_confidence"
  | "outside_destination"
  | "duplicate"
  | "closed_permanently"
  | "unknown_location";

const VALID_CATEGORIES = new Set<PlaceCategory>([
  "attraction", "monument", "museum", "restaurant", "cafe",
  "beach", "park", "viewpoint", "landmark", "nightlife", "shopping",
]);

export function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Validate one candidate. `seenNames` must already hold `normName`-normalized
 * names of places already accepted into the trip (for duplicate detection).
 * `center`/`maxRadiusKm` bound how far from the destination a real place may
 * sit — generous by default so legitimate day-trip sights (Pompeii, Phi Phi,
 * Volubilis) aren't rejected for being genuinely far from the city center.
 *
 * Note on "Confidence extremely low" (also a reject condition in the spec):
 * that's deliberately NOT checked here. At this stage tier/photo data hasn't
 * been resolved yet, so the weighted confidence model would unfairly punish
 * legitimate curated places (e.g. hand-authored seed landmarks) that simply
 * haven't been scored yet. The real, weighted confidence reject — the 50%
 * band via `confidenceBand` — runs later, once a place is an actual stop.
 */
export function validateCandidate(
  p: Place,
  center?: GeoPoint,
  seenNames?: Set<string>,
  maxRadiusKm = 60
): RejectionReason | null {
  if (!p.name || !p.name.trim()) return "unknown_location";
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return "missing_coordinates";
  if (!p.category || !VALID_CATEGORIES.has(p.category)) return "unknown_category";
  if (/^(closed|off)$/i.test(p.openingHours?.trim() ?? "")) return "closed_permanently";
  if (center && haversineKm(p, center) > maxRadiusKm) return "outside_destination";
  if (seenNames?.has(normName(p.name))) return "duplicate";
  return null;
}

/**
 * The Verified badge must never depend on coordinates alone. A place is
 * Verified only when it's a real, mapped OSM object with a real name and
 * category, and — when the destination center is known — actually located
 * inside that destination.
 */
export function isVerified(p: Place, center?: GeoPoint, maxRadiusKm = 60): boolean {
  if (p.source !== "overpass") return false;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  if (!p.category || !VALID_CATEGORIES.has(p.category)) return false;
  if (!p.name || !p.name.trim()) return false;
  if (center && haversineKm(p, center) > maxRadiusKm) return false;
  return true;
}

/**
 * Confidence rules: 90-100 Excellent, 70-89 Trusted, 50-69 Fallback (kept,
 * but clearly labeled as such), below 50 Reject (never displayed).
 */
export function confidenceBand(score0to1: number): ConfidenceBand {
  const pct = score0to1 * 100;
  if (pct >= 90) return "excellent";
  if (pct >= 70) return "trusted";
  if (pct >= 50) return "fallback";
  return "reject";
}

// ── Itinerary Quality Score — replaces the flat confidence average ─────────

export interface QualityScoreInputs {
  /** 0..1 fraction of selected interests represented (Interest Coverage Score). */
  interestCoverage: number;
  /** 0..1 fraction of the destination's must-see landmarks included. */
  landmarkCoverage: number;
  /** 0..1 how close the actual route is to the direct-line lower bound. */
  routeEfficiency: number;
  /** 0..1 whether each day's schedule is strictly increasing in clock time. */
  timeLogic: number;
  /** 0..1 fraction of stops with a real, resolved photo. */
  photoQuality: number;
  /** 0..1 how well adverse-weather days were adapted. */
  weatherAdaptation: number;
  /** 0..1 fraction of stops carrying the Verified badge. */
  verificationQuality: number;
}

const QUALITY_WEIGHTS: Record<keyof QualityScoreInputs, number> = {
  interestCoverage: 0.2,
  landmarkCoverage: 0.2,
  routeEfficiency: 0.15,
  timeLogic: 0.15,
  photoQuality: 0.1,
  weatherAdaptation: 0.1,
  verificationQuality: 0.1,
};

/** 0..100 weighted Itinerary Quality Score (the spec's 7-factor formula). */
export function qualityScore(inputs: QualityScoreInputs): number {
  let total = 0;
  for (const key of Object.keys(QUALITY_WEIGHTS) as (keyof QualityScoreInputs)[]) {
    total += Math.max(0, Math.min(1, inputs[key])) * QUALITY_WEIGHTS[key];
  }
  return Math.round(total * 100);
}

/** Honest display label — never present a low-quality plan as high quality. */
export function qualityLabel(score0to100: number): QualityLabel {
  if (score0to100 >= 90) return "Premium Plan";
  if (score0to100 >= 70) return "Very Good";
  if (score0to100 >= 50) return "Good";
  return "Limited Verified Data";
}

// ── Sub-score measurements (each 0..1), fed into qualityScore ──────────────

/** Fraction of the pack's must-see landmarks actually present in the trip. */
export function landmarkCoverageScore(
  presentNames: string[],
  mustSee: string[],
  matches: (curated: string, candidate: string) => boolean
): number {
  if (!mustSee.length) return 1;
  const covered = mustSee.filter((m) => presentNames.some((p) => matches(m, p)));
  return covered.length / mustSee.length;
}

/** How close each day's actual travel distance is to its straight-line lower bound. */
export function routeEfficiencyScore(days: ItineraryDay[]): number {
  const scored = days.filter((d) => d.stops.length > 1);
  if (!scored.length) return 1;
  const perDay = scored.map((d) => {
    const lowerBound = pathDistance(d.stops);
    const actual = d.stops.reduce((s, st, i) => (i === 0 ? 0 : s + (st.travelDistanceKm ?? 0)), 0);
    if (lowerBound <= 0 || actual <= 0) return 1; // no real routing data yet — don't penalize
    return Math.max(0, Math.min(1, lowerBound / actual));
  });
  return perDay.reduce((s, v) => s + v, 0) / perDay.length;
}

/** 1 when every day's clock times are strictly increasing. */
export function timeLogicScore(days: ItineraryDay[]): number {
  const scored = days.filter((d) => d.stops.length > 1);
  if (!scored.length) return 1;
  let ok = 0;
  for (const d of scored) {
    let monotonic = true;
    for (let i = 1; i < d.stops.length; i++) {
      const prev = parseHM(d.stops[i - 1].startTime);
      const cur = parseHM(d.stops[i].startTime);
      if (prev == null || cur == null || cur <= prev) {
        monotonic = false;
        break;
      }
    }
    if (monotonic) ok++;
  }
  return ok / scored.length;
}

/** Fraction of stops carrying a real, resolved photo (not a category fallback). */
export function photoQualityScore(stops: { place: Place }[]): number {
  if (!stops.length) return 1;
  return stops.filter((s) => s.place.photoResolved).length / stops.length;
}

/** Fraction of adverse-weather days where no flexible outdoor stop was left exposed. */
export function weatherAdaptationScore(
  days: ItineraryDay[],
  isOutdoor: (c: PlaceCategory) => boolean
): number {
  const adverse = days.filter((d) => {
    const w = d.weather;
    if (!w) return false;
    return w.rainRisk || w.tempMaxC >= 32 || w.tempMaxC <= 8 || (w.windKmh ?? 0) >= 40;
  });
  if (!adverse.length) return 1;
  let ok = 0;
  for (const d of adverse) {
    const stuck = d.stops.some(
      (s) =>
        (s.slot === "morning_activity" || s.slot === "afternoon_activity") &&
        isOutdoor(s.place.category) &&
        s.place.tier !== 1
    );
    if (!stuck) ok++;
  }
  return ok / adverse.length;
}

/** Fraction of stops carrying the (tightened) Verified badge. */
export function verificationQualityScore(stops: { place: Place }[]): number {
  if (!stops.length) return 1;
  return stops.filter((s) => s.place.verified).length / stops.length;
}

// ── Food limits & experience dominance (V3) ────────────────────────────────

/** Categories that count as food/drink for the domination guard. Nightlife is
 *  a night *experience*, not a meal, so it is deliberately excluded. */
const FOOD_DRINK: PlaceCategory[] = ["restaurant", "cafe"];

/** A normal trip's experiences (attractions, culture, nature, nightlife…) must
 *  be at least this share of the day — food/drink may never dominate. */
export const EXPERIENCE_MIN_SHARE = 0.7;

/** Hard cap on food/drink stops in a normal day: 1 breakfast/coffee + 1 lunch
 *  + 1 dinner + 1 optional extra drink. Food-focused trips are exempt. */
export const NORMAL_FOOD_CAP = 4;

export function isFoodDrink(category: PlaceCategory): boolean {
  return FOOD_DRINK.includes(category);
}

/** 0..1 share of a day's stops that are real experiences (not food/drink). */
export function experienceShare(stops: { place: Place }[]): number {
  if (!stops.length) return 1;
  const food = stops.filter((s) => isFoodDrink(s.place.category)).length;
  return (stops.length - food) / stops.length;
}

/**
 * Does a day respect the V3 food rules? A food-focused trip (the traveller
 * explicitly asked for food, or it's a food-lover profile) is allowed to break
 * them; every other trip must keep food/drink at or under `NORMAL_FOOD_CAP`
 * AND experiences at or above `EXPERIENCE_MIN_SHARE`.
 */
export function withinFoodLimits(
  stops: { place: Place }[],
  foodFocused = false
): boolean {
  if (foodFocused) return true;
  const food = stops.filter((s) => isFoodDrink(s.place.category)).length;
  return food <= NORMAL_FOOD_CAP && experienceShare(stops) >= EXPERIENCE_MIN_SHARE;
}

/**
 * Enforce the V3 food *count* allowance on a built day: at most one breakfast,
 * one lunch, one dinner and one optional drink (coffee break). Any extra
 * food/drink stop — a second café, an afternoon snack, a non-slotted extra
 * restaurant — is dropped so food/drink can never pile up into the
 * "Restaurant → Café → Restaurant → Café" pattern the V3 directive calls out.
 * Meal anchors (lunch/dinner) and every real experience are never removed, and
 * the original order of kept stops is preserved. Food-focused trips are exempt.
 *
 * Note: this enforces the *count* allowance, which is always achievable. The
 * stricter ≥70%-experience *share* (`withinFoodLimits`) is a measurement for
 * the audit — on a city with thin attraction data it can't be reached by
 * deleting meals, and we never strip a traveller's lunch to chase a ratio.
 */
export function capFoodStops<T extends { place: Place; slot?: string }>(
  stops: T[],
  foodFocused = false
): T[] {
  if (foodFocused) return stops;
  let breakfastKept = false;
  let drinkKept = false;
  const result: T[] = [];
  for (const s of stops) {
    if (!isFoodDrink(s.place.category)) {
      result.push(s); // every real experience is always kept
      continue;
    }
    if (s.slot === "lunch" || s.slot === "dinner") {
      result.push(s); // meal anchors are never dropped
      continue;
    }
    if (s.slot === "breakfast" && !breakfastKept) {
      breakfastKept = true;
      result.push(s);
      continue;
    }
    if (s.slot === "coffee_break" && !drinkKept) {
      drinkKept = true;
      result.push(s);
      continue;
    }
    // anything else is excess food/drink beyond the allowance — drop it.
  }
  return result;
}

// ── Duplication & diversity (V3) ───────────────────────────────────────────

/**
 * Names of places that appear more than once across the whole trip (by id when
 * present, else normalized name). The V3 "repeated places" guard: the engine
 * partitions sights per day and shares the used-food/used-extra sets across
 * days, so a clean plan returns []. Anything here is a real duplication bug.
 */
export function duplicatePlaceNames(stops: { place: Place }[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const s of stops) {
    const key = s.place.id || normName(s.place.name);
    if (seen.has(key)) dupes.add(s.place.name);
    else seen.add(key);
  }
  return [...dupes];
}

/**
 * 0..1 category diversity of a day's *experiences* (food/drink excluded):
 * distinct experience categories ÷ experience stops. 1 = every experience is a
 * different kind; low = a monotonous "museum, museum, museum" day. A day with
 * one or zero experiences is trivially 1.
 */
export function experienceDiversity(stops: { place: Place }[]): number {
  const exp = stops.filter((s) => !isFoodDrink(s.place.category));
  if (exp.length <= 1) return 1;
  const distinct = new Set(exp.map((s) => s.place.category)).size;
  return distinct / exp.length;
}

// ── Photo source priority & placeholder policy (V3) ────────────────────────

/** V3 photo priority, best first. We never AI-generate and never use a generic
 *  city photo; a place-specific Commons/official image wins, with stock photo
 *  services as staged last resorts before a category placeholder. */
export type PhotoSource =
  | "wikimedia_commons"
  | "official_website"
  | "unsplash"
  | "pexels";

export const PHOTO_SOURCE_PRIORITY: readonly PhotoSource[] = [
  "wikimedia_commons",
  "official_website",
  "unsplash",
  "pexels",
];

/**
 * Pick the highest-priority photo source actually available for a place.
 * Returns null when none is — the caller must then show a category PLACEHOLDER,
 * never a generic city photo or an unrelated image (the V3 "never show
 * incorrect images" rule).
 */
export function bestPhotoSource(
  available: Partial<Record<PhotoSource, boolean>>
): PhotoSource | null {
  for (const src of PHOTO_SOURCE_PRIORITY) {
    if (available[src]) return src;
  }
  return null;
}

/**
 * Is this stop showing a real, place-specific photo (vs a category
 * placeholder)? A place-specific photo requires `photoResolved` — set only
 * after a real source (Commons/official/Foursquare) returned an image that
 * passed the subject-match gate. Used to badge "exact photo" vs "placeholder".
 */
export function hasExactPhoto(p: Place): boolean {
  return Boolean(p.photoResolved && p.imageUrl);
}

// ── Display confidence gate (V3 §15) ───────────────────────────────────────

/** V3 §15: an attraction shown to the traveller must clear 70% confidence —
 *  below that it is not displayed (vs the looser <50% reject band). */
export const DISPLAY_CONFIDENCE_FLOOR = 0.7;

/**
 * Should this stop be displayed under the V3 70% rule? Attractions/sights must
 * reach `DISPLAY_CONFIDENCE_FLOOR`; structural functional stops (meals, coffee,
 * sunset, nightlife) are exempt — they have no ratings source and exist to make
 * the day complete, so they're kept and honestly labeled, never hidden.
 */
export function passesDisplayConfidence(isAttraction: boolean, confidence: number): boolean {
  return !isAttraction || confidence >= DISPLAY_CONFIDENCE_FLOOR;
}

/** Build a single display address from OSM addr:* parts; undefined if empty so
 *  the UI shows nothing rather than stray commas. */
export function formatAddress(parts: {
  housenumber?: string;
  street?: string;
  city?: string;
}): string | undefined {
  const line1 = [parts.housenumber, parts.street].filter(Boolean).join(" ").trim();
  const out = [line1, parts.city?.trim()].filter((s) => s && s.length).join(", ");
  return out.length ? out : undefined;
}
