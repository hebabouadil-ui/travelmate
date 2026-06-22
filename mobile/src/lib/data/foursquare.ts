import { ENV } from "../env";
import { withCache } from "../cache";
import { slugify } from "../utils";
import type { GeoPoint } from "../types";

/**
 * Real venue photos via the Foursquare Places API (optional, free tier). Given a
 * place name + coordinates it finds the matching venue and returns its actual
 * photo URL. Returns undefined when no key is set or nothing is found, so callers
 * fall back to Wikipedia / category images.
 *
 * Tries the current Places API host first, then the legacy v3 host, so it works
 * regardless of which key type the user has.
 */
interface FsqPhoto {
  prefix?: string;
  suffix?: string;
}
interface FsqResult {
  photos?: FsqPhoto[];
}
interface FsqResponse {
  results?: FsqResult[];
}

export function hasFoursquare(): boolean {
  return Boolean(ENV.foursquareApiKey);
}

function photoUrl(p?: FsqPhoto): string | undefined {
  if (!p?.prefix || !p?.suffix) return undefined;
  return `${p.prefix}600x400${p.suffix}`;
}

async function tryFetch(url: string, headers: Record<string, string>): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return undefined;
    const data = (await res.json()) as FsqResponse;
    const photo = data.results?.[0]?.photos?.[0];
    return photoUrl(photo);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function foursquarePhoto(
  name: string,
  point: GeoPoint
): Promise<string | undefined> {
  const key = ENV.foursquareApiKey;
  if (!key) return undefined;
  const ll = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cacheKey = `fsq:${slugify(name)}:${ll}`;

  return withCache<string | undefined>(
    cacheKey,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const q = encodeURIComponent(name);

      // 1) Current Places API (Bearer + version header).
      const modern = await tryFetch(
        `https://places-api.foursquare.com/places/search?query=${q}&ll=${ll}&radius=400&limit=1&fields=photos`,
        {
          Authorization: `Bearer ${key}`,
          "X-Places-Api-Version": "2025-06-17",
          Accept: "application/json",
        }
      );
      if (modern) return modern;

      // 2) Legacy v3 host (raw key auth).
      const legacy = await tryFetch(
        `https://api.foursquare.com/v3/places/search?query=${q}&ll=${ll}&radius=400&limit=1&fields=photos`,
        { Authorization: key, Accept: "application/json" }
      );
      return legacy;
    }
  ).catch(() => undefined);
}
