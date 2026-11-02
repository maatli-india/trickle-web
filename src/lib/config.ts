const DEFAULT_LOCAL_API = "http://localhost:7003/trickle";

export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production (set on Netlify).");
  }
  return DEFAULT_LOCAL_API;
}

export const siteConfig = {
  name: "Trickle",
  description: "People-powered parcel delivery that follows the journey.",
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
