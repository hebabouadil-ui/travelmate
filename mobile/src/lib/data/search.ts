import { fetchJson } from "./http";
import { withCache } from "../cache";
import { slugify } from "../utils";
import type { GeoPoint } from "../types";

export interface CitySuggestion {
  /** Short display, e.g. "Madrid, Spain". */
  label: string;
  /** Full query to feed the planner. */
  value: string;
  name: string;
  country: string;
  center: GeoPoint;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  addresstype?: string;
  class?: string;
  address?: { country?: string; city?: string; town?: string; village?: string; state?: string };
}

/**
 * Global city/place search via free Nominatim (OpenStreetMap). Returns ranked
 * suggestions for ANY place worldwide — fixes "no results" for cities like
 * Madrid, Tangier, Dieppe or Moncton. Debounce in the UI before calling.
 */
export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = `search:${slugify(q)}`;
  try {
    return await withCache<CitySuggestion[]>(
      key,
      1000 * 60 * 60 * 24 * 7,
      async () => {
        const url =
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=en&addressdetails=1&q=${encodeURIComponent(q)}`;
        const items = await fetchJson<NominatimItem[]>(url, { timeoutMs: 8000 });
        return items
          .map(toSuggestion)
          .filter((s): s is CitySuggestion => s !== null)
          // de-dupe by label
          .filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i)
          .slice(0, 6);
      },
      (v) => v.length === 0
    );
  } catch {
    return [];
  }
}

function toSuggestion(it: NominatimItem): CitySuggestion | null {
  const lat = parseFloat(it.lat);
  const lng = parseFloat(it.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const addr = it.address ?? {};
  const name =
    it.name || addr.city || addr.town || addr.village || it.display_name.split(",")[0];
  const country = addr.country ?? it.display_name.split(",").slice(-1)[0].trim();
  const region = addr.state && addr.state !== name ? `${addr.state}, ` : "";
  const label = country ? `${name}, ${region}${country}`.replace(`${name}, ${name}`, name) : name;
  return {
    label: label.length > 48 ? `${name}, ${country}` : label,
    value: `${name}${country ? `, ${country}` : ""}`,
    name,
    country,
    center: { lat, lng },
  };
}
