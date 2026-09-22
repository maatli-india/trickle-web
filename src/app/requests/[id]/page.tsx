"use client";

import { use, useEffect, useRef, useState, type ClipboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Copy, IndianRupee, MessageCircle, Phone, MessageSquare, Share2, Trash2 } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [handoffOtp, setHandoffOtp] = useState<string | null>(null);
  const [handoffDigits, setHandoffDigits] = useState("");
  const [handoffError, setHandoffError] = useState("");
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterResponse, setCounterResponse] = useState<"accept" | "reject" | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
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
  const offerHistory = match.offerHistory || [];
  const originalOffer = offerHistory.find(
    (offer) =>
      offer.proposedByUserId === match.senderUserId ||
      offer.proposedByUserID === match.senderUserId ||
      offer.proposedBy === "sender",
  ) || offerHistory[0];
  const latestOffer = offerHistory[offerHistory.length - 1];
  const hasCounterOffer = offerHistory.length > 1 && latestOffer?.baseAmount != null;
  const canRespondToCounterOffer =
    isSender && hasCounterOffer && latestOffer?.status === "pending";
  const originalOfferAmount = originalOffer?.baseAmount ?? match.baseAmount ?? 0;
  const counterOfferAmount = latestOffer?.baseAmount ?? 0;
  const counterOfferFrom =
    latestOffer?.proposedByUserId === match.senderUserId ||
    latestOffer?.proposedByUserID === match.senderUserId ||
    latestOffer?.proposedBy === "sender"
      ? match.senderName || "Sender"
      : match.travelerName || "Traveller";
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
  const showContactActions = ["confirmed", "picked_up", "in_transit", "delivered"].includes(status);
  const isInTransit = ["picked_up", "in_transit"].includes(status);
  const isCompleted = ["delivered", "completed"].includes(status);
  const isCancelledOrDeclined = ["cancelled", "cancelled_by_sender", "cancelled_by_traveler", "rejected", "declined", "expired"].includes(status);
  const canDeleteFromHistory = isCompleted || isCancelledOrDeclined;
  const cancellationActor = match.cancellation?.cancelledBy || (status === "cancelled_by_traveler" ? "traveler" : "sender");
  const cancellationWasByViewer = (isSender && cancellationActor === "sender") || (!isSender && cancellationActor === "traveler");

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

  const confirmCounterResponse = async () => {
    if (!counterResponse) return;
    const action = counterResponse;
    setCounterResponse(null);
    if (action === "accept" && canRespondToCounterOffer) {
      await acceptCounterOfferAndPay();
      return;
    }
    await respond(action);
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

  const acceptCounterOfferAndPay = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await respondToCounterOffer(id, "accept");
      const acceptedMatch = extractOneItem<ParcelMatch>(response);
      if (acceptedMatch) setMatch(acceptedMatch);
      const order = await createPaymentOrder(id, "web");
      setPaymentOrder(order);
      if (!order.checkoutUrl) {
        throw new Error("Payment is not available right now. Please try again shortly.");
      }
      const { hash } = await signCheckoutHash(order.transactionId, "hosted_checkout_hash");
      redirectToPayUHostedCheckout(order, hash);
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

  const fee = isEarlyCancellation(relevantDate) ? 0 : Math.round(price * FEE_PCT);
  const refund = Math.max(0, price - fee);

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
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold"
              style={{ backgroundColor: avatarTint(counterpart).bg, color: avatarTint(counterpart).fg }}
            >
              {initials(counterpart)}
            </span>
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

        {hasCounterOffer && (
          <section className="mt-6 border-2 border-[#e7b65c] bg-[#fff8e7] p-6 shadow-[0_8px_24px_rgba(231,182,92,0.16)]" aria-label="Counter offer details">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7b65c] text-[#183b3a]">
                <MessageSquare size={18} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a641d]">Counter offer</p>
                <h2 className="mt-1 text-xl font-semibold text-[#183b3a]">
                  {counterOfferFrom} proposed a new amount
                </h2>
              </div>
            </div>
            <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="border border-[#ead9ad] bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#81745c]">Original offer</p>
                <p className="mt-1 text-2xl font-bold text-[#62645f]">₹{originalOfferAmount}</p>
              </div>
              <ArrowRight className="hidden text-[#b8892d] sm:block" size={20} aria-hidden="true" />
              <div className="border-2 border-[#e7b65c] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8a641d]">Counter amount</p>
                <p className="mt-1 text-3xl font-bold text-[#183b3a]">₹{counterOfferAmount}</p>
              </div>
            </div>
            {latestOffer?.comment && (
              <p className="mt-4 border-l-2 border-[#e7b65c] pl-3 text-sm leading-6 text-[#62645f]">“{latestOffer.comment}”</p>
            )}
          </section>
        )}

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        {isPendingLike && (
          <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
            {canRespondToCounterOffer ? (
              <>
                <p className="text-sm font-semibold text-[#183b3a]">Review {counterpart}&apos;s counter offer.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={busy} onClick={() => setCounterResponse("reject")} className="rounded-xl border border-[#d7d2c9] px-5 py-3 text-sm font-semibold text-[#62645f] disabled:opacity-60">
                    Decline counter offer
                  </button>
                  <button type="button" disabled={busy} onClick={() => setCounterResponse("accept")} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    Confirm and pay
                  </button>
                </div>
                {canCancel && (
                  <button type="button" onClick={() => setCancelOpen(true)} className="mt-4 rounded-xl border border-[#e85b43]/40 bg-[#fff0eb] px-5 py-3 text-sm font-semibold text-[#b33e2c]">
                    Cancel this request
                  </button>
                )}
              </>
            ) : isSender ? (
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
                <p className="text-sm font-semibold text-[#183b3a]">Amount paid: ₹{price}</p>
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
                    : `${cancellationActor === "traveler" ? "The traveller" : "The sender"} cancelled this request`}
            </p>
            {status !== "expired" && !status.includes("declined") && status !== "rejected" && (
              <p className="mt-2 text-sm text-[#62645f]">
                {cancellationWasByViewer ? "The other participant has been notified." : "This delivery is now closed."}
              </p>
            )}
            {match.cancellation?.reason && <p className="mt-2 text-sm text-[#62645f]">{match.cancellation.reason}</p>}
            {isSender && match.cancellation?.refundStatus && (
              <div
                className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
                  match.cancellation.refundStatus === "refund_failed" ? "border-[#f2cabd] bg-[#fff0eb]" : "border-[#b7e4d4] bg-[#e1f5ee]"
                }`}
              >
                {match.cancellation.refundStatus === "refund_failed" ? (
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#b33e2c]" />
                ) : (
                  <IndianRupee size={16} className="mt-0.5 shrink-0 text-[#085041]" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${match.cancellation.refundStatus === "refund_failed" ? "text-[#b33e2c]" : "text-[#085041]"}`}>
                    {match.cancellation.refundStatus === "refund_completed" && `₹${match.cancellation.refundAmount} refunded`}
                    {(match.cancellation.refundStatus === "refund_pending" || match.cancellation.refundStatus === "refund_processing") &&
                      `₹${match.cancellation.refundAmount} refund in progress`}
                    {match.cancellation.refundStatus === "refund_failed" && `₹${match.cancellation.refundAmount} refund failed`}
                  </p>
                  <p className={`mt-1 text-xs leading-5 ${match.cancellation.refundStatus === "refund_failed" ? "text-[#b33e2c]" : "text-[#085041]"}`}>
                    {match.cancellation.refundStatus === "refund_completed" && "Already credited to your original payment method."}
                    {(match.cancellation.refundStatus === "refund_pending" || match.cancellation.refundStatus === "refund_processing") &&
                      "This can take a few days to reach your original payment method."}
                    {match.cancellation.refundStatus === "refund_failed" && (
                      <>
                        {match.cancellation.refundFailureReason || "We couldn't process this refund automatically."}{" "}
                        <Link href="/support" className="font-semibold underline">
                          Contact support
                        </Link>
                      </>
                    )}
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
        open={counterResponse !== null}
        title={counterResponse === "accept" ? "Confirm and pay for this counter offer?" : "Decline this counter offer?"}
        message={
          counterResponse === "accept"
            ? `Confirm ${counterpart}'s counter offer of ₹${counterOfferAmount}? You'll be taken to secure payment before pickup is arranged.`
            : `Decline ${counterpart}'s counter offer of ₹${counterOfferAmount}? This request will be closed.`
        }
        confirmLabel={busy ? (counterResponse === "accept" ? "Opening payment..." : "Declining...") : counterResponse === "accept" ? "Confirm and pay" : "Decline counter offer"}
        cancelLabel="Review again"
        destructive={counterResponse === "reject"}
        loading={busy}
        onCancel={() => setCounterResponse(null)}
        onConfirm={confirmCounterResponse}
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
