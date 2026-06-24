import { ENV } from "../env";
import { withCache } from "../cache";
import { makeId, slugify } from "../utils";
import type { GeoPoint, Place, PlaceCategory } from "../types";

/**
 * Foursquare Places integration. Foursquare is the PRIMARY source for venue-type
 * places — restaurants, cafés, bars/nightlife, shopping — and for the address,
 * opening hours and website of any place, because OpenStreetMap frequently lacks
 * those tags. OSM/Wikidata remain the source for monuments/museums/parks fame.
 *
 * Everything degrades gracefully: with no key, or when the account is out of
 * API credits (HTTP 429), every function returns empty/undefined and callers
 * fall back to OSM + reverse geocoding, so the app never breaks.
 *
 * Works against the current Places API host (Bearer + version header); the
 * response is normalized so field access tolerates the documented shape.
 */

interface FsqPhoto { prefix?: string; suffix?: string }
interface FsqCategory { name?: string; short_name?: string }
interface FsqHours { display?: string; open_now?: boolean }
interface FsqLocation {
  formatted_address?: string;
  address?: string;
  locality?: string;
  region?: string;
  country?: string;
}
interface FsqResult {
  fsq_place_id?: string;
  fsq_id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  geocodes?: { main?: { latitude?: number; longitude?: number } };
  location?: FsqLocation;
  categories?: FsqCategory[];
  hours?: FsqHours;
  website?: string;
  tel?: string;
  rating?: number;
  photos?: FsqPhoto[];
}
interface FsqResponse { results?: FsqResult[] }

/** Rich, normalized venue details resolved from Foursquare. */
export interface FsqVenue {
  name: string;
  lat?: number;
  lng?: number;
  category: PlaceCategory;
  photoUrl?: string;
  address?: string;
  openingHours?: string;
  website?: string;
  tel?: string;
  rating?: number;
}

const FIELDS =
  "fsq_place_id,name,latitude,longitude,geocodes,location,categories,hours,website,tel,rating,photos";

export function hasFoursquare(): boolean {
  return Boolean(ENV.foursquareApiKey);
}

function photoUrl(p?: FsqPhoto): string | undefined {
  if (!p?.prefix || !p?.suffix) return undefined;
  return `${p.prefix}600x400${p.suffix}`;
}

/** Map a Foursquare category name to our taxonomy (best-effort, keyword-based). */
function mapCategory(cats?: FsqCategory[]): PlaceCategory {
  const name = (cats?.[0]?.name || cats?.[0]?.short_name || "").toLowerCase();
  if (/coffee|caf|tea|bakery|dessert/.test(name)) return "cafe";
  if (/bar|pub|club|night|lounge|brewery|wine/.test(name)) return "nightlife";
  if (/mall|shop|store|market|boutique/.test(name)) return "shopping";
  if (/museum|gallery/.test(name)) return "museum";
  if (/park|garden|gnature/.test(name)) return "park";
  if (/monument|historic|landmark|temple|church|mosque|palace/.test(name)) return "monument";
  if (/restaurant|food|diner|eatery|grill|steak|pizz|sushi|kitchen/.test(name)) return "restaurant";
  return "restaurant"; // venue searches are food-led by default
}

function venueLat(r: FsqResult): number | undefined {
  return r.latitude ?? r.geocodes?.main?.latitude;
}
function venueLng(r: FsqResult): number | undefined {
  return r.longitude ?? r.geocodes?.main?.longitude;
}

function address(loc?: FsqLocation): string | undefined {
  if (!loc) return undefined;
  if (loc.formatted_address) return loc.formatted_address;
  const parts = [loc.address, loc.locality, loc.region].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function normalize(r: FsqResult): FsqVenue | null {
  if (!r.name) return null;
  return {
    name: r.name,
    lat: venueLat(r),
    lng: venueLng(r),
    category: mapCategory(r.categories),
    photoUrl: photoUrl(r.photos?.[0]),
    address: address(r.location),
    openingHours: r.hours?.display,
    website: r.website,
    tel: r.tel,
    rating: typeof r.rating === "number" ? r.rating : undefined,
  };
}

async function fsqFetch(url: string): Promise<FsqResult[] | undefined> {
  const key = ENV.foursquareApiKey;
  if (!key) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Places-Api-Version": "2025-06-17",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    // 429 = out of credits / rate-limited; 401 = bad key. Degrade silently.
    if (!res.ok) return undefined;
    const data = (await res.json()) as FsqResponse;
    return data.results ?? [];
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search Foursquare for venues of a given kind near a point, as real itinerary
 * candidates (the PRIMARY source for restaurants/cafés/bars/shopping). Returns
 * [] when unavailable so the engine simply uses OSM instead.
 */
export async function foursquareSearch(
  kind: "restaurant" | "cafe" | "nightlife" | "shopping",
  point: GeoPoint,
  radiusM = 4000,
  limit = 20
): Promise<Place[]> {
  if (!ENV.foursquareApiKey) return [];
  const ll = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  const cacheKey = `fsqsearch:${kind}:${ll}:${radiusM}`;
  return withCache<Place[]>(
    cacheKey,
    1000 * 60 * 60 * 24 * 7,
    async () => {
      const query = encodeURIComponent(kind === "nightlife" ? "bar" : kind);
      const url =
        `https://places-api.foursquare.com/places/search?query=${query}` +
        `&ll=${ll}&radius=${radiusM}&limit=${limit}&sort=POPULARITY&fields=${FIELDS}`;
      const results = await fsqFetch(url);
      if (!results) return [];
      return results
        .map(normalize)
        .filter((v): v is FsqVenue => !!v && v.lat != null && v.lng != null)
        .map((v) => toPlace(v, kind));
    },
    (v) => v.length === 0
  ).catch(() => []);
}

function toPlace(v: FsqVenue, kind: FsqVenue["category"] | string): Place {
  return {
    id: makeId("fsq"),
    name: v.name,
    category: (kind as PlaceCategory) || v.category,
    lat: v.lat!,
    lng: v.lng!,
    source: "overpass", // treated as a real, mapped venue for the Verified badge
    verified: true,
    imageUrl: v.photoUrl,
    photoResolved: Boolean(v.photoUrl),
    address: v.address,
    openingHours: v.openingHours,
    website: v.website,
    score: typeof v.rating === "number" ? Math.min(1, v.rating / 10) : 0.55,
    rating: v.rating,
  };
}

/**
 * Resolve full details (photo + address + hours + website) for a single named
 * place, e.g. to enrich an OSM stop that's missing them. Cached 30 days.
 */
export async function foursquareVenue(
  name: string,
  point: GeoPoint
): Promise<FsqVenue | undefined> {
  if (!ENV.foursquareApiKey) return undefined;
  const ll = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cacheKey = `fsqvenue:${slugify(name)}:${ll}`;
  return withCache<FsqVenue | undefined>(
    cacheKey,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const q = encodeURIComponent(name);
      const url =
        `https://places-api.foursquare.com/places/search?query=${q}` +
        `&ll=${ll}&radius=500&limit=1&fields=${FIELDS}`;
      const results = await fsqFetch(url);
      const first = results?.[0];
      return first ? normalize(first) ?? undefined : undefined;
    },
    (v) => !v
  ).catch(() => undefined);
}

/** Back-compat: just the photo for a named place (used by the media pipeline). */
export async function foursquarePhoto(
  name: string,
  point: GeoPoint
): Promise<string | undefined> {
  const venue = await foursquareVenue(name, point);
  return venue?.photoUrl;
}
