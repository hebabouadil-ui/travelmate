import type { GeoPoint } from "../types";
import { withCache } from "../cache";
import { ENV } from "../env";
import { haversineKm } from "../utils";

/**
 * Destination Region Resolver — generic, NOT hardcoded per city.
 *
 * Small/medium cities and metro areas span more than a single municipal
 * boundary (Greater Moncton = Moncton + Dieppe + Riverview; Montreal =
 * Old Montreal/Downtown/Plateau/Mile End/Griffintown + Laval/Longueuil
 * across the river). Rather than hand-coding those names, this queries
 * OpenStreetMap's own generic place taxonomy (`place=suburb|neighbourhood|
 * quarter|town|...`) around the destination center, so the same logic
 * resolves a sensible metro area for ANY destination on Earth.
 */
export interface RegionAnchor {
  name: string;
  center: GeoPoint;
  /** km from the destination center. */
  distanceKm: number;
  /** OSM `place` tag value (suburb, neighbourhood, quarter, town, ...). */
  kind: string;
}

const OSM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
  "User-Agent": `VoyageAI-Mobile/1.0 (${ENV.osmContactEmail})`,
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

const REGION_RADIUS_M = 30000;
const MAX_ANCHORS = 8;

interface OverpassEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Find named districts/neighbourhoods/satellite municipalities near a
 *  destination, sorted nearest-first. Cached 30 days — districts don't move. */
export async function resolveRegion(center: GeoPoint): Promise<RegionAnchor[]> {
  const cacheKey = `region:${center.lat.toFixed(3)},${center.lng.toFixed(3)}`;
  return withCache<RegionAnchor[]>(
    cacheKey,
    1000 * 60 * 60 * 24 * 30,
    () => fetchAnchors(center),
    (v) => v.length === 0
  ).catch(() => []);
}

async function fetchAnchors(center: GeoPoint): Promise<RegionAnchor[]> {
  const query = buildRegionQuery(center, REGION_RADIUS_M);
  const elements = await raceQuery(query);
  const anchors = elements
    .map((el) => toAnchor(el, center))
    .filter((a): a is RegionAnchor => a !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return dedupeByName(anchors).slice(0, MAX_ANCHORS);
}

function buildRegionQuery(c: GeoPoint, radiusM: number): string {
  const around = `(around:${radiusM},${c.lat},${c.lng})`;
  // place=* is OSM's universal settlement/district hierarchy — covers the
  // generic case worldwide, no per-country or per-city naming required.
  return `[out:json][timeout:25];
(
  node["place"~"^(suburb|neighbourhood|quarter|borough|town|village|city_district)$"]${around};
);
out center ${MAX_ANCHORS * 6};`;
}

function raceQuery(query: string): Promise<OverpassEl[]> {
  const attempts = ENDPOINTS.map(
    (endpoint) =>
      new Promise<OverpassEl[]>((resolve, reject) => {
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
            const data = (await res.json()) as { elements?: OverpassEl[] };
            const elements = data.elements ?? [];
            if (elements.length === 0) throw new Error("overpass empty");
            resolve(elements);
          })
          .catch(reject)
          .finally(() => clearTimeout(timer));
      })
  );
  return Promise.any(attempts).catch(() => [] as OverpassEl[]);
}

function toAnchor(el: OverpassEl, center: GeoPoint): RegionAnchor | null {
  const tags = el.tags || {};
  const name = tags.name || tags["name:en"];
  const kind = tags.place;
  if (!name || !kind) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const anchorCenter = { lat, lng };
  return {
    name,
    center: anchorCenter,
    distanceKm: haversineKm(center, anchorCenter),
    kind,
  };
}

function dedupeByName(anchors: RegionAnchor[]): RegionAnchor[] {
  const seen = new Set<string>();
  return anchors.filter((a) => {
    const key = a.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
