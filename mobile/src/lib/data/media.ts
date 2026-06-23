import type { Place } from "../types";
import { enrichPlace } from "./wikipedia";
import { foursquarePhoto } from "./foursquare";

const VENUE_CATEGORIES = ["restaurant", "cafe", "nightlife", "shopping"];

export interface StopMedia {
  /** A real, subject-matched photo. Undefined means "show a placeholder" — we
   *  NEVER return a generic stock or geo-nearby (possibly-wrong) image. */
  imageUrl?: string;
  description?: string;
}

/**
 * Resolve the EXACT photo for a place, or nothing. Only two sources are trusted:
 *
 *   - Foursquare venue photo (matched by name + location) — primary for
 *     restaurants/cafés/bars/shops.
 *   - Wikipedia article photo — primary for landmarks/museums/parks — gated by
 *     `isMatchingArticle` so it's the right subject, not a topic the search
 *     merely ranked.
 *
 * The old Commons "nearest geotagged photo" path was removed: it returned
 * photos of whatever happened to be near the coordinates (a frequent source of
 * WRONG images). The old category stock fallback was removed too: a generic
 * Unsplash photo is not this place. When neither real source yields a match we
 * return no image, and the UI shows a clean placeholder.
 */
export async function resolveStopMedia(place: Place, city: string): Promise<StopMedia> {
  const venueFirst = VENUE_CATEGORIES.includes(place.category);
  const [fsq, wiki] = await Promise.all([
    foursquarePhoto(place.name, { lat: place.lat, lng: place.lng }).catch(() => undefined),
    enrichPlace(place.name, city, place.category).catch(
      () => ({} as { imageUrl?: string; description?: string })
    ),
  ]);

  const order = venueFirst ? [fsq, wiki.imageUrl] : [wiki.imageUrl, fsq];
  const imageUrl = order.find((u): u is string => Boolean(u));

  return { imageUrl, description: wiki.description };
}
