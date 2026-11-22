import type { Metadata } from "next";
import type { ReactNode } from "react";

// The tracking token in the URL is a secret (it reveals the delivery code),
// so these pages are never indexed, cached, or leaked via Referer. The same
// rules are also sent as HTTP headers from next.config.ts.
export const metadata: Metadata = {
  title: "Track your parcel | Trickle",
  description: "Follow your Trickle parcel and get its delivery code.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Never prerendered or cached: every request renders fresh.
export const dynamic = "force-dynamic";

export default function TrackLayout({ children }: { children: ReactNode }) {
  return children;
}
