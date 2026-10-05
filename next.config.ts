import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // fallback (not a bare array): a bare array is checked before our own
    // dynamic Route Handlers, so this blanket proxy was swallowing
    // /api/avatar/[userId], /api/chat-file/[chatId]/[fileId], and
    // /api/parcel-photo/[matchId]/[fileId] before they ever ran — those
    // need to resolve a Kosh redirect server-side first, not get proxied
    // straight to a same-named-but-wrong path on the real API. fallback
    // only applies once no filesystem route or dynamic route matched.
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.trickle-dev.maatli.com/trickle";
    return {
      fallback: [{
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      }],
    };
  },
};

export default nextConfig;
