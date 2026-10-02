import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.trickle-dev.maatli.com/trickle";
    return [{
      source: "/api/:path*",
      destination: `${apiBaseUrl}/:path*`,
    }];
  },
};

export default nextConfig;
