import type { GeoPoint, Place, PlaceCategory } from "../types";
import { makeId } from "../utils";
import { withCache } from "../cache";
import { ENV } from "../env";
import { isTouristIrrelevant, classifyExperience } from "./relevance";

/**
 * Wikidata as a DISCOVERY source (candidate priority #2, per the Global
 * Candidate Discovery Engine spec): UNESCO sites, national monuments,
 * museums, historical buildings, castles, palaces, beaches and natural
 * attractions. This INDEPENDENTLY queries for new candidates near a
 * destination — it does not just fame-score places OSM already found (see
 * `popularity.ts` for that, a different concern), so it can surface
 * globally-documented landmarks that a single map database's tagging missed.
 */

const ENDPOINT = "https://query.wikidata.org/sparql";

// Stable, well-known Wikidata classes (matched transitively via P279
// subclass-of) mapped onto our existing closed PlaceCategory taxonomy. No
// new category values are introduced — Wikidata enriches the SAME taxonomy
// every other source already classifies into.
const TYPE_MAP: Record<string, PlaceCategory> = {
  Q33506: "museum", // museum
  Q23413: "monument", // castle
  Q751876: "monument", // palace
  Q4989906: "monument", // monument
  Q839954: "monument", // archaeological site
  Q570116: "attraction", // tourist attraction
  Q9259: "monument", // World Heritage Site (UNESCO)
  Q40080: "beach", // beach
};

const DEFAULT_RADIUS_KM = 12;

interface SparqlBinding {
  item: { value: string };
  itemLabel?: { value: string };
  coord?: { value: string };
  typeQid?: { value: string };
  website?: { value: string };
}

export async function wikidataPlaces(
  center: GeoPoint,
  radiusKm = DEFAULT_RADIUS_KM
): Promise<Place[]> {
  const cacheKey = `wikidata:${center.lat.toFixed(3)},${center.lng.toFixed(3)}:${radiusKm}`;
  return withCache<Place[]>(
    cacheKey,
    1000 * 60 * 60 * 24 * 14, // 14 days — landmarks don't move
    () => fetchWikidata(center, radiusKm),
    (v) => v.length === 0
  ).catch(() => []);
}

function buildQuery(center: GeoPoint, radiusKm: number): string {
  const values = Object.keys(TYPE_MAP)
    .map((q) => `wd:${q}`)
    .join(" ");
  return `SELECT ?item ?itemLabel ?coord ?typeQid ?website WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord.
    bd:serviceParam wikibase:center "Point(${center.lng},${center.lat})"^^geo:wktLiteral.
    bd:serviceParam wikibase:radius "${radiusKm}".
  }
  VALUES ?typeQid { ${values} }
  ?item wdt:P31/wdt:P279* ?typeQid.
  OPTIONAL { ?item wdt:P856 ?website. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200`;
}

async function fetchWikidata(center: GeoPoint, radiusKm: number): Promise<Place[]> {
  const query = buildQuery(center, radiusKm);
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/sparql-results+json",
        // WDQS rejects/throttles anonymous-looking requests; identify the
        // client the same way overpass.ts already does for OSM mirrors.
        "User-Agent": `VoyageAI-Mobile/1.0 (${ENV.osmContactEmail})`,
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
    const bindings = data.results?.bindings ?? [];
    return bindings.map(toPlace).filter((p): p is Place => p !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parsePoint(wkt?: string): GeoPoint | null {
  // Wikidata coordinates serialize as "Point(lng lat)" (GeoSPARQL convention).
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt || "");
  if (!m) return null;
  return { lng: Number(m[1]), lat: Number(m[2]) };
}

function toPlace(b: SparqlBinding): Place | null {
  const name = b.itemLabel?.value;
  if (!name) return null;
  const point = parsePoint(b.coord?.value);
  if (!point) return null;
  if (isTouristIrrelevant(name, undefined)) return null;

  const qid = b.typeQid?.value?.split("/").pop();
  const category: PlaceCategory = (qid && TYPE_MAP[qid]) || "attraction";
  const wikidataId = b.item.value.split("/").pop();

  return {
    id: makeId("wikidata"),
    name,
    category,
    lat: point.lat,
    lng: point.lng,
    source: "wikidata",
    wikidataId,
    website: b.website?.value,
    // Trusted (globally documented landmark) but not OSM-verified — the
    // Verified badge is reserved for source==="overpass" (see validate.ts).
    score: 0.75,
    experiences: classifyExperience(category, undefined, name),
  };
}
