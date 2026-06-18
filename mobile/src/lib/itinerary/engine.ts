import type {
  Daypart,
  Interest,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  PlaceCategory,
  TripRequest,
} from "../types";
import { addDays, haversineKm, makeId, walkingMinutes } from "../utils";
import { geocode } from "../data/geocode";
import { discoverPlaces } from "../data/places";
import { getWeather } from "../data/weather";
import { clusterIntoDays, nearestWhere, optimizeRoute } from "./optimize";
import { dailyTransport, stopCost } from "./budget";
import { getProvider, extractJson } from "../ai/provider";
import { CONCIERGE_SYSTEM, buildEnrichmentPrompt } from "../ai/prompts";

const FOOD_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe"];

const INTEREST_BOOST: Record<Interest, PlaceCategory[]> = {
  monuments: ["monument", "landmark"],
  museums: ["museum"],
  beaches: ["beach"],
  nature: ["park", "viewpoint", "beach"],
  food: ["restaurant", "cafe"],
  architecture: ["landmark", "monument", "attraction"],
  shopping: ["shopping"],
  photography: ["viewpoint", "landmark"],
  nightlife: ["nightlife"],
};

const DURATION: Record<PlaceCategory, number> = {
  museum: 90,
  monument: 60,
  attraction: 75,
  landmark: 45,
  park: 60,
  beach: 90,
  viewpoint: 30,
  restaurant: 75,
  cafe: 40,
  nightlife: 90,
  shopping: 60,
};

function sightsPerDay(activity?: string): number {
  if (activity === "relaxed") return 2;
  if (activity === "intensive") return 4;
  return 3;
}

/** Main entry point: produce a complete, optimized, narrated itinerary. */
export async function generateItinerary(req: TripRequest): Promise<Itinerary> {
  const geo = await geocode(req.destination);
  const center = geo.center;

  const [allPlaces, weather] = await Promise.all([
    discoverPlaces(req.destination, center),
    getWeather(center, req.startDate, req.days),
  ]);

  const scored = scorePlaces(
    allPlaces,
    req.interests,
    req.profile?.foodPreference
  );
  const sights = scored.filter((p) => !isFood(p) && p.category !== "nightlife");
  const food = scored.filter((p) => isFood(p));

  const perDay = sightsPerDay(req.profile?.activityLevel);
  const wantsEvening =
    req.profile?.activityLevel === "intensive" ||
    req.interests.includes("nightlife") ||
    req.profile?.travelerType === "couple";

  const clusters = clusterIntoDays(sights, req.days, perDay);
  const usedFood = new Set<string>();

  const days: ItineraryDay[] = clusters.map((group, idx) => {
    const day = idx + 1;
    const ordered = optimizeRoute(group, center);
    const stops = buildStops(
      ordered,
      food,
      scored,
      center,
      usedFood,
      req,
      wantsEvening
    );
    const estimatedCost =
      stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
      dailyTransport(req.budget);
    return {
      day,
      date: addDays(req.startDate, idx),
      title: `Day ${day}`,
      summary: "",
      stops,
      estimatedCost,
      weather: weather[idx],
    };
  });

  await narrate(req, days);

  const totalEstimatedCost = days.reduce((s, d) => s + d.estimatedCost, 0);
  const provider = getProvider();

  return {
    id: makeId("trip"),
    destination: geo.name,
    center,
    days,
    profile: req.profile ?? {},
    totalEstimatedCost,
    currency: "EUR",
    createdAt: new Date().toISOString(),
    engine: provider.isLive ? "gemini" : "mock",
  };
}

function isFood(p: Place): boolean {
  return FOOD_CATEGORIES.includes(p.category);
}

