import type { Place } from "../types";
import { enrichPlace } from "./wikipedia";
import { foursquarePhoto } from "./foursquare";
import { firstDisplayableImage, toHttps } from "./imageValidation";

const VENUE_CATEGORIES = ["restaurant", "cafe", "nightlife", "shopping"];

export interface StopMedia {
  /** A real, subject-matched, VALIDATED photo (exists, HTTPS, real image).
   *  Undefined means "show a placeholder" — we never return a generic stock or
   *  geo-nearby (possibly-wrong) image, and never an unvalidated URL. */
  imageUrl?: string;
  description?: string;
}

/**
 * Resolve the EXACT photo for a place, or nothing — and guarantee it actually
 * displays. Two real sources are trusted, tried in the order that fits the
 * place's kind, plus any photo the place already carries (e.g. a curated or
 * Foursquare-search image):
 *
 *   - Foursquare venue photo (matched by name + location) — primary for
 *     restaurants/cafés/bars/shops.
 *   - Wikipedia article photo — primary for landmarks/museums/parks — gated by
 *     `isMatchingArticle` so it's the right subject, not a topic the search
 *     merely ranked.
 *
 * EVERY candidate is run through the Image Validator (`firstDisplayableImage`):
 * HTTPS-only, must exist (HTTP 2xx), must be a real `image/*`. The first that
 * passes wins; if none do, we return no image and the UI shows a clean
 * placeholder. This is the fix for "many attractions display broken images":
 * a 404, an HTML error page, a login redirect or a cleartext URL can no longer
 * reach a card.
 */
export async function resolveStopMedia(place: Place, city: string): Promise<StopMedia> {
  const venueFirst = VENUE_CATEGORIES.includes(place.category);
  const [fsq, wiki] = await Promise.all([
    foursquarePhoto(place.name, { lat: place.lat, lng: place.lng }).catch(() => undefined),
    enrichPlace(place.name, city, place.category).catch(
      () => ({} as { imageUrl?: string; description?: string })
    ),
  ]);

  const existing = toHttps(place.imageUrl);
  const ordered = venueFirst
    ? [fsq, existing, wiki.imageUrl]
    : [existing, wiki.imageUrl, fsq];

  const imageUrl = await firstDisplayableImage(ordered);
  return { imageUrl, description: wiki.description };
}
