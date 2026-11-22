// Showcase mode: the mobile apps are the product, and the website is a
// landing page with download links. The full web app's code is all still
// here; set NEXT_PUBLIC_WEB_APP_ENABLED=true (build-time) to turn it back on.
export const webAppEnabled = process.env.NEXT_PUBLIC_WEB_APP_ENABLED === "true";

// Store listings. Leave empty until the app is live there; the site then
// says "Coming soon" instead of linking to a missing listing.
// Android: https://play.google.com/store/apps/details?id=com.trickle.maatli
export const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || "";
// iOS: https://apps.apple.com/app/id<your app id>
export const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || "";

// Pages that stay reachable in showcase mode: information and legal pages
// (Play/App Store need privacy, terms and account deletion), contact,
// shared-trip links from the app (/t/<id>), parcel-tracking links shared
// with recipients (/track/<token>), the iOS/Android app-link files
// (/.well-known/*), and the API proxy those pages use. Everything else
// redirects to the homepage.
const SHOWCASE_PREFIXES = [
  "/about",
  "/blog",
  "/support",
  "/contact",
  "/faqs",
  "/privacy",
  "/terms",
  "/safety-disclaimer",
  "/community-guidelines",
  "/data-retention",
  "/cancellation-policy",
  "/account-deletion",
  "/download",
  "/t/",
  "/track/",
  "/.well-known/",
  "/api/",
  // Internal team pages (admin login required); not part of the public app.
  "/admin",
];

export const isShowcasePath = (pathname: string) =>
  pathname === "/" ||
  SHOWCASE_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
