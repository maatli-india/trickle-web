"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Trash2 } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  cancelParcelMatch,
  createPaymentOrder,
  deletePastParcelMatch,
  getParcelMatch,
  initiateHandoff,
  mockConfirmPayment,
  respondToCounterOffer,
  submitMatchRating,
} from "@/services/parcel-matches";
import { extractOneItem, type ParcelMatch } from "@/types/travel";
import { CANCELLABLE_STATUSES, effectiveStatus, getRequestStatusLabel, relevantMatchDate } from "@/lib/parcel-status";
import { avatarTint, initials } from "@/lib/home-constants";

const FEE_PCT = 0.25;

const formatDateTime = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const isEarlyCancellation = (relevantDate?: string) => {
  if (!relevantDate) return true;
  const date = new Date(String(relevantDate).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() - Date.now() > 24 * 60 * 60 * 1000;
};

export default function ParcelRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") === "traveller" ? "traveller" : "sender") as "sender" | "traveller";
  const isSender = role === "sender";

  const [match, setMatch] = useState<ParcelMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<{ transactionId?: string; amount?: number } | null>(null);
  const [pickupOtp, setPickupOtp] = useState<string | null>(null);
  const [otpCopied, setOtpCopied] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const refresh = () =>
    getParcelMatch(id)
      .then((response) => setMatch(extractOneItem<ParcelMatch>(response) || null))
      .catch(() => setError("We could not load this request."))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!match) return;
    const status = String(match.status || "").toLowerCase();
    if (isSender && status === "confirmed" && !pickupOtp) {
      initiateHandoff(id)
        .then((response) => setPickupOtp(response?.handoff?.otp || null))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto flex-1 max-w-3xl px-5 py-16 text-sm text-[#62645f]">Loading request...</main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto flex-1 max-w-3xl px-5 py-16">
          <p className="text-[#b33e2c]">{error || "This request could not be found."}</p>
          <Link href="/requests" className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
            Back to requests
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const relevantDate = relevantMatchDate(match);
  const status = effectiveStatus(match.status, relevantDate);
  const price = match.agreedPrice || match.baseAmount || match.pricing?.baseAmount || 0;
  const counterpart = isSender ? match.travelerName || "Traveller" : match.senderName || "Sender";
  const canCancel = CANCELLABLE_STATUSES.has(status);
  const isPendingLike = ["pending", "negotiating", "countered", "searching"].includes(status);
  const isPayGate = ["accepted", "accepted_awaiting_payment", "awaiting_payment", "payment_initiated"].includes(status);
  const isConfirmed = status === "confirmed";
  const isInTransit = ["picked_up", "in_transit"].includes(status);
  const isCompleted = ["delivered", "completed"].includes(status);
  const isCancelledOrDeclined = ["cancelled", "cancelled_by_sender", "cancelled_by_traveler", "rejected", "declined", "expired"].includes(status);
  const canDeleteFromHistory = isCompleted || isCancelledOrDeclined;

  const respond = async (action: "accept" | "reject") => {
    setBusy(true);
    setError("");
    try {
      await respondToCounterOffer(id, action);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update this request.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      await cancelParcelMatch(id);
      setCancelOpen(false);
      await refresh();
    } catch (requestError) {
      const requestStatus = (requestError as { status?: number })?.status;
      setError(
        requestStatus === 409
          ? (requestError as Error).message || "This request cannot be cancelled after handoff."
          : requestError instanceof Error
            ? requestError.message
            : "Could not cancel this request.",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteFromHistory = async () => {
    setBusy(true);
    setError("");
    try {
      await deletePastParcelMatch(id);
      setDeleteOpen(false);
      router.push("/requests");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete this request from history.");
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    setBusy(true);
    setError("");
    try {
      const order = await createPaymentOrder(id);
      setPaymentOrder(order);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  };

  const testConfirm = async () => {
    if (!paymentOrder?.transactionId) return;
    setBusy(true);
    try {
      await mockConfirmPayment(id, paymentOrder.transactionId);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not confirm payment.");
    } finally {
      setBusy(false);
    }
  };

  const rate = async () => {
    setBusy(true);
    try {
      await submitMatchRating(id, { rating: ratingValue, comment: ratingComment || undefined });
      setRatingSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not submit your rating.");
    } finally {
      setBusy(false);
    }
  };

  const fee = isEarlyCancellation(relevantDate) ? 0 : Math.round(price * FEE_PCT);
  const refund = Math.max(0, price - fee);

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto flex-1 max-w-3xl px-5 pb-32 sm:px-8">
        <Link href="/requests" className="pt-8 text-sm font-semibold text-[#e85b43]">
          ← Back to requests
        </Link>

        <section className="mt-6 border-t-2 border-[#e85b43] bg-[#183b3a] p-6 text-white sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7b65c]">{isSender ? "Your parcel request" : "Request received"}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold"
              style={{ backgroundColor: avatarTint(counterpart).bg, color: avatarTint(counterpart).fg }}
            >
              {initials(counterpart)}
            </span>
            <h1 className="text-3xl font-semibold">{counterpart}</h1>
            </div>
            {canDeleteFromHistory && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                title="Delete from history"
                aria-label="Delete from history"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/30 text-white transition hover:border-[#e7b65c] hover:text-[#e7b65c]"
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
          <p className="mt-3 text-sm text-[#c5d4ce]">{match.parcelDescription || match.parcelCategory || "Parcel request"}</p>
          <div className="mt-4 grid gap-2 text-sm text-[#c5d4ce] sm:grid-cols-2">
            <p>
              {match.from?.address || "Pickup"} <span className="text-[#e7b65c]">→</span> {match.to?.address || "Destination"}
            </p>
            <p>By {formatDateTime(relevantDate)}</p>
          </div>
          <p className="mt-4 text-xl font-semibold">{price ? `₹${price}` : "Offer pending"}</p>
          <span className="mt-3 inline-block rounded-full bg-[#e7b65c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#183b3a]">
            {status === "expired" ? "Expired" : getRequestStatusLabel(match.status, role)}
          </span>
        </section>

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        {isPendingLike && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            {isSender ? (
              <>
                <p className="text-sm text-[#62645f]">Waiting for {counterpart} to respond to your request.</p>
                {canCancel && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="mt-4 rounded-xl border border-[#e85b43]/40 bg-[#fff0eb] px-5 py-3 text-sm font-semibold text-[#b33e2c]">
                    Cancel request
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-[#62645f]">Review this request from {counterpart}.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={busy} onClick={() => respond("reject")} className="rounded-xl border border-[#d7d2c9] px-5 py-3 text-sm font-semibold text-[#62645f] disabled:opacity-60">
                    Decline
                  </button>
                  <button type="button" disabled={busy} onClick={() => respond("accept")} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? "Accepting..." : "Accept"}
                  </button>
                  <button type="button" onClick={() => setShowCounterForm((value) => !value)} className="rounded-xl border border-[#d7d2c9] px-5 py-3 text-sm font-semibold text-[#183b3a]">
                    Counter offer
                  </button>
                </div>
                {showCounterForm && (
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="text-sm font-semibold text-[#183b3a]">
                      New amount (₹)
                      <input
                        type="number"
                        min={1}
                        value={counterAmount}
                        onChange={(event) => setCounterAmount(event.target.value)}
                        className="mt-2 w-32 rounded-xl border border-[#d7d2c9] bg-white px-4 py-2 text-sm outline-none focus:border-[#e85b43]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy || !Number(counterAmount)}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const { counterOfferParcelMatch } = await import("@/services/parcel-matches");
                          await counterOfferParcelMatch(id, { baseAmount: Number(counterAmount) });
                          setShowCounterForm(false);
                          await refresh();
                        } catch (requestError) {
                          setError(requestError instanceof Error ? requestError.message : "Could not send counter-offer.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="rounded-xl bg-[#e85b43] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Send counter-offer
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {isPayGate && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            {isSender ? (
              <>
                <p className="text-sm font-semibold text-[#183b3a]">Confirm and pay ₹{price}</p>
                {!paymentOrder ? (
                  <button type="button" disabled={busy} onClick={startPayment} className="mt-4 rounded-xl bg-[#e85b43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? "Starting..." : "Pay now"}
                  </button>
                ) : (
                  <div className="mt-4 border-l-2 border-[#e7b65c] bg-white p-4">
                    <p className="text-sm font-semibold text-[#183b3a]">Web payments are coming soon</p>
                    <p className="mt-1 text-sm text-[#62645f]">Complete this payment from the Trickle mobile app to confirm the request. Your order has been created.</p>
                    {process.env.NODE_ENV !== "production" && (
                      <button type="button" disabled={busy} onClick={testConfirm} className="mt-4 rounded-xl border border-[#d7d2c9] px-4 py-2 text-sm font-semibold text-[#183b3a] disabled:opacity-60">
                        {busy ? "Confirming..." : "Test confirm (dev)"}
                      </button>
                    )}
                  </div>
                )}
                {canCancel && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="mt-4 block text-sm font-semibold text-[#b33e2c]">
                    Cancel this request
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-[#62645f]">Waiting for {counterpart} to complete payment.</p>
            )}
          </section>
        )}

        {isConfirmed && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            {isSender ? (
              <>
                <p className="text-sm font-semibold text-[#183b3a]">Amount paid: ₹{price}</p>
                {pickupOtp ? (
                  <div className="mt-4 border-l-2 border-[#e7b65c] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Pickup code</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-3xl font-semibold tracking-[0.3em] text-[#183b3a]">{pickupOtp}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(pickupOtp).then(() => {
                            setOtpCopied(true);
                            window.setTimeout(() => setOtpCopied(false), 2000);
                          });
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-[#d7d2c9] px-3 py-1.5 text-xs font-semibold text-[#183b3a] hover:border-[#e85b43]"
                      >
                        {otpCopied ? <Check size={13} /> : <Copy size={13} />}
                        {otpCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-[#62645f]">Share this code with {counterpart} when they collect the parcel.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#62645f]">Preparing your pickup code...</p>
                )}
                {canCancel && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="mt-4 block text-sm font-semibold text-[#b33e2c]">
                    Cancel this request
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-[#62645f]">Confirmed. Ask {counterpart} for the pickup code when you meet to collect the parcel.</p>
            )}
          </section>
        )}

        {isInTransit && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">{status === "picked_up" ? "Picked up" : "In transit"}</p>
            <p className="mt-2 text-sm text-[#62645f]">
              {isSender ? `${counterpart} has your parcel. Share the delivery code with them when it arrives.` : `You're carrying this parcel to ${match.to?.address || "its destination"}.`}
            </p>
          </section>
        )}

        {isCompleted && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">Delivered</p>
            {ratingSubmitted ? (
              <p className="mt-2 text-sm text-[#285c59]">Thanks for rating {counterpart}.</p>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-[#62645f]">Rate {counterpart}</p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setRatingValue(value)} className={`text-2xl ${value <= ratingValue ? "text-[#e7b65c]" : "text-[#d7d2c9]"}`}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={ratingComment}
                  onChange={(event) => setRatingComment(event.target.value)}
                  placeholder="Optional comment"
                  className="mt-3 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"
                />
                <button type="button" disabled={busy} onClick={rate} className="mt-3 rounded-xl bg-[#183b3a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {busy ? "Submitting..." : "Submit rating"}
                </button>
              </div>
            )}
          </section>
        )}

        {isCancelledOrDeclined && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">
              {status === "expired" ? "This request expired" : `Request ${status.includes("declined") || status === "rejected" ? "declined" : "cancelled"}`}
            </p>
            {match.cancellation?.reason && <p className="mt-2 text-sm text-[#62645f]">{match.cancellation.reason}</p>}
            {isSender && (status === "rejected" || status === "declined") && (
              <Link href="/requests/new" className="mt-4 inline-block rounded-xl bg-[#e85b43] px-5 py-3 text-sm font-semibold text-white">
                Find another traveller
              </Link>
            )}
          </section>
        )}
      </main>

      <ConfirmModal
        open={cancelOpen}
        title="Cancel this request?"
        message={
          isSender
            ? isEarlyCancellation(relevantDate)
              ? `You'll be refunded ₹${refund} in full — there is no cancellation fee.`
              : `You'll be refunded ₹${refund} of ₹${price} — a ${Math.round(FEE_PCT * 100)}% fee applies for cancelling this close to pickup.`
            : isEarlyCancellation(relevantDate)
              ? `${counterpart} will be fully refunded. This will not affect your reliability score.`
              : `${counterpart} will be fully refunded. This will be recorded against your reliability score.`
        }
        confirmLabel={busy ? "Cancelling..." : "Confirm cancel"}
        cancelLabel="Go back"
        destructive
        loading={busy}
        onCancel={() => setCancelOpen(false)}
        onConfirm={cancel}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete past request?"
        message="This removes the request from your history. It will not cancel or delete the delivery record for the other participant."
        confirmLabel={busy ? "Deleting..." : "Delete from history"}
        cancelLabel="Go back"
        destructive
        loading={busy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={deleteFromHistory}
      />
      <SiteFooter />
    </div>
  );
}