/** Boost places matching the traveller's interests + food preference. */
function scorePlaces(
  places: Place[],
  interests: Interest[],
  foodPref?: string
): Place[] {
  const boosted = new Set<PlaceCategory>();
  interests.forEach((i) => INTEREST_BOOST[i]?.forEach((c) => boosted.add(c)));

  return places
    .map((p) => {
      let score = p.score ?? 0.5;
      if (boosted.has(p.category)) score += 0.35;
      if (p.hiddenGem) score += 0.08; // gentle nudge toward authentic spots
      if (
        isFood(p) &&
        foodPref &&
        foodPref !== "none" &&
        p.tags?.includes(foodPref)
      ) {
        score += 0.3;
      }
      return { ...p, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function buildStops(
  ordered: Place[],
  food: Place[],
  pool: Place[],
  center: { lat: number; lng: number },
  usedFood: Set<string>,
  req: TripRequest,
  wantsEvening: boolean
): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  const anchor = ordered[0] ?? center;

  const push = (place: Place, daypart: Daypart) => {
    const prev = stops[stops.length - 1]?.place;
    const km = prev ? haversineKm(prev, place) : 0;
    const mode: ItineraryStop["travelMode"] =
      km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    stops.push({
      daypart,
      place,
      durationMin: DURATION[place.category] ?? 60,
      travelFromPrevMin: prev
        ? mode === "walk"
          ? walkingMinutes(km)
          : Math.max(8, Math.round((km / (mode === "transit" ? 18 : 30)) * 60))
        : 0,
      travelMode: prev ? mode : undefined,
      estimatedCost: stopCost(place.category, req.budget),
    });
  };

  // Morning sight
  if (ordered[0]) push(ordered[0], "morning");

  // Lunch near the morning area
  const lunch = nearestWhere(
    anchor,
    food,
    (p) => p.category === "restaurant",
    usedFood
  );
  if (lunch) {
    usedFood.add(lunch.id);
    push(lunch, "lunch");
  }

  // Afternoon sights (the rest of the cluster)
  ordered.slice(1).forEach((s) => push(s, "afternoon"));

  const last = ordered[ordered.length - 1] ?? anchor;

  // Dinner near the last sight
  const dinner = nearestWhere(
    last,
    food,
    (p) => p.category === "restaurant",
    usedFood
  );
  if (dinner) {
    usedFood.add(dinner.id);
    push(dinner, "dinner");
  }

  // Optional evening: nightlife or a scenic viewpoint
  if (wantsEvening) {
    const evening = nearestWhere(
      last,
      pool,
      (p) => p.category === "nightlife" || p.category === "viewpoint",
      usedFood
    );
    if (evening) {
      usedFood.add(evening.id);
      push(evening, "evening");
    }
  }

  return stops;
}

/**
 * Enrich the structural plan with concierge narration. Uses the live AI
 * provider when available; otherwise falls back to grounded templates so the
 * output is always polished and free.
 */
async function narrate(req: TripRequest, days: ItineraryDay[]): Promise<void> {
  const provider = getProvider();

  if (provider.isLive) {
    try {
      const input = days.map((d) => ({
        day: d.day,
        stops: d.stops.map((s) => ({
          daypart: s.daypart,
          name: s.place.name,
          category: s.place.category,
          hiddenGem: s.place.hiddenGem,
          cuisine: s.place.cuisine,
        })),
      }));
      const raw = await provider.complete(
        [
          { role: "system", content: CONCIERGE_SYSTEM },
          { role: "user", content: buildEnrichmentPrompt(req, input) },
        ],
        { json: true, temperature: 0.85 }
      );
      const parsed = extractJson<{
        days: {
          day: number;
          title: string;
          summary: string;
          stops: { name: string; note: string }[];
        }[];
      }>(raw);
      if (parsed.days?.length) {
        applyNarration(days, parsed.days);
        return;
      }
    } catch {
      // fall through to templates
    }
  }

  templateNarration(req, days);
}

function applyNarration(
  days: ItineraryDay[],
  narrated: {
    day: number;
    title: string;
    summary: string;
    stops: { name: string; note: string }[];
  }[]
) {
  for (const d of days) {
    const n = narrated.find((x) => x.day === d.day);
    if (!n) continue;
    if (n.title) d.title = n.title;
    if (n.summary) d.summary = n.summary;
    for (const stop of d.stops) {
      const match = n.stops?.find(
        (s) => s.name.toLowerCase() === stop.place.name.toLowerCase()
      );
      if (match?.note) stop.note = match.note;
    }
  }
}

const TITLES = [
  "Icons & first impressions",
  "Hidden corners & local flavor",
  "Culture, parks & golden hour",
  "Neighborhoods & authentic bites",
  "Views, markets & slow mornings",
  "Coast, calm & city lights",
];

function templateNarration(req: TripRequest, days: ItineraryDay[]): void {
  days.forEach((d, i) => {
    d.title = TITLES[i % TITLES.length];
    const headline = d.stops[0]?.place.name;
    d.summary = headline
      ? `Explore ${req.destination} around ${headline}, with stops grouped to keep walking short.`
      : `A relaxed day discovering ${req.destination}.`;
    for (const stop of d.stops) {
      if (stop.note) continue;
      stop.note = noteFor(stop);
    }
  });
}

function noteFor(stop: ItineraryStop): string {
  const p = stop.place;
  switch (p.category) {
    case "restaurant":
      return p.cuisine
        ? `Local ${p.cuisine} — book ahead at peak times.`
        : "A well-loved local table.";
    case "cafe":
      return "A great spot to recharge with good coffee.";
    case "museum":
      return "Allow time for the highlights; mornings are quieter.";
    case "monument":
      return "Iconic landmark — arrive early to beat the crowds.";
    case "viewpoint":
      return "Best near golden hour for photos.";
    case "park":
      return "Easy green break between sights.";
    case "beach":
      return "Bring sunscreen and water; lovely at sunset.";
    case "nightlife":
      return "Wind down the day with the local night scene.";
    default:
      return p.hiddenGem ? "A local favorite, off the usual trail." : "Worth a wander.";
  }
}

/**
 * Recompute a single day's route, travel times and cost after a stop is
 * removed — powering the DYNAMIC itinerary editing experience on-device.
 */
export function recomputeDay(
  day: ItineraryDay,
  center: { lat: number; lng: number },
  budget: TripRequest["budget"]
): ItineraryDay {
  // Keep daypart anchors (lunch/dinner) but re-derive travel legs in order.
  const stops = day.stops.map((s) => ({ ...s }));
  for (let i = 0; i < stops.length; i++) {
    const prev = stops[i - 1]?.place;
    const cur = stops[i].place;
    if (!prev) {
      stops[i].travelFromPrevMin = 0;
      stops[i].travelMode = undefined;
      continue;
    }
    const km = haversineKm(prev, cur);
    const mode: ItineraryStop["travelMode"] =
      km < 1.8 ? "walk" : km < 8 ? "transit" : "taxi";
    stops[i].travelMode = mode;
    stops[i].travelFromPrevMin =
      mode === "walk"
        ? walkingMinutes(km)
        : Math.max(8, Math.round((km / (mode === "transit" ? 18 : 30)) * 60));
  }
  const estimatedCost =
    stops.reduce((s, st) => s + (st.estimatedCost ?? 0), 0) +
    dailyTransport(budget);
  return { ...day, stops, estimatedCost };
}
