// Ad and measurement tags on the website:
//   - Meta Pixel (dataset "Trickle website", Maatli business portfolio)
//   - Google tag (GA4 web stream "Trickle website", property trickle-625bd,
//     the same property the app reports to)
//
// Rules for both, matching the Privacy Policy section 5 (/privacy#advertising):
//   - load only after the visitor picks "Allow" on the ad consent banner
//   - run only on the production site, so dev/QA visits don't reach the
//     ad data (set localStorage "trickle.pixelDebug" = "1" to test elsewhere)
//   - fire only on public marketing pages. The tags send the page URL to
//     Meta and Google, and app pages can carry ids or secrets (a /track/<token> link
//     reveals the delivery code), so those never load it.

export const META_PIXEL_ID = "1158868913800548";
export const GA_MEASUREMENT_ID = "G-R2Q43R2BE1";

const PROD_HOSTS = new Set(["trickle.org.in", "www.trickle.org.in"]);

// Exact paths only (no prefixes): new pages stay off until listed here.
const PIXEL_PAGES = new Set([
  "/",
  "/about",
  "/blog",
  "/download",
  "/faqs",
  "/contact",
  "/support",
  "/privacy",
  "/terms",
  "/cancellation-policy",
  "/community-guidelines",
  "/data-retention",
  "/safety-disclaimer",
  "/account-deletion",
]);

export function pixelHostEnabled(hostname: string): boolean {
  if (PROD_HOSTS.has(hostname)) return true;
  try {
    return window.localStorage.getItem("trickle.pixelDebug") === "1";
  } catch {
    return false;
  }
}

export function pixelPageAllowed(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PIXEL_PAGES.has(path);
}
