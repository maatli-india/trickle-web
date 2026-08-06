import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!placeId) return NextResponse.json({ message: "A place is required." }, { status: 400 });
  if (!key) return NextResponse.json({ message: "Address search is not configured." }, { status: 503 });

  const params = new URLSearchParams({ place_id: placeId, key, fields: "geometry,formatted_address" });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`, { cache: "no-store" });
  if (!response.ok) return NextResponse.json({ message: "Address details are unavailable." }, { status: response.status });
  return NextResponse.json(await response.json());
}
