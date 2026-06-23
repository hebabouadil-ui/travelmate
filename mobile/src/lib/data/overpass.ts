import type { GeoPoint, Place, PlaceCategory } from "../types";
import { makeId } from "../utils";
import { formatAddress } from "../itinerary/validate";
import { ENV } from "../env";

// Overpass/Nominatim throttle or 406-reject anonymous requests. Identifying the
// client with a descriptive User-Agent (etiquette requirement) and asking for
// JSON markedly reduces 406/429 rejections — the live audit showed every mirror
// rejecting the header-less request.
const OSM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
  "User-Agent": `VoyageAI-Mobile/1.0 (${ENV.osmContactEmail})`,
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Query the free Overpass API (OpenStreetMap) for points of interest around a
 * center. Tries multiple mirrors. Returns [] on total failure so callers can
 * fall back to curated seed data / cache.
 */
export async function overpassPlaces(
  center: GeoPoint,
  radiusM = 6000
): Promise<Place[]> {
  const query = buildQuery(center, radiusM);

  // Performance: hit ALL mirrors in parallel and take the FIRST that returns a
  // non-empty result, instead of waiting out a slow/empty mirror sequentially
  // (which could cost 25s × N). A single flaky mirror can no longer stall or
  // empty the whole pool. Timeout tightened to 12s per mirror.
  const attempts = ENDPOINTS.map(
    (endpoint) =>
      new Promise<Place[]>((resolve, reject) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        fetch(endpoint, {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: OSM_HEADERS,
          signal: controller.signal,
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`overpass ${res.status}`);
            const data = (await res.json()) as OverpassResponse;
            const places = (data.elements ?? [])
              .map(toPlace)
              .filter((p): p is Place => p !== null);
            // Treat empty as failure so Promise.any falls to another mirror.
            if (places.length === 0) throw new Error("overpass empty");
            resolve(dedupe(places));
          })
          .catch(reject)
          .finally(() => clearTimeout(timer));
      })
  );

  try {
    return await Promise.any(attempts);
  } catch {
    return []; // every mirror failed/empty → caller falls back to seeds/cache
  }
}

function buildQuery(c: GeoPoint, r: number): string {
  const around = `(around:${r},${c.lat},${c.lng})`;
  return `[out:json][timeout:25];
(
  nwr["tourism"~"attraction|museum|artwork|viewpoint|gallery|zoo|theme_park"]${around};
  nwr["historic"~"monument|memorial|castle|ruins|archaeological_site|fort"]${around};
  nwr["amenity"~"restaurant|cafe"]${around};
  nwr["leisure"~"park|garden"]${around};
  nwr["natural"="beach"]${around};
  nwr["amenity"~"bar|pub|nightclub"]${around};
  nwr["shop"~"mall|department_store"]${around};
);
out center 350;`;
}

function toPlace(el: OverpassElement): Place | null {
  const tags = el.tags || {};
  const name = tags.name || tags["name:en"];
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const category = classify(tags);
  if (!category) return null;

  // Hidden-gem heuristic: places without wikidata/wikipedia tags and not
  // explicitly major attractions are more likely off-the-beaten-path.
  const isMajor = Boolean(tags.wikidata || tags.wikipedia);
  const hiddenGem =
    !isMajor &&
    (category === "cafe" || category === "viewpoint" || category === "park");

  return {
    id: makeId("osm"),
    name,
    category,
    lat,
    lng: lon,
    cuisine: tags.cuisine?.split(";")[0]?.replace(/_/g, " "),
    tags: collectDietTags(tags),
    hiddenGem,
    openingHours: tags.opening_hours,
    address: formatAddress({
      housenumber: tags["addr:housenumber"],
      street: tags["addr:street"],
      city: tags["addr:city"],
    }),
    website: tags.website || tags["contact:website"] || undefined,
    neighborhood: tags["addr:suburb"] || tags["addr:district"] || tags["addr:city"],
    verified: true, // straight from OpenStreetMap — a real, mapped place
    score:
      isMajor ? 0.9 : category === "restaurant" || category === "cafe" ? 0.5 : 0.6,
    source: "overpass",
    wikidataId: tags.wikidata,
    wikipediaTitle: tags.wikipedia ? tags.wikipedia.replace(/^[a-z]+:/, "") : undefined,
    wikipediaUrl: tags.wikipedia
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(
          tags.wikipedia.replace(/^[a-z]+:/, "")
        )}`
      : undefined,
  };
}

function classify(tags: Record<string, string>): PlaceCategory | null {
  if (tags.historic) {
    if (["monument", "memorial"].includes(tags.historic)) return "monument";
    return "landmark";
  }
  if (tags.tourism === "museum" || tags.tourism === "gallery") return "museum";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism) return "attraction";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (["bar", "pub", "nightclub"].includes(tags.amenity || "")) return "nightlife";
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  if (tags.natural === "beach") return "beach";
  if (tags.shop === "mall" || tags.shop === "department_store") return "shopping";
  return null;
}

function collectDietTags(tags: Record<string, string>): string[] {
  const out: string[] = [];
  if (tags["diet:halal"] === "yes") out.push("halal");
  if (tags["diet:vegetarian"] === "yes") out.push("vegetarian");
  if (tags["diet:vegan"] === "yes") out.push("vegan");
  if (tags.cuisine) out.push(tags.cuisine.split(";")[0].replace(/_/g, " "));
  return out;
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = `${p.name.toLowerCase()}|${p.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
