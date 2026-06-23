import type { GeoPoint, Place } from "../types";
import { overpassPlaces } from "./overpass";
import { foursquareSearch } from "./foursquare";
import { getSeedPlaces } from "./seedPlaces";
import { findSeedCity } from "./seed";
import { withCache } from "../cache";

/**
 * Discovery engine: gather POIs for a destination from free sources, IN
 * PARALLEL. Foursquare is the primary source for venue types (restaurants,
 * cafés, bars/nightlife, shopping); OpenStreetMap + curated seeds supply
 * monuments/museums/parks/landmarks. Everything is merged and de-duplicated by
 * name; results cached for offline use. Foursquare degrades to nothing when no
 * key / out of credits, so OSM still carries the plan.
 */
export async function discoverPlaces(
  query: string,
  center: GeoPoint
): Promise<Place[]> {
  const seedKey = normalizeKey(query);
  const seeds = seedKey ? getSeedPlaces(seedKey) : [];

  const cacheKey = `places:${center.lat.toFixed(3)},${center.lng.toFixed(3)}`;
  const osmPromise = withCache<Place[]>(
    cacheKey,
    1000 * 60 * 60 * 24 * 7, // 7 days
    () => overpassPlaces(center),
    (v) => v.length === 0
  ).catch(() => [] as Place[]);

  // Foursquare venue candidates (primary for food/nightlife/shopping), fetched
  // concurrently. Each returns [] when Foursquare is unavailable.
  const [live, fsqRest, fsqCafe, fsqBar, fsqShop] = await Promise.all([
    osmPromise,
    foursquareSearch("restaurant", center),
    foursquareSearch("cafe", center),
    foursquareSearch("nightlife", center),
    foursquareSearch("shopping", center),
  ]);

  // Foursquare first so its richer venue records (photo/address/hours/website)
  // win the dedupe over a thinner OSM record of the same place.
  const merged = mergeByName([...fsqRest, ...fsqCafe, ...fsqBar, ...fsqShop, ...seeds, ...live]);
  if (merged.length > 0) return merged;

  // Last resort: seed only.
  return seeds;
}

function normalizeKey(query: string): string | null {
  const seed = findSeedCity(query);
  if (!seed) return null;
  return seed.name.toLowerCase();
}

function mergeByName(places: Place[]): Place[] {
  const map = new Map<string, Place>();
  for (const p of places) {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = map.get(key);
    // Prefer curated seed entries (they carry better coords/labels) but keep
    // live enrichment fields when seed is missing them.
    if (!existing) {
      map.set(key, p);
    } else if (existing.source === "mock" && p.source === "overpass") {
      existing.wikipediaUrl = existing.wikipediaUrl || p.wikipediaUrl;
    }
  }
  return Array.from(map.values());
}
