"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Itinerary, TravelProfile } from "../types";

interface ProfileState {
  profile: Partial<TravelProfile>;
  onboardingComplete: boolean;
  savedTrips: Itinerary[];
  setProfile: (p: Partial<TravelProfile>) => void;
  completeOnboarding: () => void;
  saveTrip: (t: Itinerary) => void;
  removeTrip: (id: string) => void;
  toggleFavorite: (id: string) => void;
  favorites: string[];
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: {},
      onboardingComplete: false,
      savedTrips: [],
      favorites: [],
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      completeOnboarding: () => set({ onboardingComplete: true }),
      saveTrip: (t) =>
        set((s) => ({
          savedTrips: [t, ...s.savedTrips.filter((x) => x.id !== t.id)].slice(0, 30),
        })),
      removeTrip: (id) =>
        set((s) => ({ savedTrips: s.savedTrips.filter((x) => x.id !== id) })),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
    }),
    { name: "voyage-ai-profile" }
  )
);
