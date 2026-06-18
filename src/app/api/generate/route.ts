import { NextResponse } from "next/server";
import { generateItinerary } from "@/lib/itinerary/engine";
import type { TripRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TripRequest>;
    if (!body.destination || typeof body.destination !== "string") {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }
    const req: TripRequest = {
      destination: body.destination,
      startDate: body.startDate,
      days: clampDays(body.days),
      budget: body.budget ?? "medium",
      interests: Array.isArray(body.interests) ? body.interests : [],
      profile: body.profile,
    };
    const itinerary = await generateItinerary(req);
    return NextResponse.json(itinerary);
  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json(
      { error: "Failed to generate itinerary", detail: String(err) },
      { status: 500 }
    );
  }
}

function clampDays(d: unknown): number {
  const n = typeof d === "number" ? d : parseInt(String(d ?? 3), 10);
  if (Number.isNaN(n)) return 3;
  return Math.min(Math.max(n, 1), 10);
}
