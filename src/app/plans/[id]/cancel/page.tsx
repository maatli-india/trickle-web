"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { cancelTravelPlanWithPolicy, getTravelPlanById, listParcelMatchesForPlan } from "@/services/travel-plans";
import { extractListItems, extractOneItem, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { isCollectedRequest } from "@/lib/trip-status";

const getPrice = (request: ParcelMatch) => Number(request.agreedPrice || request.baseAmount || request.pricing?.baseAmount || 0);
const getName = (request: ParcelMatch) => request.senderName || "Sender";

export default function CancelTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [requests, setRequests] = useState<ParcelMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getTravelPlanById(id), listParcelMatchesForPlan(id, { page: 1, limit: 100 })]).then(([planResult, matchesResult]) => {
      if (!active) return;
      if (planResult.status === "fulfilled") setPlan(extractOneItem<TravelPlan>(planResult.value) || null);
      if (matchesResult.status === "fulfilled") setRequests(extractListItems<ParcelMatch>(matchesResult.value as never));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const collected = useMemo(() => requests.filter(isCollectedRequest), [requests]);
  const notCollected = useMemo(() => requests.filter((request) => !isCollectedRequest(request)), [requests]);
  const totalRefund = requests.reduce((sum, request) => sum + getPrice(request), 0);

  const submit = async () => {
    setAttempted(true);
    if (collected.length && (!reason.trim() || !understood)) return;
    setSubmitting(true);
    setError("");
    try {
      await cancelTravelPlanWithPolicy(id, reason.trim());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not cancel trip.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-[#62645f]">Loading trip...</main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
        <SiteHeader />
        <main className="mx-auto max-w-2xl flex-1 px-5 py-20 sm:px-8">
          <div className="border-l-2 border-[#285c59] bg-[#e5f0eb] p-6">
            <h1 className="text-2xl font-semibold text-[#183b3a]">All senders notified</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              All {requests.length} sender{requests.length === 1 ? " is" : "s are"} being refunded ₹{totalRefund} total — each refund&apos;s exact status is visible on that request&apos;s details page.{" "}
              {collected.length ? "Support will contact you within 2 hours about returning the collected packages." : "This trip is removed from your schedule."}
            </p>
            <Link href="/plans" className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
              Done
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const routeLabel = `${plan?.from?.address || "Origin"} → ${plan?.to?.address || "Destination"}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 px-5 pb-32 pt-8 sm:px-8">
        <Link href={`/plans/${id}`} className="text-sm font-semibold text-[#e85b43]">
          ← Back to trip
        </Link>

        {collected.length ? (
          <>
            <h1 className="mt-6 text-3xl font-semibold text-[#183b3a]">This needs careful handling</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              You have already collected {collected.length} of {requests.length} packages for {routeLabel}. Cancelling affects people differently depending on where their package stands.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-semibold text-[#183b3a]">Cancel this trip?</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              {requests.length} sender{requests.length !== 1 ? "s" : ""} will be refunded ₹{totalRefund} in full and notified right away.
            </p>
          </>
        )}

        {collected.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#b33e2c]">Already collected — needs return</p>
            <div className="mt-2 space-y-2">
              {collected.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 border border-[#f3d3cc] bg-[#faece7] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#183b3a]">{getName(request)}</p>
                    <p className="truncate text-xs text-[#62645f]">{request.parcelDescription || request.parcelCategory || "Parcel"}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#b33e2c]">₹{getPrice(request)} refund</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {notCollected.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">{collected.length ? "Not yet collected — simple refund" : "Who's affected"}</p>
            <div className="mt-2 space-y-2">
              {notCollected.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-3 border border-[#ded8ce] bg-[#fbfaf7] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#183b3a]">{getName(request)}</p>
                    <p className="truncate text-xs text-[#62645f]">{request.parcelDescription || request.parcelCategory || "Parcel"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#e5f0eb] px-2 py-1 text-xs font-semibold text-[#285c59]">₹{getPrice(request)} refund</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {collected.length ? (
          <>
            <label className="mt-6 block text-sm font-semibold text-[#183b3a]">
              What happened?
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain your situation — this helps our team review it fairly"
                className={`mt-2 min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43] ${attempted && !reason.trim() ? "border-[#e2574c]" : "border-[#d7d2c9]"}`}
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm text-[#62645f]">
              <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5" />
              <span>
                I understand I&apos;m responsible for returning the {collected.length} already-collected package{collected.length !== 1 ? "s" : ""}, and support will contact me to coordinate it.
              </span>
            </label>
            {attempted && !understood && <p className="mt-1 text-xs text-[#b33e2c]">Please confirm you understand before continuing.</p>}
          </>
        ) : (
          <div className="mt-6 flex gap-3 border border-[#b7e4d4] bg-[#e1f5ee] p-4 text-sm text-[#085041]">
            Every sender gets a full refund. This cancellation will be recorded against your reliability score.
          </div>
        )}

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="mt-8 w-full rounded-xl bg-[#b33e2c] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#992f20] disabled:opacity-60"
        >
          {submitting ? "Submitting..." : collected.length ? `Confirm & notify ${requests.length} senders` : "Confirm cancellation"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
