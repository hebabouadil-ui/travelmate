import { useEffect, useState } from "react";
import * as Network from "expo-network";

/** Lightweight connectivity hook — drives the "offline" banner / cached UI. */
export function useNetwork() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) setOnline(Boolean(state.isInternetReachable ?? state.isConnected));
      } catch {
        if (mounted) setOnline(true);
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { online };
}
