/**
 * Central, typed access to optional runtime configuration. Everything here is
 * OPTIONAL — the app runs fully offline / key-less without any of it. Mobile
 * (Expo) exposes public env vars prefixed with EXPO_PUBLIC_*.
 */
export const ENV = {
  aiProvider: (process.env.EXPO_PUBLIC_AI_PROVIDER || "").toLowerCase(),
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  osmContactEmail: process.env.EXPO_PUBLIC_OSM_CONTACT_EMAIL || "contact@voyage.ai",
  /**
   * Map tile style. Defaults to OpenFreeMap — a free, key-less, sign-up-free
   * vector basemap built on OpenStreetMap. Override with any MapLibre style URL
   * (e.g. a MapTiler/Stadia style) if you have one.
   */
  mapStyleUrl:
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
    "https://tiles.openfreemap.org/styles/liberty",
};

export const isSupabaseConfigured = () =>
  Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
