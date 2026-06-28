import { withCache } from "../cache";
import { slugify } from "../utils";
import { isMatchingArticle } from "./knowledge";
import type { PlaceCategory } from "../types";
import { ENV } from "../env";

// Wikimedia's API policy blocks requests with a missing/generic User-Agent
// (a default okhttp UA on Android gets 403'd), so every Wikipedia/Commons
// call MUST identify itself — exactly like our Overpass requests do.
const WIKI_HEADERS: Record<string, string> = {
  "User-Agent": `VoyageAI-Mobile/1.0 (${ENV.osmContactEmail})`,
  Accept: "application/json",
};

interface WikiResponse {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        extract?: string;
        thumbnail?: { source: string };
        original?: { source: string };
        pageprops?: { disambiguation?: string };
      }
    >;
  };
}

export interface PlaceEnrichment {
  imageUrl?: string;
  description?: string;
}

/**
 * Free, key-less enrichment via Wikipedia. Searches for the place (scoped to its
 * city) and returns a real article image + short description, or an empty result
 * when there's no good match. Crucially it does NOT substitute a category stock
 * photo here — that's the caller's job, seeded by the place name so different
 * places never share one image. Cached for offline reuse.
 *
 * Photo Validator: the search API returns its single best guess even when that
 * guess is a disambiguation page or an unrelated topic the query happened to
 * rank — neither is checked before this function existed, so an OSM place could
 * silently get someone else's photo. Both are now rejected post-fetch: a
 * disambiguation hit, and any article whose title doesn't actually match the
 * queried place name (`looseMatch`, the same tolerant matcher already used to
 * grade must-see candidates against the knowledge pack).
 */
