import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

// Same server-side redirect resolution as /api/avatar/[userId] and
// /api/parcel-photo/[matchId]/[fileId]: GET /trickle/v1/chats/{chatId}/files/{fileId}/download-url
// requires the caller's access token (a plain <img src> can't send one, and
// the browser can't attach it before following a redirect either), so this
// forwards it server-side and hands back the final signed URL as JSON.
export async function GET(request: NextRequest, { params }: { params: Promise<{ chatId: string; fileId: string }> }) {
  const { chatId, fileId } = await params;
  const authorization = request.headers.get("authorization");
  const deviceId = request.headers.get("x-device-id");
  if (!authorization || !deviceId) return NextResponse.json({ message: "Missing auth." }, { status: 401 });

  const upstream = await fetch(
    `${siteConfig.apiBaseUrl}/v1/chats/${encodeURIComponent(chatId)}/files/${encodeURIComponent(fileId)}/download-url`,
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
