// ─────────────────────────────────────────────────────────────
// Voyage AI — shared domain types (ported from web, unchanged shape)
// ─────────────────────────────────────────────────────────────

export type TravelerType =
  | "explorer"
  | "food_lover"
  | "luxury"
  | "backpacker"
  | "family"
  | "couple"
  | "digital_nomad"
  | "solo";

export type Interest =
  | "monuments"
  | "museums"
  | "beaches"
  | "nature"
  | "food"
  | "architecture"
  | "shopping"
  | "photography"
  | "nightlife";

export type FoodPreference = "halal" | "vegetarian" | "vegan" | "none";

export type Budget = "economy" | "medium" | "luxury";

export type ActivityLevel = "relaxed" | "moderate" | "intensive";

/** Saved user profile from the onboarding survey. */
export interface TravelProfile {
  travelerType: TravelerType;
  interests: Interest[];
  foodPreference: FoodPreference;
  budget: Budget;
  activityLevel: ActivityLevel;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A normalized place from any of our free data sources. */
export interface Place extends GeoPoint {
  id: string;
  name: string;
  category: PlaceCategory;
  description?: string;
  tags?: string[];
  /** 0..1 popularity / interest heuristic. */
  score?: number;
  /** True when this is an off-the-beaten-path recommendation. */
  hiddenGem?: boolean;
  cuisine?: string;
  source: "overpass" | "opentripmap" | "wikipedia" | "ai" | "mock";
  wikipediaUrl?: string;
  imageUrl?: string;
  /** Populated by the nearby (GPS) flow. */
  distanceKm?: number;
}

export type PlaceCategory =
  | "attraction"
  | "monument"
  | "museum"
  | "restaurant"
  | "cafe"
  | "beach"
  | "park"
  | "viewpoint"
  | "landmark"
  | "nightlife"
  | "shopping";

export type Daypart = "morning" | "lunch" | "afternoon" | "dinner" | "evening";

export interface ItineraryStop {
  daypart: Daypart;
  place: Place;
  /** Minutes recommended at this stop. */
  durationMin: number;
  /** Travel from the previous stop. */
  travelFromPrevMin?: number;
  travelMode?: "walk" | "transit" | "taxi";
  note?: string;
  estimatedCost?: number;
}

export interface ItineraryDay {
  day: number;
  date?: string;
  title: string;
  summary: string;
  stops: ItineraryStop[];
  estimatedCost: number;
  weather?: DayWeather;
}

export interface Itinerary {
  id: string;
  destination: string;
  center: GeoPoint;
  days: ItineraryDay[];
  profile: Partial<TravelProfile>;
  totalEstimatedCost: number;
  currency: string;
  createdAt: string;
  /** Which engine produced this plan. */
  engine: "gemini" | "mock" | "openai" | "claude";
}

export interface DayWeather {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  weatherCode: number;
  summary: string;
  rainRisk: boolean;
}

/** Inputs collected from the trip planner form. */
export interface TripRequest {
  destination: string;
  startDate?: string;
  days: number;
  budget: Budget;
  interests: Interest[];
  profile?: Partial<TravelProfile>;
}

export interface DestinationMatch {
  name: string;
  country: string;
  score: number;
  reason: string;
  image: string;
  center: GeoPoint;
}
