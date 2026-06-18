import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV, isSupabaseConfigured } from "../env";

/**
 * Mobile Supabase client. Returns null when env vars are absent so the app runs
 * fully in "guest" mode with no auth/persistence (zero-config). Auth sessions
 * are persisted to AsyncStorage so logins survive app restarts.
 */
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!isSupabaseConfigured()) return null;
  cached = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

export { isSupabaseConfigured };
