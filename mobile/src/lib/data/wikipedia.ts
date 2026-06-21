import { withCache } from "../cache";
import { slugify } from "../utils";
import type { PlaceCategory } from "../types";

interface WikiResponse {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        extract?: string;
        thumbnail?: { source: string };
        original?: { source: string };
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
 * city) and returns a high-quality image + a short description. Cached for
 * offline reuse. Falls back to a category photo when no article is found.
 */
export async function enrichPlace(
  name: string,
  city: string,
  category: PlaceCategory
): Promise<PlaceEnrichment> {
  const key = `wiki:${slugify(`${name} ${city}`)}`;
  const fromWiki = await withCache<PlaceEnrichment>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        prop: "pageimages|extracts",
        piprop: "original|thumbnail",
        pithumbsize: "900",
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
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`wiki ${res.status}`);
        const data = (await res.json()) as WikiResponse;
        const pages = data.query?.pages;
        if (!pages) return {};
        const page = Object.values(pages)[0];
        return {
          imageUrl: page?.original?.source ?? page?.thumbnail?.source,
          description: page?.extract,
        };
      } finally {
        clearTimeout(timer);
      }
    },
    (v) => !v.imageUrl && !v.description
  ).catch(() => ({} as PlaceEnrichment));

  if (fromWiki.imageUrl) return fromWiki;
  return { imageUrl: categoryImage(category), description: fromWiki.description };
}

/** Curated key-less fallback photos per category (Unsplash CDN). */
const CATEGORY_IMAGE: Record<PlaceCategory, string> = {
  monument: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80",
  museum: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80",
  attraction: "https://images.unsplash.com/photo-1493707553966-283afac8c358?w=800&q=80",
  landmark: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  cafe: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  park: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80",
  viewpoint: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  nightlife: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  shopping: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=800&q=80",
};

export function categoryImage(category: PlaceCategory): string {
  return CATEGORY_IMAGE[category] ?? CATEGORY_IMAGE.attraction;
}
