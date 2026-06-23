import type { Budget, GeoPoint, TravelMode } from "../types";
import { withCache } from "../cache";
import { haversineKm } from "../utils";
import { decideTravelMode, legDurationMin } from "../itinerary/optimize";

interface OSRMResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: { coordinates: [number, number][] };
    legs?: { distance: number; duration: number }[];
  }[];
}

export interface LegInfo {
  distanceKm: number;
  durationMin: number;
  mode: TravelMode;
}

export interface DayRoute {
  legs: LegInfo[];
  /** Street-following polyline for the whole day (lat/lng points). */
  geometry: GeoPoint[];
}

const OSRM = "https://router.project-osrm.org/route/v1";

/** Choose a realistic travel mode from the road distance of a leg, tiered by
 *  budget and aware of cumulative walking fatigue (see `decideTravelMode`). */
export function decideMode(
  distanceKm: number,
  budget: Budget = "medium",
  walkedSoFarKm = 0
): TravelMode {
  return decideTravelMode(distanceKm, budget, walkedSoFarKm);
}

/**
 * Compute a realistic, street-following route through the day's stops using the
 * free OSRM API with the WALKING profile (so paths stay pedestrian-accessible —
 * no motorways/non-walkable bridges). One request per day; cached. Falls back to
 * straight-line haversine if the service is unavailable, so plans never break.
 */
export async function dayRoute(points: GeoPoint[], budget: Budget = "medium"): Promise<DayRoute> {
  if (points.length < 2) {
    return { legs: [], geometry: points };
  }
  const key =
    `route:${budget}:` + points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");

  return withCache<DayRoute>(
    key,
    1000 * 60 * 60 * 24 * 14,
    async () => {
      const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
      const url = `${OSRM}/foot/${coords}?overview=full&geometries=geojson&annotations=false&steps=false`;
      try {
        const data = await fetchOSRM(url);
        const route = data.routes?.[0];
        if (route?.legs?.length) {
          let walkedKm = 0;
          const legs: LegInfo[] = route.legs.map((leg) => {
            const km = leg.distance / 1000;
            const mode = decideMode(km, budget, walkedKm);
            if (mode === "walk") walkedKm += km;
            return {
              distanceKm: Math.round(km * 100) / 100,
              durationMin: legDurationMin(km, mode, leg.duration),
              mode,
            };
          });
          const geometry: GeoPoint[] =
            route.geometry?.coordinates.map(([lng, lat]) => ({ lat, lng })) ?? points;
          return { legs, geometry };
        }
      } catch {
        // fall through to haversine
      }
      return haversineFallback(points, budget);
    },
    (v) => v.legs.length === 0
  ).catch(() => haversineFallback(points, budget));
}

function haversineFallback(points: GeoPoint[], budget: Budget = "medium"): DayRoute {
  const legs: LegInfo[] = [];
  let walkedKm = 0;
  for (let i = 1; i < points.length; i++) {
    const km = haversineKm(points[i - 1], points[i]);
    const mode = decideMode(km, budget, walkedKm);
    if (mode === "walk") walkedKm += km;
    legs.push({
      distanceKm: Math.round(km * 100) / 100,
      durationMin: legDurationMin(km, mode),
      mode,
    });
  }
  return { legs, geometry: points };
}

async function fetchOSRM(url: string): Promise<OSRMResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    return (await res.json()) as OSRMResponse;
  } finally {
    clearTimeout(timer);
  }
}
