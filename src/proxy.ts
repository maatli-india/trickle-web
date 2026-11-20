import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isShowcasePath, webAppEnabled } from "@/lib/app-links";

// Showcase mode (see src/lib/app-links.ts): the homepage shows the app
// download page, and the web app's own pages (sign-in, requests, trips,
// settings, …) send visitors back to it. With NEXT_PUBLIC_WEB_APP_ENABLED=true
// this does nothing and the full web app works as before.
export function proxy(request: NextRequest) {
  if (webAppEnabled) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.rewrite(new URL("/download", request.url));
  if (isShowcasePath(pathname)) return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Skip Next.js internals and static files (icons, manifest, sw.js, images).
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
