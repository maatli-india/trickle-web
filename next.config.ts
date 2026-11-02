import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop advertising the framework to drive-by scanners.
  poweredByHeader: false,
  async headers() {
    // Static security headers (no CSP middleware — nonce CSP broke /register on Netlify).
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
  async rewrites() {
    // fallback (not a bare array): a bare array is checked before our own
    // dynamic Route Handlers, so this blanket proxy was swallowing
    // /api/avatar/[userId], /api/chat-file/[chatId]/[fileId], and
    // /api/parcel-photo/[matchId]/[fileId] before they ever ran — those
    // need to resolve a Kosh redirect server-side first, not get proxied
    // straight to a same-named-but-wrong path on the real API. fallback
    // only applies once no filesystem route or dynamic route matched.
    const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const apiBaseUrl =
      fromEnv ||
      (process.env.NODE_ENV === "production"
        ? (() => {
            throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production (set on Netlify).");
          })()
        : "http://localhost:7003/trickle");
    return {
      fallback: [{
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      }],
    };
  },
};

export default nextConfig;
