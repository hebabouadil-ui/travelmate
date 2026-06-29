import { useEffect, useState } from "react";
import { destinationHeroImage } from "./data/heroImage";

/**
 * Resolve a destination's hero photo: a static/seed URL when we have one,
 * otherwise a real, on-topic photo fetched at view time (the #1 must-see
 * landmark, then the city's article image). Returns undefined while loading or
 * when nothing relevant is found — the caller (SmartImage) then shows a clean
 * gradient. We never return a random or unrelated photo. `onResolved` fires
 * once with a freshly fetched URL so callers can persist it.
 */
export function useDestinationHero(
  staticUrl: string | undefined,
  destination: string,
  country?: string,
  onResolved?: (url: string) => void
): string | undefined {
  const [uri, setUri] = useState<string | undefined>(staticUrl);

  useEffect(() => {
    if (staticUrl) {
      setUri(staticUrl);
      return;
    }
    setUri(undefined);
    if (!destination.trim()) return;
    let alive = true;
    destinationHeroImage(destination, country)
      .then((url) => {
        if (alive && url) {
          setUri(url);
          onResolved?.(url);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // onResolved excluded on purpose — stable intent, not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticUrl, destination, country]);

  return uri;
}
