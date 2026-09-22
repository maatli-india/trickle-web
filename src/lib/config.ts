export const siteConfig = {
  name: "Trickle",
  description: "People-powered parcel delivery that follows the journey.",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.trickle-dev.maatli.com/trickle",
} as const;