import type { GeoPoint, Place } from "../types";
import { overpassPlaces } from "./overpass";
import { foursquareSearch } from "./foursquare";
import { getSeedPlaces } from "./seedPlaces";
import { findSeedCity } from "./seed";
import { withCache } from "../cache";
import { wikidataPlaces } from "./wikidata";
import { resolveRegion } from "./region";
import type { RegionAnchor } from "./region";
import { haversineKm } from "../utils";

/**
 * Discovery engine: gather POIs for a destination from free sources, IN
 * PARALLEL, in candidate-source priority order — Destination Knowledge Pack
 * (curated seeds) > Wikidata (UNESCO sites/national monuments/museums/
 * castles/palaces/beaches) > OpenStreetMap (geometry + venues, never treated
 * as a popularity signal) — with Foursquare enriching venue-type places
 * (restaurants/cafés/bars/shopping) with the address/hours/website/photo
 * fields OSM frequently lacks.
 *
 * Metro Area Support: when the destination's own radius comes back thin
 * even after Overpass's internal 8km->40km Dynamic Radius Expansion, this
 * fans out to the nearest districts/satellite municipalities the generic
 * Destination Region Resolver found (e.g. Dieppe/Riverview for Moncton)
 * instead of ever stopping at a municipal boundary.
 *
 * Everything is merged and de-duplicated by name; results cached for
 * offline use. Foursquare/Wikidata/Region degrade to nothing when
 * unavailable, so OSM still carries the plan.
 */

const THIN_POOL_THRESHOLD = 25;
const REGION_ANCHOR_RADIUS_M = 5000;
const MAX_FANOUT_ANCHORS = 3;
const MIN_ANCHOR_DISTANCE_KM = 3;
const NEIGHBORHOOD_MAX_KM = 5;

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

  // Foursquare venue candidates, Wikidata candidates and Region Resolver
  // anchors, all fetched concurrently alongside OSM.
  const [live, fsqRest, fsqCafe, fsqBar, fsqShop, wikidata, region] = await Promise.all([
    osmPromise,
    foursquareSearch("restaurant", center),
    foursquareSearch("cafe", center),
    foursquareSearch("nightlife", center),
    foursquareSearch("shopping", center),
    wikidataPlaces(center),
    resolveRegion(center),
  ]);

  // Curated seeds are the SPINE: hand-verified local-expert picks with trusted
  // coordinates, tier and price. They come FIRST so that on a name collision
  // the curated entry wins and merely absorbs live enrichment (photo, hours,
  // website, rating) — a live API result can never displace a curated pick.
  // Then Wikidata (trusted, globally documented), then Foursquare venues, then
  // raw OSM. This is the inversion that stops generic venues (e.g. a random
  // "Alpha55" from a Foursquare nightlife search) from ever crowding out the
  // curated must-sees and named venues of a covered city.
  let merged = mergeByName([
    ...seeds,
    ...wikidata,
    ...fsqRest,
    ...fsqCafe,
    ...fsqBar,
    ...fsqShop,
    ...live,
  ]);

  // Metro Area Support: still thin after OSM's own radius escalation? Fan
  // out to the nearest distinct districts/municipalities rather than ever
  // stopping at the destination's own administrative boundary.
  if (merged.length < THIN_POOL_THRESHOLD && region.length > 0) {
    const anchors = region
      .filter((a) => a.distanceKm > MIN_ANCHOR_DISTANCE_KM)
      .slice(0, MAX_FANOUT_ANCHORS);
    if (anchors.length > 0) {
      const extra = await Promise.all(
        anchors.map((a) => overpassPlaces(a.center, REGION_ANCHOR_RADIUS_M))
      );
      merged = mergeByName([...merged, ...extra.flat()]);
    }
  }

  attachNeighborhoods(merged, region);

  if (merged.length > 0) return merged;

  // Last resort: seed only.
  return seeds;
}

/** Generic, source-backed neighborhood labeling: any candidate still
 *  missing one gets the name of its nearest Region Resolver anchor. */
function attachNeighborhoods(places: Place[], region: RegionAnchor[]): void {
  if (region.length === 0) return;
  for (const p of places) {
    if (p.neighborhood) continue;
    const nearest = nearestAnchor(p, region);
    if (nearest) p.neighborhood = nearest.name;
  }
}

function nearestAnchor(p: GeoPoint, region: RegionAnchor[]): RegionAnchor | undefined {
  let best: RegionAnchor | undefined;
  let bestDist = Infinity;
  for (const a of region) {
    const d = haversineKm(p, a.center);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best && bestDist <= NEIGHBORHOOD_MAX_KM ? best : undefined;
}

function normalizeKey(query: string): string | null {
  const seed = findSeedCity(query);
  if (!seed) return null;
  return seed.name.toLowerCase();
}

/** Fields a live source may legitimately ADD to a curated place (enrichment
 *  only — never overwriting curated identity, coordinates, tier or price). */
function absorbEnrichment(into: Place, from: Place): void {
  into.wikipediaUrl = into.wikipediaUrl || from.wikipediaUrl;
  into.wikidataId = into.wikidataId || from.wikidataId;
  into.wikipediaTitle = into.wikipediaTitle || from.wikipediaTitle;
  into.imageUrl = into.imageUrl || from.imageUrl;
  into.openingHours = into.openingHours || from.openingHours;
  into.website = into.website || from.website;
  into.address = into.address || from.address;
  if (into.rating == null && typeof from.rating === "number") into.rating = from.rating;
  if (into.popularity == null && typeof from.popularity === "number") {
    into.popularity = from.popularity;
  }
}

/**
 * De-duplicate by normalized name. Curated entries (the spine) always win the
 * slot and simply absorb live enrichment fields; otherwise the first (highest
 * priority by merge order) entry wins and absorbs later duplicates' extras.
 */
function mergeByName(places: Place[]): Place[] {
  const map = new Map<string, Place>();
  for (const p of places) {
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
      continue;
    }
    if (existing.curated) {
      // Curated stays; pull in any live fields it lacks.
      absorbEnrichment(existing, p);
    } else if (p.curated) {
      // A curated duplicate arrived after a live one (shouldn't happen given
      // merge order, but be safe): promote curated, keep the live enrichment.
      absorbEnrichment(p, existing);
      map.set(key, p);
    } else {
      // Two live entries for the same name: keep the first, absorb extras.
      absorbEnrichment(existing, p);
    }
  }
  return Array.from(map.values());
}
