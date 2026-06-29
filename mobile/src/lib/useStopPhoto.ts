import { useEffect, useState } from "react";
import type { Place } from "./types";
import { resolveStopMedia } from "./data/media";

/**
 * Lazily resolve a real, place-specific photo for an itinerary stop the first
 * time its card appears. Day-1 stops are already resolved during generation;
 * this covers later days and any stragglers, and caches the result back onto
 * the place so it sticks (and persists with a saved trip). Returns the photo
 * URL, or undefined while loading / when none is found (the card then shows a
 * category badge — never a broken or unrelated image).
 */
export function useStopPhoto(place: Place, city: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>(
    place.photoResolved && place.imageUrl ? place.imageUrl : undefined
  );

  useEffect(() => {
    if (place.photoResolved && place.imageUrl) {
      setUrl(place.imageUrl);
      return;
    }
    let alive = true;
    resolveStopMedia(place, city)
      .then((m) => {
        if (alive && m.imageUrl) {
          place.imageUrl = m.imageUrl;
          place.photoResolved = true;
          setUrl(m.imageUrl);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id, city]);

  return url;
}
