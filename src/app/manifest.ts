import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest. Makes the site
// installable ("Add to Home Screen" / "Install app"), launching full screen
// with the same icon as the mobile app. Icons are generated from the mobile
// app's 1024px App Store icon (see public/icon-*.png).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Trickle — Delivery that follows the journey",
    short_name: "Trickle",
    description: "People-powered parcel delivery that follows the journey.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f2eb",
    theme_color: "#fbfaf7",
    categories: ["travel", "shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
