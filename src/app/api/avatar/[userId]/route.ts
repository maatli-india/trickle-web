import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

// GET /trickle/v1/users/{userId}/profile-pic-url is public but requires
// X-Device-ID, and a plain <img src> can't send that header. This route lets
// the browser make an ordinary same-origin call (apiRequest already attaches
// X-Device-ID) and resolves Trickle's 302 to the real Kosh URL server-side —
// reading a redirect's Location header from browser fetch() is not possible
// (manual redirect mode always yields an inaccessible opaqueredirect
// response), so the browser can never do this hop itself.
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ message: "X-Device-ID is required." }, { status: 400 });

  const upstream = await fetch(`${siteConfig.apiBaseUrl}/v1/users/${encodeURIComponent(userId)}/profile-pic-url`, {
    headers: { "X-Device-ID": deviceId },
    redirect: "manual",
  });

  const location = upstream.headers.get("location");
  if ((upstream.status === 302 || upstream.status === 301) && location) {
    return NextResponse.json({ url: location });
  }
  if (upstream.status === 404) return NextResponse.json({ message: "No profile picture yet." }, { status: 404 });
  return NextResponse.json({ message: "Could not load the profile picture." }, { status: upstream.status || 502 });
}
