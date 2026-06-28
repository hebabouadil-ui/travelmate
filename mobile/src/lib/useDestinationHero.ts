import { useEffect, useState } from "react";
import { destinationHeroImage } from "./data/heroImage";

/**
 * Resolve a destination hero image. When we already have a static URL (a seed
 * photo, or a trip's stored imageUrl) we use it as-is. Otherwise we fetch a
 * real photo at view time — a fresh attempt under the device's *current*
 * connectivity, so a hero that failed to resolve once (e.g. on weak data during
 * generation) recovers the next time the screen opens, instead of being stuck
 * on an empty gradient forever.
 *
 * Returns the static/resolved URL, or undefined while loading / when nothing is
 * found (the caller renders a gradient then — never a broken image). `onResolved`
 * fires once with a freshly fetched URL so callers can persist it.
 */
export function useDestinationHero(
  staticUrl: string | undefined,
  destination: string,
  country?: string,
  onResolved?: (url: string) => void
): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(staticUrl);

  useEffect(() => {
    if (staticUrl) {
      setResolved(staticUrl);
      return;
    }
    if (!destination.trim()) return;
    let alive = true;
    setResolved(undefined);
    destinationHeroImage(destination, country)
      .then((url) => {
        if (alive && url) {
          setResolved(url);
          onResolved?.(url);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // onResolved is intentionally excluded — it's a stable intent, not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticUrl, destination, country]);

  return resolved;
}
