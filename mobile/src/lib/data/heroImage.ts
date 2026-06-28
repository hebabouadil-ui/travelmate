import { withCache } from "../cache";
import { slugify } from "../utils";
import { generateHeroImage } from "../ai/geminiImage";
import { cityHeroImage, enrichPlace, commonsPhotoNear } from "./wikipedia";
import { getKnowledgePack } from "./knowledge";
import type { GeoPoint } from "../types";

/**
 * The ONE premium hero photo for a destination page. Tries, in order: a
 * Gemini-generated cityscape/landmark photo (when a key is configured), a real
 * Wikipedia city photo, then — for a known destination — the photo of its top
 * must-see landmark (those articles almost always carry a great image, so a
 * city whose own article lacks a usable lead photo still gets a real, on-topic
 * hero). Returns undefined only when nothing is found; callers render a
 * gradient then, never a broken image. Cached 30 days per destination so the
 * (slow, paid-tier) Gemini call runs at most once per destination.
 */
export async function destinationHeroImage(
  destination: string,
  country?: string,
  center?: GeoPoint
): Promise<string | undefined> {
  const subject = country ? `${destination}, ${country}` : destination;
  const key = `herov2:${slugify(subject)}`;
  return withCache<string | undefined>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const generated = await generateHeroImage(subject).catch(() => undefined);
      if (generated) return generated;

      // 1) The city's own Wikipedia article photo (a clean cityscape lead image).
      const city = await cityHeroImage(destination);
      if (city) return city;

      // 2) For a curated destination, its #1 must-see landmark photo (iconic).
      const pack = getKnowledgePack(destination);
      const landmark = pack?.mustSee?.[0];
      if (landmark) {
        const { imageUrl } = await enrichPlace(landmark, pack!.city, "landmark");
        if (imageUrl) return imageUrl;
      }

      // 3) Any real geotagged photo uploaded at the city centre (Wikimedia
      //    Commons geosearch) — works for places without a tidy article image.
      if (center) {
        const near = await commonsPhotoNear(center.lat, center.lng);
        if (near) return near;
      }
      return undefined;
    },
    (v) => !v
  ).catch(() => undefined);
}
