import type { ExperienceTag, NightlifeSubcategory, PlaceCategory } from "../types";

/**
 * Tourist Relevance Filter + Candidate Classification.
 *
 * TravelMate is a travel planner, not a maps app: raw OSM/Foursquare queries
 * surface plenty of real-world places that are technically "shops" or
 * "amenities" but that no traveller would ever plan a visit around (a
 * Walmart, a hardware store, a bank). This module rejects those BEFORE they
 * ever reach scoring, and classifies every surviving candidate into a
 * closed set of experience tags (History, Nature, Shopping, Nightlife,
 * Food, Photography, Architecture, Family, Romantic, Luxury, Adventure) so
 * downstream selection can reason about what KIND of experience a place is.
 */

const IRRELEVANT_NAME_PARTS = [
  "walmart",
  "costco",
  "canadian tire",
  "home depot",
  "rona\\b",
  "lowe's",
  "target",
  "ikea",
  "best buy",
  "staples",
  "office depot",
  "7-?eleven",
  "circle k",
  "shell\\b",
  "chevron",
  "exxon",
  "esso\\b",
  "totalenergies",
  "total energies",
  "petro-?canada",
  "walgreens",
  "cvs\\b",
  "dollarama",
  "dollar tree",
  "ace hardware",
];

const IRRELEVANT_NAME_RE = new RegExp(
  `\\b(${IRRELEVANT_NAME_PARTS.join("|")})\\b`,
  "i"
);

// OSM `shop=*` values that are pure utility/errand stops, never a travel
// experience in their own right.
const IRRELEVANT_SHOP_TAGS = new Set([
  "supermarket",
  "convenience",
  "hardware",
  "doityourself",
  "trade",
  "wholesale",
  "car",
  "car_repair",
  "car_parts",
  "tyres",
  "appliance",
  "electronics",
  "storage_rental",
  "laundry",
  "dry_cleaning",
  "funeral_directors",
  "money_lender",
  "pawnbroker",
  "medical_supply",
  "agrarian",
  "garden_centre",
  "trade_register",
]);

// OSM `amenity=*` values that are civic/utility infrastructure, not a
// destination — unless the traveller explicitly searched for one.
const IRRELEVANT_AMENITY_TAGS = new Set([
  "fuel",
  "bank",
  "atm",
  "bureau_de_change",
  "pharmacy",
  "hospital",
  "clinic",
  "dentist",
  "post_office",
  "townhall",
  "courthouse",
  "police",
  "fire_station",
  "waste_disposal",
  "recycling",
  "car_wash",
  "car_rental",
  "driving_school",
  "social_facility",
  "prison",
  "crematorium",
]);

const IRRELEVANT_BUILDING_TAGS = new Set([
  "industrial",
  "warehouse",
  "office",
  "garage",
  "garages",
  "government",
]);

/**
 * Reject places that are not meaningful travel experiences. Examples from
 * spec: Walmart, Canadian Tire, Home Depot, hardware stores, supermarkets,
 * gas stations, warehouses, office buildings, pharmacies, banks, hospitals,
 * industrial zones.
 */
export function isTouristIrrelevant(
  name: string,
  tags?: Record<string, string | undefined>
): boolean {
  if (IRRELEVANT_NAME_RE.test(name)) return true;
  if (!tags) return false;
  if (tags.shop && IRRELEVANT_SHOP_TAGS.has(tags.shop)) return true;
  if (tags.amenity && IRRELEVANT_AMENITY_TAGS.has(tags.amenity)) return true;
  if (tags.office) return true;
  if (tags.building && IRRELEVANT_BUILDING_TAGS.has(tags.building)) return true;
  if (tags.landuse === "industrial" || tags.landuse === "garages") return true;
  return false;
}

const LUXURY_NAME_RE =
  /\b(ritz|four seasons|luxury|five[- ]star|5-star|champagne|caviar|michelin|grand hotel|royal suite)\b/i;
const ROMANTIC_NAME_RE =
  /\b(sunset|secret garden|riverside|terrace|romantic|love|honeymoon)\b/i;
const FAMILY_NAME_RE =
  /\b(zoo|aquarium|theme park|amusement|kids?|children|family|playground|water ?park)\b/i;
const ADVENTURE_NAME_RE =
  /\b(hik(e|ing)|climb(ing)?|dive|diving|surf(ing)?|kayak|trail|safari|canyon|trek)\b/i;

