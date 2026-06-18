import { NextResponse } from "next/server";
import { overpassPlaces } from "@/lib/data/overpass";
import { haversineKm } from "@/lib/utils";
import type { GeoPoint } from "@/lib/types";

export const runtime = "nodejs";

/** Live GPS mode: nearby attractions / restaurants / hidden gems. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const center: GeoPoint = { lat, lng };
  const radius = Math.min(parseInt(searchParams.get("radius") || "1500", 10), 5000);

  const places = await overpassPlaces(center, radius);
  const withDistance = places
    .map((p) => ({ ...p, distanceKm: Math.round(haversineKm(center, p) * 100) / 100 }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 40);

  return NextResponse.json({ center, places: withDistance });
}
