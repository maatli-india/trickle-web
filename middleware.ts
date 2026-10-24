import { NextRequest, NextResponse } from "next/server";

// Security headers for every response, plus a per-request CSP nonce.
// Next.js automatically applies a nonce it finds in this exact
// Content-Security-Policy response header to its own emitted <script>
// tags, so this is enough to lock script-src down without threading a
// nonce prop through every page by hand.
//
// Deliberately NOT restricting `form-action`: the PayU hosted-checkout
// flow (src/lib/payu.ts) builds and submits a <form> straight to PayU's
// domain, and that domain can differ between PayU sandbox/production. An
// incomplete form-action allowlist would silently break real payments,
// which is worse than the (low) risk form-action mitigates here.
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Every page/route except static assets and image optimization files,
    // which don't need (and shouldn't pay the cost of) a CSP header.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
