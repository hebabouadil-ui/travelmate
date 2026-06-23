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

/**
 * V3 category separation: the user-facing browse buckets. Unlike
 * `INTEREST_CATEGORIES` (which intentionally overlaps — architecture and
 * photography both draw on monuments — for *scoring*), these buckets are a
 * strict PARTITION of every `PlaceCategory`: each real category belongs to
 * exactly one browse group, so a category filter never shows the same place
 * under two buckets and never silently hides a category under "All" only.
 */
export type BrowseCategory =
  | "food"
  | "nightlife"
  | "history"
  | "museums"
  | "nature"
  | "shopping"
  | "culture";

export const BROWSE_GROUPS: Record<BrowseCategory, PlaceCategory[]> = {
  food: ["restaurant", "cafe"],
  nightlife: ["nightlife"],
  history: ["monument", "landmark"],
  museums: ["museum"],
  nature: ["park", "beach", "viewpoint"],
  shopping: ["shopping"],
  culture: ["attraction"],
};

/** The browse group a real place category belongs to (exactly one). */
export function browseGroupFor(category: PlaceCategory): BrowseCategory {
  for (const group of Object.keys(BROWSE_GROUPS) as BrowseCategory[]) {
    if (BROWSE_GROUPS[group].includes(category)) return group;
  }
  return "culture"; // every category is mapped; this satisfies the type only
}

/** True when a place category belongs to the given browse group. */
export function inBrowseGroup(category: PlaceCategory, group: BrowseCategory): boolean {
  return BROWSE_GROUPS[group].includes(category);
}

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

/** Categories that don't define a sightseeing theme (food/nightlife are their
 *  own slots, not what a day is "about"). */
const NON_THEME_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe", "nightlife"];

/** Day Theme taxonomy: a fixed, closed set of labels, each backed by real
 *  category membership — unlike a free-text AI-generated title, a day can
 *  never be labeled with a theme its actual stops don't support. */
const DAY_THEMES: { theme: string; categories: PlaceCategory[] }[] = [
  { theme: "Historic & Monuments", categories: ["monument", "landmark"] },
  { theme: "Art & Museums", categories: ["museum"] },
  { theme: "Nature & Outdoors", categories: ["park", "beach", "viewpoint"] },
  { theme: "Markets & Shopping", categories: ["shopping"] },
];

/** Minimum share of a day's sightseeing stops a single theme bucket must hold
 *  before the day is labeled with it; below this it's an honest "Mixed
 *  Highlights" rather than an overreaching label. */
const DAY_THEME_DOMINANCE = 0.4;

/**
 * Derive a day's theme deterministically from its actual stop categories
 * (excluding meals/nightlife, which aren't what the day is "about"). Falls
 * back to "Mixed Highlights" when no single bucket dominates — so the label
 * always matches the real content instead of an AI free-text title with no
 * such guarantee.
 */
export function dayTheme(stops: { category: PlaceCategory }[]): string {
  const themed = stops.filter((s) => !NON_THEME_CATEGORIES.includes(s.category));
  if (!themed.length) return "Mixed Highlights";

  let best = { theme: "Mixed Highlights", count: 0 };
  for (const bucket of DAY_THEMES) {
    const count = themed.filter((s) => bucket.categories.includes(s.category)).length;
    if (count > best.count) best = { theme: bucket.theme, count };
  }
  return best.count / themed.length >= DAY_THEME_DOMINANCE ? best.theme : "Mixed Highlights";
}
