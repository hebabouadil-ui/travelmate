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
  /** One inviting line on why this place is worth visiting. */
  whyVisit?: string;
  tags?: string[];
  /** 0..1 popularity / interest heuristic. */
  score?: number;
  /** True when this is an off-the-beaten-path recommendation. */
  hiddenGem?: boolean;
  cuisine?: string;
  source: "overpass" | "opentripmap" | "wikipedia" | "ai" | "mock";
  wikipediaUrl?: string;
  imageUrl?: string;
  /** True once a real (Wikipedia/Foursquare) photo has been resolved for this
   *  place, so the UI knows it's not just a category placeholder. */
  photoResolved?: boolean;
  /** Human opening hours if known (OSM). */
  openingHours?: string;
  /** Suggested neighborhood/area label. */
  neighborhood?: string;
  /** Best time of day to visit, e.g. "Golden hour". */
  bestTime?: string;
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

export type TravelMode = "walk" | "transit" | "taxi" | "car";

export interface ItineraryStop {
  daypart: Daypart;
  place: Place;
  /** Minutes recommended at this stop. */
  durationMin: number;
  /** Travel from the previous stop. */
  travelFromPrevMin?: number;
  /** Real road distance (km) from the previous stop, when known (OSRM). */
  travelDistanceKm?: number;
  travelMode?: TravelMode;
  note?: string;
  estimatedCost?: number;
}

export interface ItineraryDay {
  day: number;
  date?: string;
  title: string;
  summary: string;
  /** Main neighborhood/area for the day. */
  area?: string;
  stops: ItineraryStop[];
  estimatedCost: number;
  weather?: DayWeather;
  /** Street-following polyline (lat/lng) for the day's route, if computed. */
  routeGeometry?: GeoPoint[];
}

export interface Itinerary {
  id: string;
  destination: string;
  country?: string;
  center: GeoPoint;
  /** A short, evocative paragraph on why this destination is worth visiting. */
  overview: string;
  /** 3–5 punchy reasons / highlights for the destination. */
  highlights: string[];
  /** Hero photo of the destination city. */
  imageUrl?: string;
  days: ItineraryDay[];
  profile: Partial<TravelProfile>;
  /** Planning mode used. */
  mode?: ItineraryMode;
  totalEstimatedCost: number;
  currency: string;
  createdAt: string;
  /** Which engine produced this plan. */
  engine: "gemini" | "mock" | "openai" | "claude";
}

export type ItineraryMode = "personalized" | "recommended";

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
  /** Exact coordinates of the picked city (skips ambiguous re-geocoding). */
  center?: GeoPoint;
  /** Resolved country of the picked city (drives currency, avoids bad guesses). */
  country?: string;
  startDate?: string;
  days: number;
  budget: Budget;
  interests: Interest[];
  profile?: Partial<TravelProfile>;
  /** "personalized" (interest-driven) or "recommended" (best-of). */
  mode?: ItineraryMode;
}

export interface DestinationMatch {
  name: string;
  country: string;
  score: number;
  reason: string;
  image: string;
  center: GeoPoint;
}
