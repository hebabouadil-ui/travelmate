import { useCallback, useState } from "react";
import * as Location from "expo-location";
import type { GeoPoint } from "@/lib/types";

interface LocationState {
  coords: GeoPoint | null;
  loading: boolean;
  error: string | null;
  permission: Location.PermissionStatus | null;
}

/**
 * Native GPS hook (expo-location). Requests foreground permission on demand and
 * returns the device's current coordinates — powers the "Nearby" tab and
 * "center map on me" actions.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coords: null,
    loading: false,
    error: null,
    permission: null,
  });

  const requestLocation = useCallback(async (): Promise<GeoPoint | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({
          ...s,
          loading: false,
          permission: status,
          error: "Location permission denied",
        }));
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: GeoPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setState({ coords, loading: false, error: null, permission: status });
      return coords;
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Could not get your location",
      }));
      return null;
    }
  }, []);

  return { ...state, requestLocation };
}
