import type { GeoPoint } from "../types";
import { fetchJson } from "./http";
import { findSeedCity } from "./seed";
import { withCache } from "../cache";
import { slugify } from "../utils";

export interface GeocodeResult {
  name: string;
  center: GeoPoint;
  displayName: string;
  /** Resolved country (when known) — used for currency + grounding. */
  country?: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  addresstype?: string;
  importance?: number;
  address?: {
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
}

// Settlement-like result types, best first. We strongly prefer these so a query
// like "Ontario" resolves to a city/town rather than a giant province polygon.
const SETTLEMENT_RANK: Record<string, number> = {
  city: 0,
  town: 1,
  municipality: 2,
  village: 3,
  administrative: 4,
  county: 5,
  state: 6,
  country: 7,
};

function rankOf(it: NominatimItem): number {
  const t = (it.addresstype || it.type || "").toLowerCase();
  return SETTLEMENT_RANK[t] ?? 9;
}

function toResult(it: NominatimItem, fallbackQuery: string): GeocodeResult {
  const addr = it.address ?? {};
  const name =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    it.name ||
    it.display_name.split(",")[0] ||
    fallbackQuery;
  const country = addr.country || it.display_name.split(",").slice(-1)[0].trim();
  return {
    name,
    displayName: it.display_name,
    center: { lat: parseFloat(it.lat), lng: parseFloat(it.lon) },
    country,
  };
}

async function nominatim(query: string, limit: number): Promise<NominatimItem[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1` +
    `&accept-language=en&limit=${limit}&q=${encodeURIComponent(query)}`;
  return fetchJson<NominatimItem[]>(url, { timeoutMs: 8000 });
}

/**
 * Resolve a free-text destination to coordinates (free Nominatim / OSM).
 * Prefers real settlements over administrative polygons, always tries to
 * resolve the country, and falls back to a curated seed city so the planner is
 * never left without a location. Cached offline for 30 days.
 */
export async function geocode(query: string): Promise<GeocodeResult> {
  const key = `geocode:${slugify(query)}`;
  try {
    return await withCache<GeocodeResult>(
      key,
      1000 * 60 * 60 * 24 * 30,
      async () => {
        let items = await nominatim(query, 6).catch(() => [] as NominatimItem[]);
        // Relaxed retry: drop trailing qualifiers (", X") and try the head term.
        if (items.length === 0 && query.includes(",")) {
          items = await nominatim(query.split(",")[0].trim(), 6).catch(() => []);
        }
        if (items.length === 0) throw new Error("no nominatim result");
        // Pick the best settlement; tie-break by Nominatim importance.
        items.sort(
          (a, b) =>
            rankOf(a) - rankOf(b) || (b.importance ?? 0) - (a.importance ?? 0)
        );
        return toResult(items[0], query);
      },
      (v) => !v.center
    );
  } catch {
    // fall through to seed
  }

  const seed = findSeedCity(query);
  if (seed) {
    return {
      name: seed.name,
      displayName: `${seed.name}, ${seed.country}`,
      center: seed.center,
      country: seed.country,
    };
  }
  throw new Error(`Could not locate destination "${query}"`);
}

interface NominatimReverse {
  display_name?: string;
  name?: string;
  address?: {
    road?: string;
    house_number?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

/**
 * Reverse-geocode coordinates to a human address (free, keyless Nominatim) —
 * the fallback so the UI NEVER shows raw latitude/longitude when an address is
 * missing from OSM/Foursquare. Cached 30 days; returns undefined on failure
 * (the UI then says "Address unavailable", never coordinates).
 */
export async function reverseGeocode(point: GeoPoint): Promise<string | undefined> {
  const key = `revgeo:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  return withCache<string | undefined>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18` +
        `&accept-language=en&lat=${point.lat}&lon=${point.lng}`;
      const it = await fetchJson<NominatimReverse>(url, { timeoutMs: 7000 });
      const a = it.address ?? {};
      const street = a.road || a.pedestrian || a.neighbourhood;
      const number = a.house_number;
      const town = a.city || a.town || a.village || a.suburb;
      const line = [number, street].filter(Boolean).join(" ").trim();
      const full = [line || street, town].filter(Boolean).join(", ");
      return full || it.name || it.display_name?.split(",").slice(0, 2).join(",");
    },
    (v) => !v
  ).catch(() => undefined);
}