// ── Nightlife Subcategory Classification ───────────────────────────────────
// Name keywords are checked first (the most specific real signal); OSM
// `amenity` is the fallback for a plain bar/pub/club with no distinguishing
// name. Every nightlife place gets a subcategory — "bar" is the honest,
// generic default when no stronger signal exists, never an invented one.
const ROOFTOP_RE = /\b(rooftop|roof[- ]?top|sky)\b/i;
const JAZZ_RE = /\bjazz\b/i;
const KARAOKE_RE = /\bkaraoke\b/i;
const WINE_BAR_RE = /\b(wine\s?bar|wine\s?lounge|enoteca|vinoteca)\b/i;
const COCKTAIL_RE = /\b(cocktail|speakeasy|mixology|lounge)\b/i;
const SPORTS_BAR_RE = /\bsports?\s?bar\b/i;
const BEACH_CLUB_RE = /\bbeach\s?club\b/i;
const ELECTRONIC_RE = /\b(techno|electro|edm|house music|disco)\b/i;
const LIVE_MUSIC_RE = /\b(live music|music\s?hall|concert hall)\b/i;
const NIGHTCLUB_NAME_RE = /\bclub\b/i;

/**
 * Classify a real nightlife venue into the closed subcategory taxonomy
 * (Bars, Rooftop Bars, Nightclubs, Cocktail Lounges, Live Music, Jazz Clubs,
 * Sports Bars, Beach Clubs, Karaoke Bars, Wine Bars, Electronic Music
 * Venues) from its name and, when known, its OSM tags. Only ever called for
 * places already classified as category === "nightlife".
 */
export function classifyNightlife(
  name: string,
  tags?: Record<string, string | undefined>
): NightlifeSubcategory {
  const n = name.toLowerCase();
  if (ROOFTOP_RE.test(n)) return "rooftop_bar";
  if (JAZZ_RE.test(n)) return "jazz_club";
  if (KARAOKE_RE.test(n)) return "karaoke_bar";
  if (WINE_BAR_RE.test(n)) return "wine_bar";
  if (SPORTS_BAR_RE.test(n)) return "sports_bar";
  if (BEACH_CLUB_RE.test(n)) return "beach_club";
  if (ELECTRONIC_RE.test(n)) return "electronic_venue";
  if (LIVE_MUSIC_RE.test(n) || tags?.amenity === "music_venue") return "live_music";
  if (tags?.amenity === "nightclub" || NIGHTCLUB_NAME_RE.test(n)) return "nightclub";
  if (COCKTAIL_RE.test(n)) return "cocktail_lounge";
  return "bar";
}

/**
 * Classify a candidate place into the closed set of experience tags, BEFORE
 * scoring. Deterministic: driven by category, real OSM/Wikidata tags, and
 * name keywords — never guessed.
 */
export function classifyExperience(
  category: PlaceCategory,
  tags: Record<string, string | undefined> | undefined,
  name: string
): ExperienceTag[] {
  const out = new Set<ExperienceTag>();
  const t = tags || {};
  const n = name.toLowerCase();

  switch (category) {
    case "monument":
      out.add("history");
      out.add("architecture");
      out.add("photography");
      break;
    case "landmark":
      out.add("history");
      out.add("architecture");
      out.add("photography");
      break;
    case "museum":
      out.add("history");
      out.add("architecture");
      break;
    case "gallery":
      out.add("photography");
      out.add("architecture");
      break;
    case "park":
      out.add("nature");
      out.add("photography");
      break;
    case "beach":
      out.add("nature");
      out.add("photography");
      break;
    case "viewpoint":
      out.add("nature");
      out.add("photography");
      out.add("romantic");
      break;
    case "shopping":
      out.add("shopping");
      break;
    case "nightlife":
      out.add("nightlife");
      break;
    case "restaurant":
    case "cafe":
      out.add("food");
      break;
    case "attraction":
      out.add("photography");
      break;
    case "sports":
      out.add("adventure");
      break;
  }

  if (t.historic) {
    out.add("history");
    out.add("architecture");
  }
  if (t.tourism === "zoo" || t.tourism === "theme_park") out.add("family");
  if (t.natural === "beach") out.add("nature");
  if (t.leisure === "park" || t.leisure === "garden") out.add("nature");
  if (t.sport) out.add("adventure");

  if (LUXURY_NAME_RE.test(n)) out.add("luxury");
  if (ROMANTIC_NAME_RE.test(n)) out.add("romantic");
  if (FAMILY_NAME_RE.test(n)) out.add("family");
  if (ADVENTURE_NAME_RE.test(n)) out.add("adventure");

  return Array.from(out);
}
