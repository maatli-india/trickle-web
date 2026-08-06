import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat")?.trim();
  const lng = request.nextUrl.searchParams.get("lng")?.trim();
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!lat || !lng) return NextResponse.json({ message: "Coordinates are required." }, { status: 400 });
  if (!key) return NextResponse.json({ message: "Address search is not configured." }, { status: 503 });

  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key, result_type: "street_address|route|locality|sublocality" });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, { cache: "no-store" });
  if (!response.ok) return NextResponse.json({ message: "Current area name is unavailable." }, { status: response.status });
  return NextResponse.json(await response.json());
}
