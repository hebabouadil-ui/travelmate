import type { Place } from "../types";
import { enrichPlace, categoryImage } from "./wikipedia";
import { foursquarePhoto } from "./foursquare";

const VENUE_CATEGORIES = ["restaurant", "cafe", "nightlife", "shopping"];

export interface StopMedia {
  imageUrl: string;
  description?: string;
}

/**
 * Resolve the best photo + description for a place:
 *  - venues (restaurants/cafés/bars/shops) → real Foursquare venue photo first;
 *  - landmarks/museums/parks → Wikipedia's iconic photo first;
 *  - always a category fallback so it's never blank.
 * Both sources run in parallel and results are cached.
 */
export async function resolveStopMedia(place: Place, city: string): Promise<StopMedia> {
  const [fsq, wiki] = await Promise.all([
    foursquarePhoto(place.name, { lat: place.lat, lng: place.lng }).catch(() => undefined),
    enrichPlace(place.name, city, place.category).catch(() => ({} as { imageUrl?: string; description?: string })),
  ]);

  const venueFirst = VENUE_CATEGORIES.includes(place.category);
  const imageUrl = venueFirst
    ? fsq || wiki.imageUrl || categoryImage(place.category, place.name)
    : wiki.imageUrl || fsq || categoryImage(place.category, place.name);

  return { imageUrl, description: wiki.description };
}
