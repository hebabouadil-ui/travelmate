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

/** Confidence rules: 90-100 Excellent, 70-89 Trusted, 50-69 Fallback (kept,
 *  but clearly labeled), below 50 Reject (never displayed). */
export type ConfidenceBand = "excellent" | "trusted" | "fallback" | "reject";

/** Honest display label for the composite Itinerary Quality Score — never
 *  presents a low-quality plan as high quality. */
export type QualityLabel = "Premium Plan" | "Very Good" | "Good" | "Limited Verified Data";

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
  /** Deterministic, source-backed "Recommended because…" line explaining why
   *  this place is in the plan (see `recommendationReason` in scoring.ts). */
  recommendationReason?: string;
  tags?: string[];
  /** 0..1 popularity / interest heuristic. */
  score?: number;
  /** True when this is an off-the-beaten-path recommendation. */
  hiddenGem?: boolean;
  cuisine?: string;
  source: "overpass" | "opentripmap" | "wikipedia" | "ai" | "mock";
  wikipediaUrl?: string;
  /** Wikidata entity id (e.g. "Q243") from OSM — used to fetch fame/popularity. */
  wikidataId?: string;
  /** Wikipedia article title (e.g. "Eiffel Tower") for pageview/popularity lookups. */
  wikipediaTitle?: string;
  /** 0..1 global-fame signal derived from Wikidata sitelink count (how many
   *  language Wikipedias cover it). A real, source-backed popularity proxy. */
  popularity?: number;
  /** 0..1 confidence that this recommendation is real, well-placed and notable. */
  confidence?: number;
  /** Priority tier from destination knowledge: 1 = must-see, 2 = strong, 3 = optional. */
  tier?: 1 | 2 | 3;
  imageUrl?: string;
  /** True once a real (Wikipedia/Foursquare) photo has been resolved for this
   *  place, so the UI knows it's not just a category placeholder. */
  photoResolved?: boolean;
  /** True when the location is grounded to a real OSM POI (coords/name/hours
   *  verified) rather than an AI-suggested approximation. */
  verified?: boolean;
  /** Human opening hours if known (OSM). */
  openingHours?: string;
  /** Street address if known (OSM addr:* tags). */
  address?: string;
  /** Official website if known (OSM website/contact:website tag). */
  website?: string;
  /** Suggested neighborhood/area label. */
  neighborhood?: string;
  /** Best time of day to visit, e.g. "Golden hour". */
  bestTime?: string;
  /** Populated by the nearby (GPS) flow. */
  distanceKm?: number;
  /** Real review rating (0..10) from Foursquare, when it actually returned
   *  one. Never fabricated — absent rather than guessed when no source has it. */
  rating?: number;
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

/**
 * The fixed skeleton of a guided local-expert day. Each slot answers a moment
 * of the day ("what do I do now?"), in order from waking up to night.
 */
export type GuideSlot =
  | "breakfast"
  | "morning_activity"
  | "main_attraction"
  | "lunch"
  | "afternoon_activity"
  | "coffee_break"
  | "sunset"
  | "dinner"
  | "night";

export type TravelMode = "walk" | "transit" | "taxi" | "car";

export interface ItineraryStop {
  daypart: Daypart;
  /** Which moment of the guided day this is (breakfast → night). */
  slot?: GuideSlot;
  /** Clock time the guide suggests arriving, e.g. "08:00". */
  startTime?: string;
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
  /** Closed-taxonomy theme derived from the day's actual stop categories
   *  (e.g. "Historic & Monuments"), guaranteed to match real content — see
   *  `dayTheme()` in `itinerary/interests.ts`. */
  theme?: string;
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
  /** Data-quality breakdown for the whole plan (provenance + confidence). */
  audit?: ItineraryAudit;
  /** Full scored candidate pool considered for this trip (pre-selection),
   *  attached only when `TripRequest.debug` is true. Lets audit tooling see
   *  exactly which real candidates existed and were rejected, without
   *  duplicating the engine's own scoring logic. */
  debugPool?: Place[];
}

/** Self-audit of an itinerary's recommendation quality / data provenance. */
export interface ItineraryAudit {
  totalStops: number;
  /** Stops grounded to a real OSM POI (coords/name/hours verified). */
  verified: number;
  /** Stops kept as AI approximations (no real-world match found). */
  approximate: number;
  /** Stops sourced from OpenStreetMap. */
  fromOSM: number;
  /** Stops with a Wikipedia/Wikidata entry (notable, documented sites). */
  fromWikidata: number;
  /** Average per-stop confidence (0..1). */
  avgConfidence: number;
  /** Our coverage confidence for this destination (0..100), if we have a pack. */
  destinationConfidence?: number;
  /**
   * 0..100: how many of the traveller's selected interests are actually
   * represented by a real stop in the trip (Interest Coverage Score). 100
   * when no interests were selected.
   */
  interestCoverage?: number;
  /**
   * 0..100 composite Itinerary Quality Score: Interest Coverage 20%,
   * Landmark Coverage 20%, Route Efficiency 15%, Time Logic 15%, Photo
   * Quality 10%, Weather Adaptation 10%, Verification Quality 10%. Replaces
   * the flat per-stop confidence average as the headline quality measure.
   */
  qualityScore?: number;
  /** Honest display label for `qualityScore`. */
  qualityLabel?: QualityLabel;
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
  /** Peak wind speed (km/h), when available. */
  windKmh?: number;
  /** Real local sunset clock time (HH:MM), from Open-Meteo astronomical data. */
  sunsetTime?: string;
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
  /** Internal: when true, the engine attaches its full scored candidate pool
   *  to the returned Itinerary as `debugPool` — audit tooling only, never set
   *  by the app UI. */
  debug?: boolean;
}

export interface DestinationMatch {
  name: string;
  country: string;
  score: number;
  reason: string;
  /** Absent when we don't have a verified photo — UI shows a clean placeholder
   *  rather than risk a broken/guessed image URL. */
  image?: string;
  center: GeoPoint;
}
