import { useEffect, useMemo, useState } from "react";
import { destinationHeroImage } from "./data/heroImage";
import { categoryImage } from "./data/wikipedia";
import type { GeoPoint } from "./types";

export interface HeroImage {
  /** Best real photo we have (a static/seed URL, or one fetched at view time).
   *  May be undefined while loading or if every live source failed. */
  uri?: string;
  /** A guaranteed real-travel-photo fallback from the bundled CDN pool, tried
   *  by SmartImage if `uri` fails — and if even this fails, SmartImage shows a
   *  clean gradient, never a broken image. */
  fallback: string;
}

/**
 * Resolve a destination hero image as a {uri, fallback} pair for SmartImage.
 *
 * - `uri`: a static/seed photo when we have one, otherwise a real photo fetched
 *   at view time (Wikipedia article → must-see landmark → Commons geosearch).
 * - `fallback`: a real travel photo from our bundled pool, shown immediately and
 *   whenever `uri` is missing or fails to load.
 *
 * The point: the hero NEVER appears broken. Real city photo when any source is
 * reachable; a generic travel photo otherwise; a gradient only if even that
 * can't load. `onResolved` fires once with a freshly fetched URL so callers can
 * persist it.
 */
export function useDestinationHero(
  staticUrl: string | undefined,
  destination: string,
  country?: string,
  center?: GeoPoint,
  onResolved?: (url: string) => void
): HeroImage {
  const fallback = useMemo(() => {
    const base = categoryImage("attraction", destination || country || "city");
    return base.replace(/w=\d+/, "w=1200").replace(/q=\d+/, "q=80");
  }, [destination, country]);

  const [uri, setUri] = useState<string | undefined>(staticUrl);

  useEffect(() => {
    if (staticUrl) {
      setUri(staticUrl);
      return;
    }
    setUri(undefined);
    if (!destination.trim()) return;
    let alive = true;
    destinationHeroImage(destination, country, center)
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
  }, [staticUrl, destination, country, center?.lat, center?.lng]);

  return { uri, fallback };
}
