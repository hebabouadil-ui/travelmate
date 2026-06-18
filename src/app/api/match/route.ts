import { NextResponse } from "next/server";
import { matchDestinations } from "@/lib/match";
import type { TravelProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const profile = (await request.json().catch(() => ({}))) as Partial<TravelProfile>;
  return NextResponse.json({ matches: matchDestinations(profile) });
}
