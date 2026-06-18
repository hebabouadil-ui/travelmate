"use client";

import dynamic from "next/dynamic";
import type { TripMapProps } from "./TripMap";

// Leaflet touches `window`, so load it only on the client.
const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

export function MapView(props: TripMapProps) {
  return <TripMap {...props} />;
}
