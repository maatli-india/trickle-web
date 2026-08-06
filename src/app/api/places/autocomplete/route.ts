import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim();
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] });
  if (!key) return NextResponse.json({ message: "Address search is not configured." }, { status: 503 });

  const params = new URLSearchParams({ input, key, components: "country:in", types: "geocode" });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`, { cache: "no-store" });
  if (!response.ok) return NextResponse.json({ message: "Address search is unavailable." }, { status: response.status });
  return NextResponse.json(await response.json());
}
