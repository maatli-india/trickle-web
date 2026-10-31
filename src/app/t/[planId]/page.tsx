"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AccountPage } from "@/components/account/account-page";

// Public landing page for a shared trip link (trickle-web/.../t/<planId>),
// opened by whoever receives a "Share trip" message from the mobile app —
// a stranger with no Trickle session, possibly without the app at all.
// Deliberately does NOT call GET /v1/travel-plans/{id} (that route requires
// a user/admin token — see transitorder's travel.go) rather than adding a
// new public/unauthenticated endpoint just for this preview; this page
// only attempts the app handoff and shows generic copy, no live trip data.
//
// This is the stopgap before real iOS Universal Links / Android App Links:
// those need the app live on the App Store/Play Store first (Associated
// Domains + apple-app-site-association need a real Team ID, assetlinks.json
// needs a real signing cert) — this plain https:// page is tappable from
// anywhere (Instagram/WhatsApp/SMS, unlike a bare trickle:// scheme link,
// which not every app even linkifies) and still opens the app directly for
// anyone who already has it installed.
export default function TripShareLandingPage() {
  const params = useParams<{ planId?: string | string[] }>();
  const planId = Array.isArray(params?.planId) ? params.planId[0] : params?.planId;

  useEffect(() => {
    if (!planId) return;
    // Fires immediately — if Trickle is installed, the OS hands off to the
    // app before the visitor finishes reading this page. If not installed,
    // this is a silent no-op and the content below is what they see.
    window.location.href = `trickle://trip/${planId}`;
  }, [planId]);

  return (
    <AccountPage
      eyebrow="Shared trip"
      title="Someone wants to send a parcel with you on Trickle"
      description="If you already have the Trickle app installed, it should be opening now."
    >
      <div className="max-w-2xl space-y-5 text-base leading-7 text-[#62645f]">
        <p>
          Trickle connects people who need to send a parcel with travelers already heading in the
          right direction. Whoever sent you this link is offering to carry something on an
          upcoming trip of theirs.
        </p>
        {planId && (
          // Some in-app browsers (Instagram's especially) block the automatic
          // JS redirect above — a direct tap always works since it's a real
          // user gesture, not a script-triggered navigation.
          <a
            href={`trickle://trip/${planId}`}
            className="inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]"
          >
            Open in Trickle app
          </a>
        )}
        <p className="font-semibold text-[#183b3a]">
          The Trickle app isn&apos;t available on the App Store or Google Play yet — we&apos;re
          putting the finishing touches on it. Check back soon.
        </p>
      </div>
    </AccountPage>
  );
}
