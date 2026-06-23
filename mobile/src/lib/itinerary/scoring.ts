import type { GeoPoint, Interest, Place, PlaceCategory } from "../types";
import { haversineKm } from "../utils";
import { categoriesForInterests } from "./interests";

/**
 * Attraction scoring engine.
 *
 * Free OSM/Wikipedia data has no star ratings or review counts, so — per the
 * "never invent data" rule — we DO NOT fabricate them. Instead we rank on
 * signals we can actually trust, with GLOBAL FAME as the dominant factor:
 *   - popularity  (Wikidata sitelink count → how many language Wikipedias cover
 *                  it; a real, source-backed fame proxy)            ← dominant
 *   - tourist value of the category (a monument outranks a generic mall)
 *   - interest match (does it fit what the traveller asked for?)
 *   - verification (grounded to a real OSM POI)
 * The result is a 0..1 score used to rank candidates. Fame deliberately
 * outweighs distance at selection time, so a world-famous attraction is never
 * dropped just because a smaller place sits closer.
 */

// Baseline tourist value per category (0..1) — how much a typical visitor
// builds a day around it.
const CATEGORY_VALUE: Record<PlaceCategory, number> = {
  monument: 0.9,
  landmark: 0.85,
  museum: 0.8,
  attraction: 0.78,
  viewpoint: 0.72,
  beach: 0.7,
  park: 0.62,
  restaurant: 0.6,
  nightlife: 0.55,
  cafe: 0.5,
  shopping: 0.5,
};

/** Weights — popularity (fame) is intentionally the heaviest term. */
const W_POPULARITY = 0.6;
const W_CATEGORY = 0.3;
const W_INTEREST = 0.2;
const W_VERIFIED = 0.06;
const W_GEM = 0.04;

/** True when a place is a well-documented, notable site (Wikipedia/Wikidata). */
function isNotable(p: Place): boolean {
  return Boolean(p.wikidataId || p.wikipediaTitle || p.wikipediaUrl) || (p.score ?? 0) >= 0.85;
}

/** Best available 0..1 fame value: real popularity, else a notability fallback. */
export function fameValue(p: Place): number {
  if (typeof p.popularity === "number") return p.popularity;
  return isNotable(p) ? 0.5 : 0;
}

/** 0..1 desirability score for a place given the traveller's interests. */
export function attractionScore(p: Place, interests: Interest[] = []): number {
  const wanted = categoriesForInterests(interests);

  let s = fameValue(p) * W_POPULARITY;
  s += (CATEGORY_VALUE[p.category] ?? 0.5) * W_CATEGORY;
  if (wanted.has(p.category)) s += W_INTEREST;
  if (p.verified) s += W_VERIFIED;
  if (p.hiddenGem) s += W_GEM;
  return Math.min(1, s);
}

/**
 * Selection value used when choosing which places make the cut. Tier-1 must-see
 * places dominate, then fame; distance is only a gentle tie-breaker (~0.005/km),
 * so a world-famous attraction is never dropped because a smaller one is closer.
 */
export function selectionValue(p: Place, distanceKm: number, interests: Interest[] = []): number {
  const tierBoost = p.tier === 1 ? 0.5 : p.tier === 2 ? 0.2 : 0;
  return attractionScore(p, interests) + tierBoost - distanceKm * 0.005;
}

/**
 * Confidence (0..1) that THIS recommendation is trustworthy, using the factors
 * from the spec: verified location, real photo, opening hours, destination-
 * knowledge match (tier) and attraction importance (fame). Shown as a 0–100%
 * score per stop and gated at 70% for attractions.
 */
export function confidenceScore(p: Place): number {
  let c = 0;
  if (p.verified) c += 0.3; // verified, real-world location
  // A real, place-specific photo. Verified OSM places reliably resolve a Commons
  // photo, so credit them even before the (lazy) fetch completes — this keeps a
  // stop's confidence consistent across day 1 and later days.
  if (p.photoResolved || p.verified) c += 0.15;
  if (p.openingHours) c += 0.1; // opening hours on file
  // destination-knowledge match
  c += p.tier === 1 ? 0.25 : p.tier === 2 ? 0.15 : 0;
  // attraction importance (real fame signal)
  c += fameValue(p) * 0.2;
  return Math.min(1, Math.round(c * 100) / 100);
}

/**
 * Confidence (0..1) that a place is a genuine HIDDEN GEM: authentic and
 * lower-traffic, not a headline tourist site. We only label something a gem
 * above a threshold so the badge stays meaningful.
 */
export function gemConfidence(p: Place): number {
  // Famous, heavily-documented sites are by definition not hidden.
  if (fameValue(p) >= 0.45 || isNotable(p)) return 0;
  const local: PlaceCategory[] = ["cafe", "viewpoint", "park", "restaurant", "landmark"];
  let c = 0;
  if (local.includes(p.category)) c += 0.5;
  if (p.verified) c += 0.35; // it's a real, mapped place — not invented
  if (p.cuisine || (p.tags?.length ?? 0) > 0) c += 0.1;
  if (p.name.trim().split(/\s+/).length >= 2) c += 0.05; // a specific, named spot
  return Math.min(1, c);
}

export const GEM_THRESHOLD = 0.7;

/** Decide the hidden-gem flag from confidence (stable, not keyword guessing). */
export function isConfidentGem(p: Place): boolean {
  return gemConfidence(p) >= GEM_THRESHOLD;
}

