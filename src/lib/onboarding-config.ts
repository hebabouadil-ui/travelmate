import type {
  ActivityLevel,
  Budget,
  FoodPreference,
  Interest,
  TravelerType,
} from "./types";

export const TRAVELER_TYPES: { value: TravelerType; label: string; emoji: string }[] = [
  { value: "explorer", label: "Explorer", emoji: "🧭" },
  { value: "food_lover", label: "Food Lover", emoji: "🍜" },
  { value: "luxury", label: "Luxury Traveler", emoji: "💎" },
  { value: "backpacker", label: "Backpacker", emoji: "🎒" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { value: "couple", label: "Couple", emoji: "💞" },
  { value: "digital_nomad", label: "Digital Nomad", emoji: "💻" },
  { value: "solo", label: "Solo Traveler", emoji: "🚶" },
];

export const INTERESTS: { value: Interest; label: string; emoji: string }[] = [
  { value: "monuments", label: "Monuments", emoji: "🏛️" },
  { value: "museums", label: "Museums", emoji: "🖼️" },
  { value: "beaches", label: "Beaches", emoji: "🏖️" },
  { value: "nature", label: "Nature", emoji: "🌿" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "architecture", label: "Architecture", emoji: "🏗️" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "photography", label: "Photography", emoji: "📸" },
  { value: "nightlife", label: "Nightlife", emoji: "🌃" },
];

export const FOOD_PREFERENCES: { value: FoodPreference; label: string }[] = [
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "none", label: "No Restrictions" },
];

export const BUDGETS: { value: Budget; label: string; hint: string }[] = [
  { value: "economy", label: "Economy", hint: "Smart spend" },
  { value: "medium", label: "Medium", hint: "Balanced" },
  { value: "luxury", label: "Luxury", hint: "No limits" },
];

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "relaxed", label: "Relaxed", hint: "2 stops/day" },
  { value: "moderate", label: "Moderate", hint: "3 stops/day" },
  { value: "intensive", label: "Intensive", hint: "4+ stops/day" },
];
