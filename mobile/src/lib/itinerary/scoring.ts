import type { Interest, Place, PlaceCategory } from "../types";

/**
 * Attraction scoring engine.
 *
 * Free OSM/Wikipedia data has no star ratings or review counts, so — per the
 * "never invent data" rule — we DO NOT fabricate them. Instead we score using
 * signals we can actually trust:
 *   - notability  (a linked Wikipedia/Wikidata entry ⇒ a real, significant site)
 *   - tourist value of the category (a monument outranks a generic mall)
 *   - interest match (does it fit what the traveller asked for?)
 *   - verification (grounded to a real OSM POI)
 * The result is a 0..1 score used to rank candidates for selection/backfill.
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

/** True when a place is a well-documented, notable site (Wikipedia/Wikidata). */
function isNotable(p: Place): boolean {
  return Boolean(p.wikipediaUrl) || (p.score ?? 0) >= 0.85;
}

/** 0..1 desirability score for a place given the traveller's interests. */
export function attractionScore(p: Place, interests: Interest[] = []): number {
  const wanted = new Set<PlaceCategory>();
  interests.forEach((i) => INTEREST_CATEGORIES[i]?.forEach((c) => wanted.add(c)));

  let score = CATEGORY_VALUE[p.category] ?? 0.5;
  if (isNotable(p)) score += 0.18;
  if (p.verified) score += 0.08;
  if (wanted.has(p.category)) score += 0.22;
  // gentle nudge toward authentic spots when they're a confident gem
  if (p.hiddenGem) score += 0.05;
  return Math.min(1, score);
}

/**
 * Confidence (0..1) that a place is a genuine HIDDEN GEM: authentic and
 * lower-traffic, not a headline tourist site. We only label something a gem
 * above a threshold so the badge stays meaningful.
 */
export function gemConfidence(p: Place): number {
  // Major, heavily-documented sites are by definition not hidden.
  if (isNotable(p)) return 0;
  // Real, mapped places in "local-feel" categories are the best candidates.
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
