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
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  osmContactEmail: process.env.EXPO_PUBLIC_OSM_CONTACT_EMAIL || "contact@voyage.ai",
};

export const hasGoogleMaps = () => Boolean(ENV.googleMapsApiKey);
export const isSupabaseConfigured = () =>
  Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
