import type { GeoPoint } from "../types";
import { fetchJson } from "./http";
import { findSeedCity } from "./seed";

export interface GeocodeResult {
  name: string;
  center: GeoPoint;
  displayName: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

/**
 * Resolve a free-text destination to coordinates using the free Nominatim
 * (OpenStreetMap) API, with a curated seed fallback for headline cities.
 */
export async function geocode(query: string): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`;
    const items = await fetchJson<NominatimItem[]>(url, { timeoutMs: 7000 });
    if (items.length > 0) {
      const it = items[0];
      return {
        name: it.name || query,
        displayName: it.display_name,
        center: { lat: parseFloat(it.lat), lng: parseFloat(it.lon) },
      };
    }
  } catch {
    // fall through to seed
  }

  const seed = findSeedCity(query);
  if (seed) {
    return {
      name: seed.name,
      displayName: `${seed.name}, ${seed.country}`,
      center: seed.center,
    };
  }
  throw new Error(`Could not locate destination "${query}"`);
}
