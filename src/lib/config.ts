export const siteConfig = {
  name: "Trickle",
  description: "People-powered parcel delivery that follows the journey.",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7003/trickle",
} as const;