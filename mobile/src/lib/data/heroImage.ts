import { withCache } from "../cache";
import { slugify } from "../utils";
import { generateHeroImage } from "../ai/geminiImage";
import { cityHeroImage } from "./wikipedia";

/**
 * The ONE premium hero photo for a destination page. Tries, in order: a
 * Gemini-generated cityscape/landmark photo (when a key is configured), then
 * a real Wikipedia city photo, then undefined — callers render a gradient in
 * that last case, never a broken image. Cached for 30 days per destination so
 * the (slow, paid-tier) Gemini call runs at most once per destination, not
 * once per generated trip.
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
      return cityHeroImage(destination);
    },
    (v) => !v
  ).catch(() => undefined);
}
