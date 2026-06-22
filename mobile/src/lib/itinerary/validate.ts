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
  if (/^closed$/i.test(p.openingHours?.trim() ?? "")) return "closed_permanently";
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
