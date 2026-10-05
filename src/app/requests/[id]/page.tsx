"use client";

import { Suspense, use, useEffect, useRef, useState, type ClipboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, IndianRupee, MessageCircle, Phone, Share2, Trash2 } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DeclineEvidenceGallery } from "@/components/ui/decline-evidence-gallery";
import { ParcelPhotoGallery } from "@/components/ui/parcel-photo-gallery";
import {
  cancelParcelMatch,
  confirmHandoff,
  createPaymentOrder,
  deletePastParcelMatch,
  getParcelMatch,
  initiateHandoff,
  mockConfirmPayment,
  respondToCounterOffer,
  signCheckoutHash,
  submitMatchRating,
  type PaymentOrder,
} from "@/services/parcel-matches";
import { redirectToPayUHostedCheckout } from "@/lib/payu";
import { getTravelPlanById } from "@/services/travel-plans";
import { extractOneItem, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { CANCELLABLE_STATUSES, effectiveStatus, getRequestStatusLabel, relevantMatchDate } from "@/lib/parcel-status";
import { declineReasonLabel } from "@/lib/decline-reasons";
import { cancelReasonLabel } from "@/lib/cancel-reasons";
import { formatCategory } from "@/lib/format-category";

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
  return date.getTime() - Date.now() > 48 * 60 * 60 * 1000;
};

// useSearchParams() opts the page out of static rendering unless it's
// wrapped in its own Suspense boundary — next build's prerender step fails
// outright without this.
export default function ParcelRequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f2eb]" />}>
      <ParcelRequestDetailsContent id={id} />
    </Suspense>
  );
}

