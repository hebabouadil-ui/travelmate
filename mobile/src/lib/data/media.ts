import type { Place } from "../types";
import { enrichPlace, categoryImage, commonsPhotoNear } from "./wikipedia";
import { foursquarePhoto } from "./foursquare";

const VENUE_CATEGORIES = ["restaurant", "cafe", "nightlife", "shopping"];

export interface StopMedia {
  imageUrl: string;
  description?: string;
}

/**
 * Resolve the best REAL photo + description for a place, with a strict fallback
 * hierarchy so every card gets a distinct, on-topic image:
 *
 *   venues (restaurants/cafés/bars/shops):
 *     Foursquare venue photo → Wikipedia → Commons geo-photo → category (seeded)
 *   landmarks/museums/parks/etc.:
 *     Wikipedia article photo → Commons geo-photo → Foursquare → category (seeded)
 *
 * The category image is only the LAST resort and is seeded by the place name, so
 * two places never share the same stock photo. Real sources run in parallel; the
 * hierarchy just decides which result wins.
 */
export async function resolveStopMedia(place: Place, city: string): Promise<StopMedia> {
  const [fsq, wiki, commons] = await Promise.all([
    foursquarePhoto(place.name, { lat: place.lat, lng: place.lng }).catch(() => undefined),
    enrichPlace(place.name, city, place.category).catch(
      () => ({} as { imageUrl?: string; description?: string })
    ),
    commonsPhotoNear(place.lat, place.lng).catch(() => undefined),
  ]);

  const venueFirst = VENUE_CATEGORIES.includes(place.category);
  const order = venueFirst
    ? [fsq, wiki.imageUrl, commons]
    : [wiki.imageUrl, commons, fsq];

  const imageUrl =
    order.find((u): u is string => Boolean(u)) ??
    categoryImage(place.category, place.name);

  return { imageUrl, description: wiki.description };
}
