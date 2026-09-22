"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
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
        <div className="max-w-xl space-y-5">
          <div className="flex flex-col items-center rounded-[22px] bg-[#171e3a] px-6 py-10 text-center">
            <span className="grid size-[72px] place-items-center rounded-full bg-[#f5a623]">
              <Gift size={28} className="text-[#3b2400]" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-[#f4f6fb]">Earn ₹100 per friend</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#9aa6c4]">
              Share your code with people you trust — you both get rewarded when they complete their first delivery.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e4ded2] bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Your referral code</p>
            <div className="mt-3 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate rounded-xl border border-[#d7d2c9] bg-[#fbfaf7] px-4 py-3 text-lg font-semibold tracking-[0.1em] text-[#183b3a]">{code || "Not available yet"}</p>
              {code && (
                <button
                  type="button"
                  onClick={() => copy(code)}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-[#183b3a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59]"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {link && (
              <div className="mt-6 border-t border-[#eee9e1] pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Share link</p>
                <p className="mt-3 break-all rounded-xl border border-[#d7d2c9] bg-[#fbfaf7] px-4 py-3 text-sm text-[#183b3a]">{link}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountPage>
  );
}
