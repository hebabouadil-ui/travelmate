import type { GeoPoint, TravelMode } from "../types";
import { withCache } from "../cache";
import { haversineKm, walkingMinutes } from "../utils";

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

/** Choose a realistic travel mode from the road distance of a leg. */
export function decideMode(distanceKm: number): TravelMode {
  if (distanceKm <= 1.8) return "walk";
  if (distanceKm <= 12) return "transit";
  return "taxi";
}

function legDuration(distanceKm: number, mode: TravelMode, walkSec?: number): number {
  if (mode === "walk") return walkSec ? Math.round(walkSec / 60) : walkingMinutes(distanceKm);
  const speed = mode === "transit" ? 20 : 35; // km/h
  return Math.max(6, Math.round((distanceKm / speed) * 60));
}

/**
 * Compute a realistic, street-following route through the day's stops using the
 * free OSRM API with the WALKING profile (so paths stay pedestrian-accessible —
 * no motorways/non-walkable bridges). One request per day; cached. Falls back to
 * straight-line haversine if the service is unavailable, so plans never break.
 */
export async function dayRoute(points: GeoPoint[]): Promise<DayRoute> {
  if (points.length < 2) {
    return { legs: [], geometry: points };
  }
  const key =
    "route:" + points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");

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
          const legs: LegInfo[] = route.legs.map((leg, i) => {
            const km = leg.distance / 1000;
            const mode = decideMode(km);
            return {
              distanceKm: Math.round(km * 100) / 100,
              durationMin: legDuration(km, mode, leg.duration),
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
      return haversineFallback(points);
    },
    (v) => v.legs.length === 0
  ).catch(() => haversineFallback(points));
}

function haversineFallback(points: GeoPoint[]): DayRoute {
  const legs: LegInfo[] = [];
  for (let i = 1; i < points.length; i++) {
    const km = haversineKm(points[i - 1], points[i]);
    const mode = decideMode(km);
    legs.push({
      distanceKm: Math.round(km * 100) / 100,
      durationMin: legDuration(km, mode),
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