function ParcelRequestDetailsContent({ id }: { id: string }) {
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
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [handoffOtp, setHandoffOtp] = useState<string | null>(null);
  const [handoffDigits, setHandoffDigits] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const handoffInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const refresh = () =>
    getParcelMatch(id)
      .then((response) => {
        const updated = extractOneItem<ParcelMatch>(response) || null;
        if (updated?.cancellation) {
          console.log("[REFUND] cancellation on refresh:", {
            matchId: id,
            refundStatus: updated.cancellation.refundStatus,
            refundAmount: updated.cancellation.refundAmount,
            refundTransactionId: updated.cancellation.refundTransactionId,
            refundFailureReason: updated.cancellation.refundFailureReason,
          });
        }
        setMatch(updated);
      })
      .catch((refreshError) => {
        console.error("[REFUND] refresh failed:", refreshError);
        setError("We could not load this request.");
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!match) return;
    const status = String(match.status || "").toLowerCase();
    if (isSender && ["confirmed", "picked_up", "in_transit"].includes(status) && !handoffOtp) {
      initiateHandoff(id)
        .then((response) => {
          const otp = response?.handoff?.otp || null;
          setHandoffOtp(otp ? String(otp) : null);
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.status, handoffOtp]);

  useEffect(() => {
    if (!isSender && match?.travelPlanId) {
      getTravelPlanById(match.travelPlanId)
        .then((response) => setTravelPlan(extractOneItem<TravelPlan>(response) || null))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.travelPlanId]);

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
  // Role-scoped amounts (see transitorder's NewParcelMatchView) — this
  // caller only ever receives the field(s) for their own role. For the
  // sender, price is the pre-GST amount they offered (senderOfferedAmount);
  // for the traveler, it's what they'll actually receive
  // (travelerPayoutAmount).
  const price = (isSender ? match.senderOfferedAmount : match.travelerPayoutAmount) || 0;
  // match.senderPayableAmount is the sender's real checkout total (offered
  // amount + platform commission + GST) — only ever populated for the
  // sender, and only once the match has been accepted or later. Never
  // recompute the GST-inclusive total client-side — it's whatever
  // transitorder's computeAmountViews actually charges (match.Pricing.
  // TotalPayableAmount), and that formula has changed shape more than once.
  // A hardcoded multiplier here silently drifts out of sync with the real
  // amount createPaymentOrder returns.
  const payableAmount = (isSender && match.senderPayableAmount) || price;
  const packageCount = match.packageCount && match.packageCount > 0 ? match.packageCount : 1;
  const counterpart = isSender ? match.travelerName || "Traveller" : match.senderName || "Sender";
  const counterpartPhone = String(
    (isSender ? match.travelerPhone : match.senderPhone) ||
      (isSender
        ? (match.traveler as { phone?: string } | undefined)?.phone
        : (match.sender as { phone?: string } | undefined)?.phone) ||
      "",
  );
  const canCancel = CANCELLABLE_STATUSES.has(status);
  const isPendingLike = ["pending", "negotiating", "countered", "searching"].includes(status);
  const isPayGate = ["accepted", "accepted_awaiting_payment", "awaiting_payment", "payment_initiated"].includes(status);
  const isConfirmed = status === "confirmed";
  // Matches mobile's CHAT_OPEN_STATUSES — chat/call stay available through
  // an active post-pickup support case (interrupted_in_transit,
  // awaiting_recipient), just not once it's handed to admin (return_pending).
  const showContactActions = ["confirmed", "picked_up", "in_transit", "delivered", "awaiting_recipient", "interrupted_in_transit"].includes(status);
  const isInTransit = ["picked_up", "in_transit"].includes(status);
  const isCompleted = ["delivered", "completed"].includes(status);
  const isCancelledOrDeclined = ["cancelled", "cancelled_by_sender", "cancelled_by_traveler", "rejected", "declined", "expired"].includes(status);
  const isNotPickedUp = status === "not_picked_up";
  const isInterrupted = status === "interrupted_in_transit";
  const isAwaitingRecipient = status === "awaiting_recipient";
  const isReturnPending = status === "return_pending";
  const canDeleteFromHistory = isCompleted || isCancelledOrDeclined || isNotPickedUp;
  // A traveler declining at pickup inspection (AcknowledgeInspection,
  // Accepted:false) lands on the same cancelled_by_traveler status as a
  // normal self-serve cancel, but never populates `cancellation` — only
  // declineReasonCode/declineEvidenceImageIds/disputeReason. Branch on
  // declineReasonCode being present to tell the two apart.
  const isInspectionDecline = isCancelledOrDeclined && Boolean(match.declineReasonCode);
  const cancellationActor =
    match.cancellation?.cancelledBy || (isInspectionDecline || status === "cancelled_by_traveler" ? "traveler" : "sender");
  const cancellationWasByViewer = (isSender && cancellationActor === "sender") || (!isSender && cancellationActor === "traveler");
  // The backend always sets cancellation.cancelledByName (cancelMatch in
  // parcel_match.go falls back to a fresh user lookup when it can't derive
  // one) — counterpart is only a defensive fallback for the one path that
  // never populates `cancellation` at all (inspection decline).
  const cancellationActorName =
    match.cancellation?.cancelledByName || counterpart || (cancellationActor === "traveler" ? "The traveller" : "The sender");
  const cancellationReasonText = isInspectionDecline
    ? declineReasonLabel(match.declineReasonCode)
    : match.cancellation?.reason || cancelReasonLabel(match.cancellation?.reasonCode, cancellationActor);
  // "late" (within the cancellation-fee/reliability-hit window) or an
  // inspection decline (always disputed) — a free/early cancel is a
  // legitimate, consequence-free action, so the platform-takes-this-
  // seriously reassurance below only makes sense for the cases that
  // actually carry a fee or reliability impact (cancellationOutcome in
  // transitorder's parcel_match.go).
  const isConsequentialCancellation = isInspectionDecline || match.cancellation?.policy === "late";

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
      const order = await createPaymentOrder(id, "web");
      setPaymentOrder(order);
      if (!order.checkoutUrl) {
        throw new Error("Payment is not available right now. Please try again shortly.");
      }
      const { hash } = await signCheckoutHash(order.transactionId, "hosted_checkout_hash");
      redirectToPayUHostedCheckout(order, hash);
      // Browser is navigating to PayU now — leave busy=true so "Pay now" can't be clicked again.
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start payment.");
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

  // The sender's cancellation fee/refund is based on what they actually
  // paid (payableAmount), not the shared agreed amount — matching the
  // backend's own cancellationOutcome calculation.
  const fee = isEarlyCancellation(relevantDate) ? 0 : Math.round(payableAmount * FEE_PCT);
  const refund = Math.max(0, payableAmount - fee);

  const submitHandoffCode = async () => {
    if (handoffDigits.length !== 4 || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffError("");
    try {
      const response = await confirmHandoff(id, handoffDigits);
      const updatedMatch = extractOneItem<ParcelMatch>(response) ||
        (response && "match" in response ? (response.match as ParcelMatch) : null);
      if (updatedMatch) setMatch(updatedMatch);
      setHandoffDigits("");
      await refresh();
    } catch (requestError) {
      setHandoffError(
        [400, 401, 403].includes((requestError as { status?: number })?.status || 0)
          ? "That code does not match. Double-check with the other participant and try again."
          : requestError instanceof Error
            ? requestError.message
            : "We could not confirm this handoff. Please try again.",
      );
    } finally {
      setHandoffBusy(false);
    }
  };

  const updateHandoffDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const nextDigits = handoffDigits.split("").slice(0, 4);
    nextDigits[index] = value;
    const nextCode = nextDigits.join("").slice(0, 4);
    setHandoffDigits(nextCode);
    setHandoffError("");
    if (value && index < 3) handoffInputRefs.current[index + 1]?.focus();
  };

  const handleHandoffPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    setHandoffDigits(pasted);
    setHandoffError("");
    handoffInputRefs.current[Math.min(pasted.length, 4) - 1]?.focus();
  };

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
            <Avatar
              userId={isSender ? match.travelerUserId : match.senderUserId}
              name={counterpart}
              className="size-12 text-base"
            />
            <h1 className="text-3xl font-semibold">{counterpart}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showContactActions && (
                <>
                  <Link
                    href={`/requests/${id}/chat?role=${role}`}
                    title={`Message ${counterpart}`}
                    aria-label={`Message ${counterpart}`}
                    className="grid size-9 place-items-center rounded-full border border-white/30 text-[#c5d4ce] transition hover:border-[#e7b65c] hover:text-[#e7b65c]"
                  >
                    <MessageCircle size={16} />
                  </Link>
                  <a
                    href={counterpartPhone ? `tel:${counterpartPhone}` : undefined}
                    aria-disabled={!counterpartPhone}
                    title={counterpartPhone ? `Call ${counterpart}` : "Phone number unavailable"}
                    aria-label={counterpartPhone ? `Call ${counterpart}` : "Phone number unavailable"}
                    className={`grid size-9 place-items-center rounded-full bg-[#0f6e56] text-white transition hover:bg-[#285c59] ${!counterpartPhone ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <Phone size={15} />
                  </a>
                </>
              )}
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
          </div>
          <p className="mt-3 text-sm text-[#c5d4ce]">{match.parcelDescription || formatCategory(match.parcelCategory) || "Parcel request"}</p>
          <div className="mt-4 grid gap-2 text-sm text-[#c5d4ce] sm:grid-cols-2">
            <p>
              {match.from?.address || "Pickup"} <span className="text-[#e7b65c]">→</span> {match.to?.address || "Destination"}
            </p>
            <p>By {formatDateTime(relevantDate)}</p>
          </div>
          {/* Earning/offer figures make no sense once a request is cancelled,
              declined, a no-show, or interrupted post-pickup — the traveler
              either never gets paid normally or the delivery never
              completed, and showing "your rate"/"your offer total" there is
              actively misleading. This block was previously unconditional. */}
          {!isCancelledOrDeclined && !isNotPickedUp && !isInterrupted && !isAwaitingRecipient && !isReturnPending && (() => {
            // Traveler: rate is the trip's own listed per-package price —
            // total = rate × count (a reference, not what was agreed).
            // Sender: price (match.senderOfferedAmount) is already the
            // pre-GST total the sender offered — divide back down for the
            // per-package figure in the breakdown pill, don't multiply again.
            const rate = !isSender ? travelPlan?.pricePerPackage : price ? price / packageCount : undefined;
            if (rate == null) {
              return <p className="mt-4 text-xl font-semibold">{price ? `₹${price}` : "Offer pending"}</p>;
            }
            const total = !isSender ? rate * packageCount : price;
            return (
              <div className="mt-5 flex flex-col items-center rounded-2xl bg-white/10 px-6 py-7 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c5d4ce]">
                  {!isSender ? "Your rate for this request" : "Your offer total"}
                </p>
                <p className="mt-1.5 text-4xl font-semibold text-[#e7b65c]">₹{total}</p>
                <span className="mt-3 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white">
                  ₹{Number(rate.toFixed(2))} × {packageCount} package{packageCount > 1 ? "s" : ""}
                </span>
              </div>
            );
          })()}
          <span className="mt-3 inline-block rounded-full bg-[#e7b65c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#183b3a]">
            {status === "expired" ? "Expired" : getRequestStatusLabel(match.status, role)}
          </span>
        </section>

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        <ParcelPhotoGallery matchId={id} imageIds={match.parcelImageIds || []} canManage={isSender} onChanged={refresh} />

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
                </div>
              </>
            )}
          </section>
        )}

        {isPayGate && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            {isSender ? (
              <>
                <p className="text-sm font-semibold text-[#183b3a]">Confirm and pay ₹{payableAmount}</p>
                {!paymentOrder ? (
                  <button type="button" disabled={busy} onClick={startPayment} className="mt-4 rounded-xl bg-[#e85b43] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {busy ? "Redirecting to PayU..." : "Pay now"}
                  </button>
                ) : (
                  <div className="mt-4 border-l-2 border-[#e7b65c] bg-white p-4">
                    <p className="text-sm font-semibold text-[#183b3a]">Redirecting you to PayU...</p>
                    <p className="mt-1 text-sm text-[#62645f]">Complete the payment on PayU&apos;s secure page. You&apos;ll be brought back here automatically.</p>
                    {process.env.NODE_ENV !== "production" && (
                      <button type="button" disabled={busy} onClick={testConfirm} className="mt-4 rounded-xl border border-[#d7d2c9] px-4 py-2 text-sm font-semibold text-[#183b3a] disabled:opacity-60">
                        {busy ? "Confirming..." : "Test confirm (dev, skip PayU)"}
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
                <p className="text-sm font-semibold text-[#183b3a]">Amount paid: ₹{payableAmount}</p>
                {handoffOtp ? (
                  <div className="mt-4 border-l-2 border-[#e7b65c] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Pickup code</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-3xl font-semibold tracking-[0.3em] text-[#183b3a]">{handoffOtp}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(handoffOtp).then(() => {
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
              <>
                <p className="text-sm font-semibold text-[#183b3a]">Submit pickup code</p>
                <p className="mt-2 text-sm text-[#62645f]">Ask {counterpart} for the 4-digit pickup code shown on their screen.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex gap-2" role="group" aria-label="Pickup code">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        ref={(element) => { handoffInputRefs.current[index] = element; }}
                        inputMode="numeric"
                        maxLength={1}
                        value={handoffDigits[index] || ""}
                        onChange={(event) => updateHandoffDigit(index, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace" && !handoffDigits[index] && index > 0) handoffInputRefs.current[index - 1]?.focus();
                        }}
                        onPaste={handleHandoffPaste}
                        aria-label={`Pickup code digit ${index + 1}`}
                        className="size-12 rounded-xl border border-[#d7d2c9] bg-white text-center text-xl font-semibold text-[#183b3a] outline-none focus:border-[#e85b43] focus:ring-2 focus:ring-[#e85b43]/15"
                      />
                    ))}
                  </div>
                  <button type="button" disabled={handoffDigits.length !== 4 || handoffBusy} onClick={submitHandoffCode} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {handoffBusy ? "Confirming..." : "Confirm pickup"}
                  </button>
                </div>
                {handoffError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{handoffError}</p>}
                {!isSender && canCancel && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="mt-4 block text-sm font-semibold text-[#b33e2c]">
                    Cancel this request
                  </button>
                )}
              </>
            )}
          </section>
        )}

        {isInTransit && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">{status === "picked_up" ? "Picked up" : "In transit"}</p>
            {isSender ? (
              <>
                <p className="mt-2 text-sm text-[#62645f]">Share this delivery code with {counterpart} when the parcel arrives.</p>
                {handoffOtp ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-l-2 border-[#e7b65c] bg-white p-4">
                    <p className="text-3xl font-semibold tracking-[0.3em] text-[#183b3a]">{handoffOtp}</p>
                    <button type="button" onClick={() => navigator.clipboard?.writeText(handoffOtp)} className="flex items-center gap-1.5 rounded-full border border-[#d7d2c9] px-3 py-1.5 text-xs font-semibold text-[#183b3a] hover:border-[#e85b43]"><Copy size={13} /> Copy</button>
                    <button type="button" onClick={() => navigator.share?.({ text: `Delivery code for your Trickle parcel: ${handoffOtp}` })} className="flex items-center gap-1.5 rounded-full bg-[#183b3a] px-3 py-1.5 text-xs font-semibold text-white"><Share2 size={13} /> Share</button>
                  </div>
                ) : <p className="mt-3 text-sm text-[#62645f]">Preparing your delivery code...</p>}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-[#62645f]">You&apos;re carrying this parcel to {match.to?.address || "its destination"}. Ask the recipient for the delivery code to complete the handoff.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex gap-2" role="group" aria-label="Delivery code">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        ref={(element) => { handoffInputRefs.current[index] = element; }}
                        inputMode="numeric"
                        maxLength={1}
                        value={handoffDigits[index] || ""}
                        onChange={(event) => updateHandoffDigit(index, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace" && !handoffDigits[index] && index > 0) handoffInputRefs.current[index - 1]?.focus();
                        }}
                        onPaste={handleHandoffPaste}
                        aria-label={`Delivery code digit ${index + 1}`}
                        className="size-12 rounded-xl border border-[#d7d2c9] bg-white text-center text-xl font-semibold text-[#183b3a] outline-none focus:border-[#e85b43] focus:ring-2 focus:ring-[#e85b43]/15"
                      />
                    ))}
                  </div>
                  <button type="button" disabled={handoffDigits.length !== 4 || handoffBusy} onClick={submitHandoffCode} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {handoffBusy ? "Confirming..." : "Submit delivery code"}
                  </button>
                </div>
                {handoffError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{handoffError}</p>}
              </>
            )}
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
              {status === "expired"
                ? "This request expired"
                : status.includes("declined") || status === "rejected"
                  ? "Request declined"
                  : cancellationWasByViewer
                    ? "You cancelled this request"
                    : `${cancellationActorName} cancelled this request`}
            </p>
            {status !== "expired" && !status.includes("declined") && status !== "rejected" && (
              <p className="mt-2 text-sm text-[#62645f]">
                {cancellationWasByViewer ? "The other participant has been notified." : "This delivery is now closed."}
              </p>
            )}
            {cancellationReasonText && <p className="mt-2 text-sm text-[#62645f]">{cancellationReasonText}</p>}
            {isInspectionDecline && (
              <DeclineEvidenceGallery matchId={id} imageIds={match.declineEvidenceImageIds || []} />
            )}
            {!cancellationWasByViewer && isConsequentialCancellation && (
              <p className="mt-3 border-t border-[#e4ded2] pt-3 text-xs leading-5 text-[#62645f]">
                We take cancellations like this seriously — it&apos;s been recorded against {cancellationActorName}&apos;s
                reliability score, and repeated instances can affect their standing on Trickle.
              </p>
            )}
            {isSender && match.cancellation?.refundStatus && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#b7e4d4] bg-[#e1f5ee] px-4 py-3.5">
                <IndianRupee size={16} className="mt-0.5 shrink-0 text-[#085041]" />
                <div>
                  <p className="text-sm font-semibold text-[#085041]">
                    {match.cancellation.refundStatus === "refund_completed"
                      ? `₹${match.cancellation.refundAmount} refunded`
                      : `₹${match.cancellation.refundAmount} refund in progress`}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#085041]">
                    {match.cancellation.refundStatus === "refund_completed"
                      ? "Already credited to your original payment method."
                      : "Refunds typically take 2-3 business days to reach your original payment method."}
                  </p>
                </div>
              </div>
            )}
            {isSender && (status === "rejected" || status === "declined") && (
              <Link href="/requests/new" className="mt-4 inline-block rounded-xl bg-[#e85b43] px-5 py-3 text-sm font-semibold text-white">
                Find another traveller
              </Link>
            )}
          </section>
        )}

        {isNotPickedUp && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">No-show reported</p>
            <p className="mt-2 text-sm text-[#62645f]">
              A report was filed that pickup didn&apos;t happen as planned. Our support team is reviewing it and will
              follow up directly once there&apos;s an update.
            </p>
          </section>
        )}

        {(isInterrupted || isAwaitingRecipient || isReturnPending) && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            <p className="text-sm font-semibold text-[#183b3a]">
              {isInterrupted
                ? "This delivery was interrupted"
                : isAwaitingRecipient
                  ? "Waiting for the recipient"
                  : "This parcel is being returned"}
            </p>
            <p className="mt-2 text-sm text-[#62645f]">
              {isSender
                ? isInterrupted
                  ? "The traveller reported they couldn't complete this delivery. Our support team is reviewing it and will process any applicable refund — we'll keep you updated."
                  : isAwaitingRecipient
                    ? "The traveller has arrived but couldn't reach the recipient yet. They'll try again shortly."
                    : "This parcel couldn't be delivered and is being returned to you. Our support team is coordinating the return and any applicable refund."
                : isInterrupted
                  ? "This counts against your reliability score unless support verifies a genuine emergency. Make sure the parcel gets returned safely."
                  : isAwaitingRecipient
                    ? "Try reaching the recipient again, or report back if they remain unavailable."
                    : "Coordinate with support to return this parcel to the sender."}
            </p>
            {isInterrupted && !isSender && match.exceptionReason && (
              <div className="mt-4 border-t border-[#e4ded2] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8a8579]">Your reported reason</p>
                <p className="mt-1 text-sm text-[#62645f]">{match.exceptionReason}</p>
              </div>
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
              : `You'll be refunded ₹${refund} of ₹${payableAmount} — a ${Math.round(FEE_PCT * 100)}% fee applies for cancelling this close to pickup.`
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
      >
        {!isEarlyCancellation(relevantDate) && (
          <p className="mt-3 rounded-xl border border-[#fbe2b4] bg-[#fff6e8] px-3 py-2.5 text-xs leading-5 text-[#7a4e05]">
            {isSender
              ? "Cancelling this close to pickup isn't something we encourage — it leaves a traveller holding reserved capacity at short notice. Doing this often may affect how your account is reviewed."
              : `Cancelling this close to pickup isn't something we encourage — it leaves ${counterpart} without a traveller at short notice. Repeated late cancellations can lower your reliability badge and affect how your account is reviewed.`}
          </p>
        )}
        <Link href="/cancellation-policy" className="mt-3 inline-block text-xs font-semibold text-[#62645f] underline hover:text-[#1b1d1c]">
          Cancellation & refund policy
        </Link>
      </ConfirmModal>
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
