import type { Interest, Place, PlaceCategory } from "../types";

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

const INTEREST_CATEGORIES: Record<Interest, PlaceCategory[]> = {
  monuments: ["monument", "landmark"],
  museums: ["museum"],
  beaches: ["beach"],
  nature: ["park", "viewpoint", "beach"],
  food: ["restaurant", "cafe"],
  architecture: ["landmark", "monument", "attraction"],
  shopping: ["shopping"],
  photography: ["viewpoint", "landmark", "monument"],
  nightlife: ["nightlife"],
};

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
  const wanted = new Set<PlaceCategory>();
  interests.forEach((i) => INTEREST_CATEGORIES[i]?.forEach((c) => wanted.add(c)));

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
  if (p.photoResolved) c += 0.15; // a real, place-specific photo resolved
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
