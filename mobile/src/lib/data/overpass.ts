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
  // Two SEPARATE balanced buckets, each capped on its own. The live audit
  // showed a single `out center 350` getting consumed by a city's hundreds of
  // bars/restaurants, starving sightseeing (London: 191 nightlife + 88
  // restaurants left only ~32 monuments/museums). Querying sightseeing and
  // venues independently guarantees attractions are never crowded out.
  const [sights, venues] = await Promise.all([
    raceQuery(buildSightsQuery(center, radiusM)),
    raceQuery(buildVenuesQuery(center, radiusM)),
  ]);
  const merged = dedupe([...sights, ...venues]);
  return merged;
}

/** Run one Overpass query across all mirrors in parallel; first non-empty wins.
 *  A flaky/slow/throttled mirror can no longer stall or empty the result. */
function raceQuery(query: string): Promise<Place[]> {
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
            if (places.length === 0) throw new Error("overpass empty");
            resolve(places);
          })
          .catch(reject)
          .finally(() => clearTimeout(timer));
      })
  );
  return Promise.any(attempts).catch(() => [] as Place[]);
}

function buildSightsQuery(c: GeoPoint, r: number): string {
  const around = `(around:${r},${c.lat},${c.lng})`;
  // place_of_worship is gated to wikidata/wikipedia-tagged ones only — a city
  // has hundreds of small neighborhood mosques/churches; without the gate they
  // would flood the 300-cap, while famous ones (Hassan II Mosque, Notre-Dame-
  // style landmarks) are exactly the ones OSM tags with wikidata/wikipedia.
  return `[out:json][timeout:25];
(
  nwr["tourism"~"attraction|museum|artwork|viewpoint|gallery|zoo|theme_park"]${around};
  nwr["historic"~"monument|memorial|castle|ruins|archaeological_site|fort"]${around};
  nwr["leisure"~"park|garden"]${around};
  nwr["natural"="beach"]${around};
  nwr["shop"~"mall|department_store"]${around};
  nwr["amenity"="place_of_worship"]["wikidata"]${around};
  nwr["amenity"="place_of_worship"]["wikipedia"]${around};
);
out center 300;`;
}

function buildVenuesQuery(c: GeoPoint, r: number): string {
  const around = `(around:${r},${c.lat},${c.lng})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"restaurant|cafe"]${around};
  nwr["amenity"~"bar|pub|nightclub"]${around};
);
out center 300;`;
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
  if (tags.amenity === "place_of_worship") return "monument";
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
