import { withCache } from "../cache";
import { slugify } from "../utils";
import { generateHeroImage } from "../ai/geminiImage";
import { cityHeroImage, enrichPlace } from "./wikipedia";
import { getKnowledgePack } from "./knowledge";

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
  country?: string
): Promise<string | undefined> {
  const subject = country ? `${destination}, ${country}` : destination;
  const key = `herov2:${slugify(subject)}`;
  return withCache<string | undefined>(
    key,
    1000 * 60 * 60 * 24 * 30,
    async () => {
      const generated = await generateHeroImage(subject).catch(() => undefined);
      if (generated) return generated;

      const city = await cityHeroImage(destination);
      if (city) return city;

      // Last resort for a curated destination: its #1 must-see landmark photo.
      const pack = getKnowledgePack(destination);
      const landmark = pack?.mustSee?.[0];
      if (landmark) {
        const { imageUrl } = await enrichPlace(landmark, pack!.city, "landmark");
        if (imageUrl) return imageUrl;
      }
      return undefined;
    },
    (v) => !v
  ).catch(() => undefined);
}
