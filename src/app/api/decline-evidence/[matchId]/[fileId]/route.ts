import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

// Same server-side redirect resolution as /api/parcel-photo/[matchId]/[fileId],
// but for GET /trickle/v1/parcel-matches/{matchId}/decline-evidence/{fileId}/download-url
// — the photos a traveler attaches when declining at pickup inspection.
export async function GET(request: NextRequest, { params }: { params: Promise<{ matchId: string; fileId: string }> }) {
  const { matchId, fileId } = await params;
  const authorization = request.headers.get("authorization");
  const deviceId = request.headers.get("x-device-id");
  if (!authorization || !deviceId) return NextResponse.json({ message: "Missing auth." }, { status: 401 });

  const upstream = await fetch(
    `${siteConfig.apiBaseUrl}/v1/parcel-matches/${encodeURIComponent(matchId)}/decline-evidence/${encodeURIComponent(fileId)}/download-url`,
    { headers: { Authorization: authorization, "X-Device-ID": deviceId }, redirect: "manual" },
  );

  const location = upstream.headers.get("location");
  if ((upstream.status === 302 || upstream.status === 301) && location) {
    return NextResponse.json({ url: location });
  }
  if (upstream.status === 401) return NextResponse.json({ message: "Not authorized." }, { status: 401 });
  if (upstream.status === 404) return NextResponse.json({ message: "Photo not found." }, { status: 404 });
  return NextResponse.json({ message: "Could not load this photo." }, { status: upstream.status || 502 });
}
