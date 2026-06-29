import { withCache } from "../cache";
import { slugify } from "../utils";
import { generateHeroImage } from "../ai/geminiImage";
import { cityHeroImage, enrichPlace } from "./wikipedia";
import { getKnowledgePack } from "./knowledge";

/**
 * The ONE premium hero photo for a destination — guaranteed to be ABOUT this
 * place or nothing at all. Order:
 *   1. Gemini-generated cityscape (only when a key is configured).
 *   2. The destination's #1 must-see landmark photo (a clean, iconic single
 *      subject — preferred because Wikipedia *city* articles often lead with an
 *      ugly collage). Correct by construction for curated destinations.
 *   3. The city's own Wikipedia article lead image (skyline/cityscape).
 *
 * Returns undefined when none is found — the caller then renders a branded
 * gradient with the city name. We deliberately do NOT fall back to a random
 * geotagged photo or a generic stock image: a wrong/unrelated hero (a stranger's
 * selfie, another city) is worse than an elegant gradient.
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

      // The #1 must-see landmark — the most recognisable, on-topic hero.
      const pack = getKnowledgePack(destination);
      const landmark = pack?.mustSee?.[0];
      if (landmark) {
        const { imageUrl } = await enrichPlace(landmark, pack!.city, "landmark");
        if (imageUrl) return imageUrl;
      }

      // Else the city's own article photo (skyline/cityscape).
      const city = await cityHeroImage(destination);
      if (city) return city;

      return undefined; // caller → gradient; never a random/unrelated photo
    },
    (v) => !v
  ).catch(() => undefined);
}
