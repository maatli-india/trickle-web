"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { apiRequest } from "@/services/api-client";

// Landing point for transitorder's digilockerRedirect (see digilocker.go) —
// GET /account/verify/result?status=success|failure&reason=<code>. Mirrors
// the mobile app's digilockerFailureMessage mapping in VerificationContext.js
// so the same reason code reads the same way on both platforms.
const FAILURE_MESSAGES: Record<string, string> = {
  DENIED: "DigiLocker verification wasn't completed.",
  EXPIRED: "That verification link expired.",
  IDENTITY_MISMATCH:
    "The DigiLocker account you used doesn't match your Trickle profile name. Please verify with the DigiLocker account registered in your own name.",
  NO_PROFILE_DATA:
    "We couldn't retrieve your Aadhaar details from DigiLocker. Please make sure your Aadhaar is linked in your DigiLocker account.",
  EXCHANGE_FAILED: "DigiLocker verification could not be completed.",
};

function ResultContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const reason = params.get("reason");
  const success = status === "success";
  const [refreshing, setRefreshing] = useState(success);

  useEffect(() => {
    if (!success) return;
    // The backend already persisted Verified:true before this redirect
    // fired — this just refreshes the cached profile so the rest of the
    // site (and this page's own "Verified" state next time settings loads)
    // picks it up without waiting for an unrelated page load to do it.
    apiRequest("/v1/users/me")
      .then((response) => {
        try {
          const stored = JSON.parse(window.localStorage.getItem("trickle.web.profile") || "{}");
          window.localStorage.setItem("trickle.web.profile", JSON.stringify({ ...stored, ...(response as object) }));
        } catch {
          // Cache refresh is a convenience — a failure here just means the
          // next full settings load fetches the current value instead.
        }
      })
      .finally(() => setRefreshing(false));
  }, [success]);

  const message = success
    ? "Your DigiLocker verification was successful — your account now shows the Verified badge."
    : (reason && FAILURE_MESSAGES[reason]) || "DigiLocker verification could not be completed.";

  return (
    <AccountPage
      eyebrow="Identity verification"
      title={success ? "Identity verified" : "Verification not completed"}
      description={refreshing ? "Finishing up..." : message}
    >
      <div className="max-w-xl rounded-2xl border border-[#e4ded2] bg-white p-6 sm:p-8">
        <div
          className={`flex size-12 items-center justify-center rounded-full ${
            success ? "bg-[#eaf7f1] text-[#1f6e52]" : "bg-[#fff0eb] text-[#b33e2c]"
          }`}
        >
          {success ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#62645f]">{message}</p>
        {!success && (
          <p className="mt-2 text-sm leading-6 text-[#8a8579]">
            You can try again anytime from Account settings.
          </p>
        )}
        <Link
          href="/account/settings"
          className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59]"
        >
          {success ? "Back to account settings" : "Try again"}
        </Link>
      </div>
    </AccountPage>
  );
}

export default function DigilockerResultPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f2eb]" />}>
      <ResultContent />
    </Suspense>
  );
}
