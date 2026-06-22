import React from "react";
import { Text, TextStyle, StyleProp } from "react-native";

/**
 * Font-independent icon — an API-compatible drop-in for <Ionicons />.
 *
 * Ionicons' embedded TTF repeatedly refused to render in our release APKs,
 * leaving blank squares on every button (share / X / trash …). This maps the
 * icon names we use to Unicode glyphs and emoji that the system font is
 * guaranteed to have, so icons are always visible on every device.
 *
 * Monochrome control glyphs (✕ ‹ › ← ✓ …) respect the `color` prop; emoji
 * render in their own colour, which is fine for decorative icons.
 */
export type IconName = string;

const GLYPHS: Record<string, string> = {
  // Monochrome controls — these honour `color`.
  close: "✕",
  "close-circle": "✕",
  "chevron-back": "‹",
  "chevron-forward": "›",
  "arrow-back": "←",
  add: "＋",
  "checkmark-circle": "✓",
  checkmark: "✓",
  refresh: "↻",
  navigate: "➤",
  "navigate-circle": "➤",
  "navigate-outline": "➤",

  // Decorative emoji.
  compass: "🧭",
  "compass-outline": "🧭",
  sparkles: "✨",
  "share-outline": "📤",
  share: "📤",
  wallet: "👛",
  umbrella: "☂️",
  trash: "🗑️",
  "trash-outline": "🗑️",
  "create-outline": "✏️",
  create: "✏️",
  "cloud-offline": "📴",
  "cloud-offline-outline": "📴",
  search: "🔍",
  "search-outline": "🔍",
  briefcase: "🧳",
  "briefcase-outline": "🧳",
  location: "📍",
  "location-outline": "📍",
  "alert-circle": "⚠️",
  "alert-circle-outline": "⚠️",
  diamond: "💎",
  "time-outline": "🕐",
  time: "🕐",
  "information-circle-outline": "ℹ️",
  "information-circle": "ℹ️",
  notifications: "🔔",
  "notifications-outline": "🔔",
  person: "👤",
  "person-outline": "👤",
  star: "⭐",
  "star-outline": "☆",
  map: "🗺️",
  "map-outline": "🗺️",
  image: "🖼️",
  "image-outline": "🖼️",
  walk: "🚶",
  bus: "🚌",
  car: "🚗",
  "car-sport": "🏎️",
  "sunny-outline": "☀️",
  sunny: "☀️",
  "alarm-outline": "⏰",
  alarm: "⏰",
  "restaurant-outline": "🍽️",
  restaurant: "🍽️",
  calendar: "📅",
  "calendar-outline": "📅",
  heart: "❤️",
  "heart-outline": "🤍",
  camera: "📷",
  ticket: "🎟️",
  cafe: "☕",
  bed: "🛏️",
};

export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const glyph = GLYPHS[name] ?? "•";
  return (
    <Text
      allowFontScaling={false}
      style={[
        { fontSize: size, lineHeight: Math.round(size * 1.15), color, textAlign: "center" },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}

/** Back-compat: some call sites referenced Ionicons.glyphMap for typing. */
export type GlyphName = keyof typeof GLYPHS;
