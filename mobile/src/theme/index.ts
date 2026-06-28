import type { PlaceCategory } from "@/lib/types";

/**
 * Voyage AI design system — a premium, editorial light aesthetic: a warm
 * off-white canvas, charcoal/slate text, a single refined teal accent used
 * sparingly, soft elevation and generous whitespace. Icons are Lucide (crisp,
 * consistent stroke weight). Used app-wide so screens stay consistent.
 */
export const colors = {
  // Canvas — warm off-white, not stark white.
  bg: "#FBFAF8",
  bgElevated: "#FFFFFF",
  surface: "#F3F2EE",
  surfaceAlt: "#EAE8E2", // neutral image/skeleton placeholder
  card: "#FFFFFF",
  border: "rgba(26,26,30,0.07)",
  borderStrong: "rgba(26,26,30,0.12)",

  // Text — charcoal + slate.
  text: "#1A1A1E",
  textMuted: "#6E7178",
  textFaint: "#A4A6AD",

  // Brand — a single refined teal accent.
  primary: "#0F766E",
  primaryDark: "#0B5C56",
  accent: "#0F766E",
  // Subtle two-stop of close teal shades — depth on CTAs without a saturated pop.
  gradient: ["#13837A", "#0F766E"] as const,
  // Hero / loading — refined deep charcoal (no purple).
  heroGradient: ["#24262E", "#15161B"] as const,

  // Semantic — muted, not neon.
  success: "#2F8F6B",
  warning: "#B07A1E",
  danger: "#B4453C",
  rain: "#5B7C99",

  star: "#B07A1E",
  overlay: "rgba(20,21,26,0.45)",
  black: "#000000",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  xxl: 40,
  xxxl: 56,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const font = {
  hero: 34,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = {
  card: {
    shadowColor: "#1A1F36",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  soft: {
    shadowColor: "#1A1F36",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: "rgba(15,118,110,0.35)",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

/** Per-category visuals: Lucide icon name + a muted, harmonious accent color. */
export const CATEGORY_META: Record<
  PlaceCategory,
  { icon: string; color: string; emoji: string; label: string }
> = {
  attraction: { icon: "sparkles", color: "#0F766E", emoji: "", label: "Attraction" },
  monument: { icon: "landmark", color: "#8A7A5C", emoji: "", label: "Monument" },
  museum: { icon: "palette", color: "#7E6B8F", emoji: "", label: "Museum" },
  gallery: { icon: "image", color: "#8F6B9A", emoji: "", label: "Gallery" },
  restaurant: { icon: "utensils", color: "#B4655A", emoji: "", label: "Restaurant" },
  cafe: { icon: "coffee", color: "#9A7B5A", emoji: "", label: "Café" },
  beach: { icon: "waves", color: "#5E8C9E", emoji: "", label: "Beach" },
  park: { icon: "trees", color: "#5F8A6A", emoji: "", label: "Park" },
  viewpoint: { icon: "mountain", color: "#6E8198", emoji: "", label: "Viewpoint" },
  landmark: { icon: "flag", color: "#A8894E", emoji: "", label: "Landmark" },
  nightlife: { icon: "wine", color: "#6E6A8F", emoji: "", label: "Nightlife" },
  shopping: { icon: "shopping-bag", color: "#A86F8A", emoji: "", label: "Shopping" },
  wellness: { icon: "flower-2", color: "#6FA88A", emoji: "", label: "Wellness" },
  sports: { icon: "dumbbell", color: "#4A7FA5", emoji: "", label: "Sports" },
  entertainment: { icon: "clapperboard", color: "#C0703E", emoji: "", label: "Entertainment" },
};

export const DAYPART_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  morning: { label: "Morning", icon: "sunrise", color: "#B07A1E" },
  lunch: { label: "Lunch", icon: "utensils", color: "#B4655A" },
  afternoon: { label: "Afternoon", icon: "sun", color: "#A8894E" },
  dinner: { label: "Dinner", icon: "wine", color: "#6E6A8F" },
  evening: { label: "Evening", icon: "moon", color: "#6E8198" },
};

/**
 * The guided-day skeleton: ordered moments from waking up to night, each with a
 * label, icon, canonical start time, the daypart it belongs to and the place
 * category it typically maps to. Drives both the AI plan and the timeline UI.
 */
export const SLOT_META: Record<
  string,
  { label: string; icon: string; color: string; start: string; daypart: string; category: string }
> = {
  breakfast: { label: "Breakfast", icon: "cafe", color: "#B07A1E", start: "08:00", daypart: "morning", category: "cafe" },
  morning_activity: { label: "Morning activity", icon: "sunrise", color: "#B07A1E", start: "09:00", daypart: "morning", category: "attraction" },
  main_attraction: { label: "Main attraction", icon: "flag", color: "#A8894E", start: "10:30", daypart: "morning", category: "monument" },
  lunch: { label: "Lunch", icon: "utensils", color: "#B4655A", start: "13:00", daypart: "lunch", category: "restaurant" },
  afternoon_activity: { label: "Afternoon", icon: "sun", color: "#A8894E", start: "15:00", daypart: "afternoon", category: "attraction" },
  coffee_break: { label: "Coffee break", icon: "coffee", color: "#A86F5A", start: "16:30", daypart: "afternoon", category: "cafe" },
  sunset: { label: "Sunset", icon: "sunset", color: "#C06A3E", start: "18:00", daypart: "evening", category: "viewpoint" },
  dinner: { label: "Dinner", icon: "wine", color: "#6E6A8F", start: "20:00", daypart: "dinner", category: "restaurant" },
  night: { label: "Night", icon: "moon", color: "#6E8198", start: "22:00", daypart: "evening", category: "nightlife" },
};

/** Ordered slot ids for a full guided day. */
export const SLOT_ORDER = [
  "breakfast", "morning_activity", "main_attraction", "lunch",
  "afternoon_activity", "coffee_break", "sunset", "dinner", "night",
] as const;
