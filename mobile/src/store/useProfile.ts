import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Itinerary, TravelProfile } from "@/lib/types";

interface ProfileState {
  profile: Partial<TravelProfile>;
  onboardingComplete: boolean;
  savedTrips: Itinerary[];
  favorites: string[];
  /** Hydration flag so the router can wait for persisted state on cold start. */
  _hydrated: boolean;

  setProfile: (p: Partial<TravelProfile>) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  saveTrip: (t: Itinerary) => void;
  updateTrip: (t: Itinerary) => void;
  removeTrip: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getTrip: (id: string) => Itinerary | undefined;
  setHydrated: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: {},
      onboardingComplete: false,
      savedTrips: [],
      favorites: [],
      _hydrated: false,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      completeOnboarding: () => set({ onboardingComplete: true }),
      resetOnboarding: () => set({ onboardingComplete: false, profile: {} }),
      saveTrip: (t) =>
        set((s) => ({
          savedTrips: [t, ...s.savedTrips.filter((x) => x.id !== t.id)].slice(
            0,
            30
          ),
        })),
      updateTrip: (t) =>
        set((s) => ({
          savedTrips: s.savedTrips.map((x) => (x.id === t.id ? t : x)),
        })),
      removeTrip: (id) =>
        set((s) => ({
          savedTrips: s.savedTrips.filter((x) => x.id !== id),
          favorites: s.favorites.filter((x) => x !== id),
        })),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      getTrip: (id) => get().savedTrips.find((x) => x.id === id),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: "voyage-ai-profile",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        profile: s.profile,
        onboardingComplete: s.onboardingComplete,
        savedTrips: s.savedTrips,
        favorites: s.favorites,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
