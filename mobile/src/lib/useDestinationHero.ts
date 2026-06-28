import { useEffect, useMemo, useState } from "react";
import { destinationHeroImage } from "./data/heroImage";
import { categoryImage } from "./data/wikipedia";
import type { GeoPoint } from "./types";

/**
 * Resolve a destination hero image, guaranteeing a real photo every time.
 *
 * Order of preference:
 *  1. A static URL we already have (a seed photo, or a trip's stored imageUrl).
 *  2. Otherwise show a real travel photo from our bundled, CDN-backed pool
 *     IMMEDIATELY (so a card is never blank), then…
 *  3. …try to upgrade to a city-specific photo at view time. If that live
 *     lookup succeeds we swap it in (and call `onResolved` so callers can
 *     persist it); if the device can't reach the photo source, the nice
 *     pool photo simply stays — never an empty gradient or broken glyph.
 *
 * This is deliberately resilient: the upgrade step uses Wikipedia, which isn't
 * reachable on every network, so we must never depend on it for *a* photo to
 * appear — only for a *better* one.
 */
export function useDestinationHero(
  staticUrl: string | undefined,
  destination: string,
  country?: string,
  center?: GeoPoint,
  onResolved?: (url: string) => void
): string | undefined {
  // A stable, real travel photo to show instantly when we have no static one.
  // Uses the generic "attraction" pool (neutral scenery, not a recognizable
  // monument that would look wrong for the wrong city) and upsizes it for a
  // crisp full-width hero. Seeded by name so cities don't all share one shot.
  const fallback = useMemo(() => {
    const base = categoryImage("attraction", destination || country || "city");
    return base.replace(/w=\d+/, "w=1200").replace(/q=\d+/, "q=80");
  }, [destination, country]);

  const [resolved, setResolved] = useState<string | undefined>(staticUrl || fallback);

  useEffect(() => {
    if (staticUrl) {
      setResolved(staticUrl);
      return;
    }
    // Show the pool photo right away, then try to upgrade to a real city shot.
    setResolved(fallback);
    if (!destination.trim()) return;
    let alive = true;
    destinationHeroImage(destination, country, center)
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
  }, [staticUrl, destination, country, center?.lat, center?.lng, fallback]);

  return resolved;
}
