import type { Interest, PlaceCategory } from "../types";

/**
 * Single source of truth for which place categories satisfy a traveller
 * interest. Used by scoring (rank candidates that match), selection
 * (guarantee every interest is actually represented, not just nudged) and
 * the Interest Coverage Score (measure the result). Previously this mapping
 * was duplicated independently in `scoring.ts` and `engine.ts`, with the
 * lists silently drifting apart.
 */
export const INTEREST_CATEGORIES: Record<Interest, PlaceCategory[]> = {
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

/** The set of place categories that satisfy any of the given interests. */
export function categoriesForInterests(interests: Interest[]): Set<PlaceCategory> {
  const set = new Set<PlaceCategory>();
  interests.forEach((i) => INTEREST_CATEGORIES[i]?.forEach((c) => set.add(c)));
  return set;
}

/**
 * 0..1 fraction of the traveller's selected interests that are actually
 * represented by at least one real stop in the trip. This is a measurement
 * of the finished itinerary, not a scoring nudge — it answers "did we
 * actually deliver what they asked for?" and is honest when we couldn't
 * (e.g. a city's real OSM data has no beaches even though the traveller
 * picked "beaches"). A trip with no interests selected trivially scores 1.
 */
export function interestCoverageScore(
  stops: { category: PlaceCategory }[],
  interests: Interest[]
): number {
  if (!interests.length) return 1;
  const present = new Set(stops.map((s) => s.category));
  const covered = interests.filter((i) =>
    (INTEREST_CATEGORIES[i] ?? []).some((c) => present.has(c))
  );
  return covered.length / interests.length;
}
