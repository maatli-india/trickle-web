"use client";

import { useEffect, useState } from "react";
import { AccountPage } from "@/components/account/account-page";
import { getReferrals, type ReferralSummary } from "@/services/referrals";

export default function ReferAFriendPage() {
  const [referrals, setReferrals] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferrals()
      .then(setReferrals)
      .catch(() => setError("We could not load your referral details right now."))
      .finally(() => setLoading(false));
  }, []);

  const code = referrals?.referralCode || referrals?.code || "";
  const link = referrals?.referralLink || referrals?.link || "";

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is unavailable; the value stays selectable in the field.
    }
  };

  return (
    <AccountPage title="Refer a friend" description="Share Trickle with people you trust and earn a reward when they complete their first delivery.">
      {loading && <p className="text-sm text-[#62645f]">Loading your referral details...</p>}
      {!loading && error && <p role="alert" className="rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
      {!loading && !error && (
        <div className="max-w-xl space-y-5 border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Your referral code</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-lg font-semibold tracking-[0.1em] text-[#183b3a]">{code || "Not available yet"}</p>
              {code && <button type="button" onClick={() => copy(code)} className="shrink-0 rounded-xl bg-[#183b3a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">{copied ? "Copied" : "Copy"}</button>}
            </div>
          </div>
          {link && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Share link</p>
              <p className="mt-2 break-all rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm text-[#183b3a]">{link}</p>
            </div>
          )}
          <div className="border-t border-[#ded8ce] pt-4 text-sm leading-6 text-[#62645f]">
            <p>Earn ₹100 when a friend signs up with your code and completes their first delivery.</p>
          </div>
        </div>
      )}
    </AccountPage>
  );
}
