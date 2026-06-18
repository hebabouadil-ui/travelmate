import type { DestinationMatch, Interest, TravelProfile } from "./types";
import { SEED_CITIES } from "./data/seed";
import { clamp } from "./utils";

/** Per-city interest affinities (0..1) used by the match score engine. */
const TRAITS: Record<string, Partial<Record<Interest, number>>> = {
  barcelona: { architecture: 1, beaches: 0.9, food: 0.9, nightlife: 0.8, museums: 0.7, monuments: 0.8 },
  tokyo: { food: 1, shopping: 0.9, museums: 0.8, nightlife: 0.8, photography: 0.9, architecture: 0.7 },
  marrakech: { monuments: 0.9, shopping: 1, food: 0.8, architecture: 0.8, photography: 0.9 },
  paris: { museums: 1, architecture: 1, food: 0.9, monuments: 0.9, shopping: 0.8 },
  rome: { monuments: 1, museums: 0.9, architecture: 1, food: 0.9 },
  dubai: { shopping: 1, beaches: 0.8, nightlife: 0.7, architecture: 0.9, food: 0.7 },
  london: { museums: 1, monuments: 0.8, shopping: 0.9, nightlife: 0.8, food: 0.8 },
  "new york": { museums: 0.9, shopping: 0.9, nightlife: 0.9, food: 0.9, architecture: 0.8, photography: 0.8 },
};

/**
 * Score every seed destination against the traveller profile and explain why.
 * Free, deterministic, and runs instantly — no API calls.
 */
export function matchDestinations(profile: Partial<TravelProfile>): DestinationMatch[] {
  const interests = profile.interests ?? [];
  const results = Object.entries(SEED_CITIES).map(([key, city]) => {
    const traits = TRAITS[key] ?? {};
    let raw = 0.55; // base appeal
    const hits: string[] = [];
    for (const interest of interests) {
      const affinity = traits[interest] ?? 0.2;
      raw += affinity * 0.12;
      if (affinity >= 0.8) hits.push(interest);
    }
    // small randomized-but-stable spread for realism
    const score = Math.round(clamp(raw, 0.4, 0.99) * 100);
    return {
      name: city.name,
      country: city.country,
      score,
      image: city.image,
      center: city.center,
      reason: buildReason(city.name, hits, interests),
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

function buildReason(name: string, hits: string[], interests: Interest[]): string {
  if (hits.length === 0 && interests.length === 0) {
    return `${name} is a crowd-pleaser with something for every kind of traveller.`;
  }
  if (hits.length === 0) {
    return `${name} offers a balanced mix across your interests.`;
  }
  const top = hits.slice(0, 3).join(", ");
  return `Strong match for ${top} — ${name} is one of the best in the world for it.`;
}
