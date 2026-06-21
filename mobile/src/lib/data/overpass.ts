import type { GeoPoint, Place, PlaceCategory } from "../types";
import { makeId } from "../utils";

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
  for (const endpoint of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as OverpassResponse;
      const places = data.elements
        .map(toPlace)
        .filter((p): p is Place => p !== null);
      if (places.length > 0) return dedupe(places);
    } catch {
      // try next mirror
    }
  }
  return [];
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
    score:
      isMajor ? 0.9 : category === "restaurant" || category === "cafe" ? 0.5 : 0.6,
    source: "overpass",
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
