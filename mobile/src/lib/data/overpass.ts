import type { GeoPoint, Place, PlaceCategory } from "../types";
import { makeId } from "../utils";
import { formatAddress } from "../itinerary/validate";
import { ENV } from "../env";
import { isTouristIrrelevant, classifyExperience, classifyNightlife } from "./relevance";

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

// Dynamic Radius Expansion: small/medium cities are often thin within a
// tight municipal-style radius even though plenty of real attractions sit
// just outside it. Escalate the search radius — never stop at an
// administrative boundary — until the pool is no longer thin, capping at
// 40km. Callers that pass an explicit radius (e.g. a Region Resolver anchor
// query in places.ts) skip escalation and get exactly that radius.
const RADIUS_STEPS_M = [8000, 15000, 25000, 40000];
const THIN_POOL_MIN = 25;

/**
 * Query the free Overpass API (OpenStreetMap) for points of interest around a
 * center. Tries multiple mirrors. Returns [] on total failure so callers can
 * fall back to curated seed data / cache.
 */
export async function overpassPlaces(
  center: GeoPoint,
  radiusM?: number
): Promise<Place[]> {
  if (radiusM != null) return queryAtRadius(center, radiusM);

  let result: Place[] = [];
  for (const step of RADIUS_STEPS_M) {
    result = await queryAtRadius(center, step);
    if (result.length >= THIN_POOL_MIN) break;
  }
  return result;
}

async function queryAtRadius(center: GeoPoint, radiusM: number): Promise<Place[]> {
  // Two SEPARATE balanced buckets, each capped on its own. The live audit
  // showed a single `out center 350` getting consumed by a city's hundreds of
  // bars/restaurants, starving sightseeing (London: 191 nightlife + 88
  // restaurants left only ~32 monuments/museums). Querying sightseeing and
  // venues independently guarantees attractions are never crowded out.
  const [sights, venues] = await Promise.all([
    raceQuery(buildSightsQuery(center, radiusM)),
    raceQuery(buildVenuesQuery(center, radiusM)),
  ]);
  return dedupe([...sights, ...venues]);
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
  // place_of_worship and boutique/fashion shops are gated to wikidata/
  // wikipedia-tagged ones only — a city has hundreds of small neighborhood
  // mosques/churches/clothing shops; without the gate they would flood the
  // 300-cap, while the famous ones (Hassan II Mosque, a real fashion-district
  // boutique) are exactly the ones OSM tags with wikidata/wikipedia.
  // amenity=marketplace surfaces souks/local markets (Shopping engine) —
  // genuine travel experiences, never the big-box retail the relevance
  // filter rejects downstream.
  return `[out:json][timeout:25];
(
  nwr["tourism"~"attraction|museum|artwork|viewpoint|gallery|zoo|theme_park"]${around};
  nwr["historic"~"monument|memorial|castle|ruins|archaeological_site|fort"]${around};
  nwr["leisure"~"park|garden|sports_centre|stadium|water_park"]${around};
  nwr["natural"="beach"]${around};
  nwr["shop"~"mall|department_store"]${around};
  nwr["amenity"="marketplace"]${around};
  nwr["amenity"~"cinema|theatre|spa"]${around};
  nwr["shop"~"boutique|fashion"]["wikidata"]${around};
  nwr["shop"~"boutique|fashion"]["wikipedia"]${around};
  nwr["amenity"="place_of_worship"]["wikidata"]${around};
  nwr["amenity"="place_of_worship"]["wikipedia"]${around};
);
out center 300;`;
}

function buildVenuesQuery(c: GeoPoint, r: number): string {
  const around = `(around:${r},${c.lat},${c.lng})`;
  // Nightlife engine: bars/pubs/nightclubs plus biergarten and live-music
  // venues — never museums/monuments. Food engine: restaurants/cafés plus
  // bakeries (authentic local food stops, not random venues).
  return `[out:json][timeout:25];
(
  nwr["amenity"~"restaurant|cafe"]${around};
  nwr["shop"="bakery"]${around};
  nwr["amenity"~"bar|pub|nightclub|biergarten|music_venue"]${around};
);
out center 300;`;
}

function toPlace(el: OverpassElement): Place | null {
  const tags = el.tags || {};
  // Prefer the English name only when the primary `name` is in a non-Latin
  // script (CJK/Cyrillic/Greek/Arabic/Thai/…). Those neither read well in an
  // English-language app nor match our curated (Latin-script) knowledge packs,
  // so a Beijing/Tokyo/Athens landmark would otherwise arrive unmatchable. When
  // the local name already uses Latin letters (incl. accents, e.g. "Sagrada
  // Família"), keep it — that's the recognizable form travelers actually know.
  const localName = tags.name;
  const name = localName && /[a-z]/i.test(localName) ? localName : tags["name:en"] || localName;
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const category = classify(tags);
  if (!category) return null;

  // Tourist Relevance Filter: TravelMate is a travel planner, not a maps
  // app — reject big-box retail/utilities/industrial before they ever reach
  // scoring (see relevance.ts).
  if (isTouristIrrelevant(name, tags)) return null;

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
    experiences: classifyExperience(category, tags, name),
    nightlifeType: category === "nightlife" ? classifyNightlife(name, tags) : undefined,
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
  if (tags.tourism === "museum") return "museum";
  if (tags.tourism === "gallery") return "gallery";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism) return "attraction";
  if (tags.amenity === "place_of_worship") return "monument";
  if (tags.amenity === "marketplace") return "attraction";
  if (tags.amenity === "cinema" || tags.amenity === "theatre") return "entertainment";
  if (tags.amenity === "spa") return "wellness";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.shop === "bakery") return "cafe";
  if (["bar", "pub", "nightclub", "biergarten", "music_venue"].includes(tags.amenity || ""))
    return "nightlife";
  if (tags.leisure === "stadium" || tags.leisure === "sports_centre") return "sports";
  if (tags.leisure === "water_park") return "entertainment";
  if (tags.leisure === "park" || tags.leisure === "garden") return "park";
  if (tags.natural === "beach") return "beach";
  if (tags.shop === "mall" || tags.shop === "department_store") return "shopping";
  if (tags.shop === "boutique" || tags.shop === "fashion") return "shopping";
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
