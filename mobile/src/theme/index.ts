import type { PlaceCategory } from "@/lib/types";

/**
 * Voyage AI design system — a premium, Airbnb-style light aesthetic: clean warm
 * canvas, photo-forward cards, soft elevation shadows, a vibrant violet→cyan
 * brand gradient and generous spacing. Used app-wide so screens stay consistent.
 */
export const colors = {
  // Canvas
  bg: "#FFFFFF",
  bgElevated: "#FFFFFF",
  surface: "#F4F5F8",
  surfaceAlt: "#EDEFF4",
  card: "#FFFFFF",
  border: "rgba(17,24,39,0.08)",
  borderStrong: "rgba(17,24,39,0.14)",

  // Text
  text: "#14161F",
  textMuted: "#5B6173",
  textFaint: "#9AA1B2",

  // Brand
  primary: "#6C5CE7",
  primaryDark: "#5A4BD1",
  accent: "#0FB5C4",
  gradient: ["#7C5CFF", "#6C5CE7", "#22D3EE"] as const,
  heroGradient: ["#7C5CFF", "#5B4DE0", "#3B2FB5"] as const,

  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  rain: "#3B82F6",

  star: "#F59E0B",
  overlay: "rgba(5,8,16,0.55)",
  black: "#000000",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
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
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  soft: {
    shadowColor: "#1A1F36",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  float: {
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

/** Per-category visuals: icon (Ionicons) + accent color + emoji. */
export const CATEGORY_META: Record<
  PlaceCategory,
  { icon: string; color: string; emoji: string; label: string }
> = {
  attraction: { icon: "sparkles", color: "#A78BFA", emoji: "✨", label: "Attraction" },
  monument: { icon: "business", color: "#F59E0B", emoji: "🏛️", label: "Monument" },
  museum: { icon: "color-palette", color: "#EC4899", emoji: "🖼️", label: "Museum" },
  restaurant: { icon: "restaurant", color: "#FB7185", emoji: "🍽️", label: "Restaurant" },
  cafe: { icon: "cafe", color: "#D97706", emoji: "☕", label: "Café" },
  beach: { icon: "sunny", color: "#22D3EE", emoji: "🏖️", label: "Beach" },
  park: { icon: "leaf", color: "#34D399", emoji: "🌿", label: "Park" },
  viewpoint: { icon: "camera", color: "#60A5FA", emoji: "📸", label: "Viewpoint" },
  landmark: { icon: "flag", color: "#FBBF24", emoji: "📍", label: "Landmark" },
  nightlife: { icon: "wine", color: "#C084FC", emoji: "🌃", label: "Nightlife" },
  shopping: { icon: "bag-handle", color: "#F472B6", emoji: "🛍️", label: "Shopping" },
};

export const DAYPART_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  morning: { label: "Morning", icon: "partly-sunny", color: "#FBBF24" },
  lunch: { label: "Lunch", icon: "restaurant", color: "#FB7185" },
  afternoon: { label: "Afternoon", icon: "sunny", color: "#F59E0B" },
  dinner: { label: "Dinner", icon: "wine", color: "#C084FC" },
  evening: { label: "Evening", icon: "moon", color: "#60A5FA" },
};