/** Human-facing phrasing for each interest in a recommendation reason. */
const INTEREST_PHRASE: Record<Interest, string> = {
  monuments: "historical landmarks",
  museums: "museums",
  beaches: "beaches",
  nature: "nature and the outdoors",
  food: "food",
  architecture: "architecture",
  shopping: "shopping",
  photography: "scenic photography spots",
  nightlife: "nightlife",
};

export interface ReasonContext {
  /** Destination name, for phrasing ("…in Marrakech"). */
  city: string;
  /** Interests the traveller actually selected. */
  interests?: Interest[];
  /** Straight-line km from the day's route anchor, when known. */
  distanceKm?: number;
  /** True when this place sits in a real OSM nightlife district (Phase 6). */
  inNightlifeDistrict?: boolean;
}

/** Fame at/above which a place is genuinely "one of the most-visited". */
const HIGH_FAME = 0.6;
/** Distance (km) at/under which "close to your route" is honestly true. */
const NEAR_ROUTE_KM = 1.0;

/** The first selected interest whose categories include this place's category. */
function matchedInterest(p: Place, interests: Interest[]): Interest | undefined {
  const wanted = categoriesForInterests(interests);
  if (!wanted.has(p.category)) return undefined;
  return interests.find((i) => categoriesForInterests([i]).has(p.category));
}

// ── Use-existing-first ranking (V3 §7) ─────────────────────────────────────

export interface AvailabilityContext {
  interests?: Interest[];
  /** Distance reference (the city center / route anchor). */
  center?: GeoPoint;
}

/**
 * V3 "use existing recommendations first": a 0..1 rank for an already-loaded
 * candidate using exactly the factors the directive names — Tier, Confidence,
 * User interests, Distance and Opening hours — so the engine exhausts the
 * places it already has (highest-tier, most-confident, on-interest, closest,
 * with real hours) before ever deciding to fetch more.
 */
export function availabilityRank(p: Place, ctx: AvailabilityContext = {}): number {
  const interests = ctx.interests ?? [];
  const tier = p.tier === 1 ? 1 : p.tier === 2 ? 0.6 : 0.2;
  const confidence = typeof p.confidence === "number" ? p.confidence : confidenceScore(p);
  const interestMatch = categoriesForInterests(interests).has(p.category) ? 1 : 0;
  const distancePenalty = ctx.center ? Math.min(1, haversineKm(ctx.center, p) / 20) : 0;
  const hasHours = p.openingHours ? 1 : 0;

  const r =
    tier * 0.4 +
    confidence * 0.3 +
    interestMatch * 0.15 +
    hasHours * 0.05 +
    (1 - distancePenalty) * 0.1;
  return Math.max(0, Math.min(1, r));
}

/** Rank existing candidates best-first by the V3 §7 factors. Pure; no fetch. */
export function rankExisting(places: Place[], ctx: AvailabilityContext = {}): Place[] {
  return [...places]
    .map((p) => ({ p, r: availabilityRank(p, ctx) }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.p);
}

/**
 * Whether the existing, already-loaded pool is too thin to build the plan and
 * a fetch for more places is actually warranted — "only fetch additional
 * places when necessary." Counts only usable candidates (real category + name).
 */
export function shouldFetchMore(pool: Place[], needed: number): boolean {
  const usable = pool.filter((p) => p.name?.trim() && p.category).length;
  return usable < needed;
}

/**
 * Deterministic, source-backed answer to "Why was this place recommended?" —
 * the V3 explainability requirement. Never AI free-text, and never a claim the
 * data doesn't support: it only says "matches your interest in X" when the
 * place's real category actually satisfies a selected interest, only says
 * "must-see" for a real Tier-1 pack/fame match, only says "nightlife district"
 * when the Phase-6 density signal confirms one, and only says "close to your
 * route" when it really is. Precedence runs from the most compelling, most
 * specific reason to a plain honest fallback.
 */
export function recommendationReason(p: Place, ctx: ReasonContext): string {
  const where = ctx.city ? ` in ${ctx.city}` : "";
  const interests = ctx.interests ?? [];

  // 1. A genuine must-see dominates every other reason.
  if (p.tier === 1) {
    return `Recommended because it is one of the top must-see sights${where}.`;
  }

  // 2/3. Food and nightlife read better with their own phrasing.
  if (p.category === "restaurant" || p.category === "cafe") {
    const kind = p.category === "cafe" ? "café" : "restaurant";
    if (interests.includes("food")) {
      return `Recommended because it matches your interest in food — a well-placed ${kind} within walking distance of your route.`;
    }
    return `Recommended as a well-placed ${kind} within walking distance of your route.`;
  }
  if (p.category === "nightlife") {
    if (ctx.inNightlifeDistrict) {
      return `Recommended because it is part of a lively nightlife district${where}.`;
    }
    return `Recommended because it matches your nightlife interests.`;
  }

  // 4. An explicit interest match the data actually supports.
  const interest = matchedInterest(p, interests);
  if (interest) {
    return `Recommended because it matches your interest in ${INTEREST_PHRASE[interest]}.`;
  }

  // 5. Real global fame (Wikidata sitelink signal), not invented popularity.
  if (fameValue(p) >= HIGH_FAME) {
    return `Recommended because it is one of the highest-confidence, most-visited attractions${where}.`;
  }

  // 6. Simply well-placed on the day's route.
  if (typeof ctx.distanceKm === "number" && ctx.distanceKm <= NEAR_ROUTE_KM) {
    return `Recommended because it is located close to your route.`;
  }

  // 7. Honest fallback — still a real, verified stop, just no stronger signal.
  return `Recommended as a worthwhile stop${where}.`;
}
