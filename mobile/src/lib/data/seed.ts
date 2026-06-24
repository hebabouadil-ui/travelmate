import type { GeoPoint } from "../types";

/**
 * Curated fallback data so the product always works — even with no API keys
 * and even if Overpass/Nominatim are slow or rate-limited. Covers the headline
 * destinations from the product brief.
 */
export interface SeedCity {
  name: string;
  country: string;
  center: GeoPoint;
  /** Absent when we don't have a verified-working photo URL on hand — the UI
   *  falls back to a clean placeholder rather than risk a broken image. */
  image?: string;
}

export const SEED_CITIES: Record<string, SeedCity> = {
  barcelona: {
    name: "Barcelona",
    country: "Spain",
    center: { lat: 41.3874, lng: 2.1686 },
    image:
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80",
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    center: { lat: 35.6762, lng: 139.6503 },
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
  },
  marrakech: {
    name: "Marrakech",
    country: "Morocco",
    center: { lat: 31.6295, lng: -7.9811 },
    image:
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=1200&q=80",
  },
  paris: {
    name: "Paris",
    country: "France",
    center: { lat: 48.8566, lng: 2.3522 },
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  },
  rome: {
    name: "Rome",
    country: "Italy",
    center: { lat: 41.9028, lng: 12.4964 },
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80",
  },
  dubai: {
    name: "Dubai",
    country: "UAE",
    center: { lat: 25.2048, lng: 55.2708 },
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",
  },
  london: {
    name: "London",
    country: "United Kingdom",
    center: { lat: 51.5074, lng: -0.1278 },
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
  },
  "new york": {
    name: "New York",
    country: "United States",
    center: { lat: 40.7128, lng: -74.006 },
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80",
  },
  casablanca: {
    name: "Casablanca",
    country: "Morocco",
    center: { lat: 33.5731, lng: -7.5898 },
  },
};

export function findSeedCity(query: string): SeedCity | undefined {
  const key = query.trim().toLowerCase();
  if (SEED_CITIES[key]) return SEED_CITIES[key];
  // partial match (e.g. "barcelona, spain")
  const hit = Object.entries(SEED_CITIES).find(
    ([k, v]) => key.includes(k) || key.includes(v.name.toLowerCase())
  );
  return hit?.[1];
}