export async function enrichPlace(
  name: string,
  city: string,
  _category: PlaceCategory
): Promise<PlaceEnrichment> {
  const key = `wiki:${slugify(`${name} ${city}`)}`;
  return withCache<PlaceEnrichment>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "pageimages|extracts|pageprops",
        piprop: "thumbnail",
        pithumbsize: "600",
        ppprop: "disambiguation",
        exintro: "1",
        explaintext: "1",
        exsentences: "2",
        generator: "search",
        gsrsearch: `${name} ${city}`,
        gsrlimit: "1",
        redirects: "1",
        origin: "*",
      });
      const url = `https://en.wikipedia.org/w/api.php?${params}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: WIKI_HEADERS });
        if (!res.ok) throw new Error(`wiki ${res.status}`);
        const data = (await res.json()) as WikiResponse;
        const pages = data.query?.pages;
        if (!pages) return {};
        const page = Object.values(pages)[0];
        if (!page || !isMatchingArticle(name, page.title, page.pageprops)) return {};
        return {
          // Prefer the (smaller) thumbnail so it loads fast even on weak data.
          imageUrl: page?.thumbnail?.source ?? page?.original?.source,
          description: page?.extract,
        };
      } finally {
        clearTimeout(timer);
      }
    },
    (v) => !v.imageUrl && !v.description
  ).catch(() => ({} as PlaceEnrichment));
}

/** Curated key-less fallback photos per category (Unsplash CDN). Multiple per
 *  category so different places don't all share the exact same image. */
const CATEGORY_IMAGES: Record<PlaceCategory, string[]> = {
  monument: [
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500&q=70",
    "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=500&q=70",
    "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=500&q=70",
  ],
  museum: [
    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=500&q=70",
    "https://images.unsplash.com/photo-1565060169187-5284a3f72f0a?w=500&q=70",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=500&q=70",
  ],
  gallery: [
    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=500&q=70",
    "https://images.unsplash.com/photo-1565060169187-5284a3f72f0a?w=500&q=70",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=500&q=70",
  ],
  attraction: [
    "https://images.unsplash.com/photo-1493707553966-283afac8c358?w=500&q=70",
    "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=500&q=70",
    "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=500&q=70",
  ],
  sports: [
    "https://images.unsplash.com/photo-1493707553966-283afac8c358?w=500&q=70",
    "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=500&q=70",
    "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?w=500&q=70",
  ],
  landmark: [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&q=70",
    "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=500&q=70",
    "https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=500&q=70",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=70",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=70",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=70",
    "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=500&q=70",
  ],
  cafe: [
    "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=500&q=70",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=70",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=70",
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=70",
    "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=500&q=70",
  ],
  park: [
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&q=70",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&q=70",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500&q=70",
  ],
  wellness: [
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&q=70",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=500&q=70",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500&q=70",
  ],
  viewpoint: [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&q=70",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&q=70",
  ],
  nightlife: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=70",
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=500&q=70",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=70",
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=500&q=70",
  ],
  shopping: [
    "https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=500&q=70",
    "https://images.unsplash.com/photo-1567958451986-2de427a4a0be?w=500&q=70",
  ],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic per-place fallback photo (varies by name to avoid duplicates). */
export function categoryImage(category: PlaceCategory, seed = ""): string {
  const arr = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.attraction;
  return arr[hash(category + seed) % arr.length];
}

interface CommonsResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: { url?: string; thumburl?: string; mediatype?: string; width?: number }[];
      }
    >;
  };
}

/**
 * Real, geo-tagged photo taken AT a place, via Wikimedia Commons geosearch
 * (key-less). Given coordinates it finds nearby uploaded photos and returns the
 * best one's thumbnail — so even venues without a Wikipedia article get a real
 * on-location image instead of a generic stock photo. Cached by rounded coords.
 */
export async function commonsPhotoNear(
  lat: number,
  lng: number
): Promise<string | undefined> {
  const key = `commons:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  return withCache<string | undefined>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        generator: "geosearch",
        ggscoord: `${lat}|${lng}`,
        ggsradius: "500",
        ggslimit: "12",
        ggsnamespace: "6", // File: namespace
        prop: "imageinfo",
        iiprop: "url|mediatype|size",
        iiurlwidth: "600",
        origin: "*",
      });
      const url = `https://commons.wikimedia.org/w/api.php?${params}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: WIKI_HEADERS });
        if (!res.ok) return undefined;
        const data = (await res.json()) as CommonsResponse;
        const pages = Object.values(data.query?.pages ?? {});
        // Keep real bitmap photos only (skip SVGs, maps, icons, tiny files).
        const photo = pages
          .map((p) => p.imageinfo?.[0])
          .find(
            (ii) =>
              ii?.mediatype === "BITMAP" &&
              (ii.thumburl ?? ii.url) &&
              /\.(jpe?g|png)$/i.test(ii.url ?? "") &&
              (ii.width ?? 0) >= 400
          );
        return photo?.thumburl ?? photo?.url;
      } catch {
        return undefined;
      } finally {
        clearTimeout(timer);
      }
    }
  ).catch(() => undefined);
}

interface WikiSummary {
  type?: string;
  title?: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
}

/** Real hero photo for a city (Wikipedia). Returns undefined if none found —
 *  callers should fall back to a gradient, NOT a generic city stock photo.
 *  Tries the REST summary first (clean lead image), then a pageimages search
 *  fallback — so a city whose summary happens to lack a thumbnail still gets a
 *  real photo instead of an empty gradient. */
export async function cityHeroImage(city: string): Promise<string | undefined> {
  // Use just the city name (drop ", Country") for the Wikipedia title.
  const name = city.split(",")[0].trim();
  const key = `cityimg:${slugify(name)}`;
  return withCache<string | undefined>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const restImg = await cityHeroFromSummary(name);
      if (restImg) return restImg;
      // Fallback: the search+pageimages API finds a lead image even when the
      // REST summary returns none (or the title needed disambiguation).
      return cityHeroFromSearch(name);
    },
    (v) => !v
  ).catch(() => undefined);
}

async function cityHeroFromSummary(name: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // REST summary resolves the exact article (with redirects) reliably.
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { signal: controller.signal, headers: WIKI_HEADERS }
    );
    if (res.ok) {
      const s = (await res.json()) as WikiSummary;
      if (s.type !== "disambiguation") {
        // Thumbnail first — the original can be many MB and stall on slow data.
        return s.thumbnail?.source ?? s.originalimage?.source;
      }
    }
  } catch {
    // fall through
  } finally {
    clearTimeout(timer);
  }
  return undefined;
}

async function cityHeroFromSearch(name: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "1000",
    generator: "search",
    gsrsearch: `${name} city`,
    gsrlimit: "1",
    redirects: "1",
    origin: "*",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      signal: controller.signal,
      headers: WIKI_HEADERS,
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as WikiResponse;
    const page = Object.values(data.query?.pages ?? {})[0];
    return page?.thumbnail?.source ?? page?.original?.source;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
