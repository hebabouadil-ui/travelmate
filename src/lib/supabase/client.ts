"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Returns null when env vars are absent so the app
 * runs fully in "guest" mode with no auth/persistence (zero-config demo).
 */
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
