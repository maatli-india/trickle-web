"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  cancelTravelPlan,
  getTravelPlanById,
  listParcelMatchesForPlan,
  recordTravelPlanView,
  updateTravelPlan,
} from "@/services/travel-plans";
import { respondToCounterOffer } from "@/services/parcel-matches";
import { extractListItems, extractOneItem, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { canEditTrip, canCancelOrDeleteTrip, isTripPast } from "@/lib/trip-status";
import { RESPONDABLE_STATUSES, effectiveStatus, getRequestStatusLabel } from "@/lib/parcel-status";
import { avatarTint, initials } from "@/lib/home-constants";

const modeLabel = (mode?: string) => ({ by_flight: "Flight", by_train: "Train", by_road: "Road" }[mode || ""] || "Travel");
const formatDateTime = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
const tagLabel = (value: string) => value.replace(/_/g, " ");

export default function TripDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [requests, setRequests] = useState<ParcelMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingNewRequests, setAcceptingNewRequests] = useState(true);
  const [togglingAccepting, setTogglingAccepting] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "accept" | "reject" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getTravelPlanById(id), recordTravelPlanView(id), listParcelMatchesForPlan(id, { page: 1, limit: 100 })]).then(
      ([planResult, , matchesResult]) => {
        if (!active) return;
        if (planResult.status === "fulfilled") {
          const details = extractOneItem<TravelPlan>(planResult.value);
          if (details) {
            setPlan(details);
            if (typeof details.acceptingNewRequests === "boolean") setAcceptingNewRequests(details.acceptingNewRequests);
            const embedded = details.requesters || details.requests || [];
            const loaded = matchesResult.status === "fulfilled" ? extractListItems<ParcelMatch>(matchesResult.value as never) : [];
            setRequests(loaded.length ? loaded : embedded);
          }
        } else {
          setError("We could not load this trip.");
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-[#62645f]">Loading trip details...</main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl flex-1 px-5 py-16">
          <p className="text-[#b33e2c]">{error || "This trip could not be found."}</p>
          <Link href="/plans" className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
            Back to plans
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const past = isTripPast(plan);
  const status = String(plan.status || "").toLowerCase();
  const editable = canEditTrip(plan, requests);
  const cancellable = canCancelOrDeleteTrip(plan);
  const hasRequests = requests.length > 0;
  const confirmedCount = requests.filter((request) => ["accepted", "confirmed"].includes(String(request.status || "").toLowerCase())).length;
  const acceptedWeight = requests
    .filter((request) => ["accepted", "confirmed"].includes(String(request.status || "").toLowerCase()))
    .reduce((total, request) => total + Number(request.estimatedWeightKg || 0), 0);
  const maxParcelCount = Number(plan.maxParcelCount || 1);
  const maxWeightKg = Number(plan.maxWeightKg || 5);
  const capacityFull = confirmedCount >= maxParcelCount || acceptedWeight >= maxWeightKg;
  const pendingCount = !past ? requests.filter((request) => RESPONDABLE_STATUSES.has(String(request.status || "").toLowerCase())).length : 0;
  const pickup = plan.pickupHandovers?.length ? plan.pickupHandovers : plan.pickupHandover ? [plan.pickupHandover] : [];
  const delivery = plan.deliveryHandovers?.length ? plan.deliveryHandovers : plan.deliveryHandover ? [plan.deliveryHandover] : [];

  const respond = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      const response = await respondToCounterOffer(pendingAction.id, pendingAction.action);
      const updated = extractOneItem<ParcelMatch>(response);
      setRequests((current) =>
        current.map((request) =>
          request.id === pendingAction.id
            ? { ...request, ...updated, status: updated?.status || (pendingAction.action === "accept" ? "accepted" : "rejected") }
            : request,
        ),
      );
      setPendingAction(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update this request.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAccepting = async () => {
    setTogglingAccepting(true);
    const next = !acceptingNewRequests;
    try {
      await updateTravelPlan(plan.id, { ...plan, acceptingNewRequests: next, notifySenders: false });
      setAcceptingNewRequests(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update this trip.");
    } finally {
      setTogglingAccepting(false);
    }
  };

  const deleteTrip = async () => {
    setDeleting(true);
    try {
      await cancelTravelPlan(plan.id);
      router.push("/plans");
    } catch (requestError) {
      setDeleteOpen(false);
      setError(requestError instanceof Error ? requestError.message : "Could not delete this trip.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl flex-1 px-5 pb-32 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-8">
          <Link href="/plans" className="text-sm font-semibold text-[#e85b43]">
            ← Back to plans
          </Link>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Link href={`/plans/${plan.id}/edit`} className="rounded-full border border-[#d7d2c9] bg-white px-4 py-2 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43]">
                Edit
              </Link>
            )}
            {cancellable &&
              (hasRequests ? (
                <Link href={`/plans/${plan.id}/cancel`} className="rounded-full border border-[#e85b43]/40 bg-[#fff0eb] px-4 py-2 text-sm font-semibold text-[#b33e2c]">
                  Cancel trip
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-full border border-[#e85b43]/40 bg-[#fff0eb] px-4 py-2 text-sm font-semibold text-[#b33e2c]"
                >
                  Delete trip
                </button>
              ))}
          </div>
        </div>

        <section className="mt-6 border-t-2 border-[#e85b43] bg-[#183b3a] p-6 text-white sm:p-10">
          <span className="inline-block rounded-full bg-[#e7b65c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#183b3a]">{status || "active"}</span>
          <h1 className="mt-4 text-3xl font-semibold">
            {plan.from?.address || "From"} <span className="text-[#e7b65c]">→</span> {plan.to?.address || "To"}
          </h1>
          <div className="mt-4 grid gap-2 text-sm text-[#c5d4ce] sm:grid-cols-2">
            <p>{modeLabel(plan.travelMode)}</p>
            <p>Departure · {formatDateTime(plan.departureDate)}</p>
            <p>Arrival · {formatDateTime(plan.arrivalDate)}</p>
            {plan.maxWeightKg && <p>Up to {plan.maxWeightKg} kg</p>}
            {plan.pricePerPackage && <p>₹{plan.pricePerPackage} / package</p>}
          </div>
        </section>

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        <section className="mt-6 grid grid-cols-3 gap-3">
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-4 text-center">
            <p className="text-2xl font-semibold text-[#183b3a]">{plan.views ?? 0}</p>
            <p className="text-xs text-[#62645f]">Views</p>
          </div>
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-4 text-center">
            <p className="text-2xl font-semibold text-[#183b3a]">{requests.length}</p>
            <p className="text-xs text-[#62645f]">Requests</p>
          </div>
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-4 text-center">
            <p className="text-2xl font-semibold text-[#183b3a]">{confirmedCount}</p>
            <p className="text-xs text-[#62645f]">Confirmed</p>
          </div>
        </section>

        <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Packages</p>
              <p className="mt-1 text-lg font-semibold text-[#183b3a]">
                {confirmedCount} <span className="text-sm font-normal text-[#a7a297]">/ {maxParcelCount}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e0d5]">
                <div
                  className={`h-full rounded-full ${confirmedCount >= maxParcelCount ? "bg-[#b33e2c]" : "bg-[#e85b43]"}`}
                  style={{ width: `${Math.min((confirmedCount / maxParcelCount) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Weight</p>
              <p className="mt-1 text-lg font-semibold text-[#183b3a]">
                {acceptedWeight.toFixed(1)} <span className="text-sm font-normal text-[#a7a297]">/ {maxWeightKg} kg</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e0d5]">
                <div
                  className={`h-full rounded-full ${acceptedWeight >= maxWeightKg ? "bg-[#b33e2c]" : "bg-[#e85b43]"}`}
                  style={{ width: `${Math.min((acceptedWeight / maxWeightKg) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {capacityFull && <p className="mt-4 border-t border-[#ded8ce] pt-3 text-xs font-semibold text-[#b33e2c]">Full — not appearing in new searches</p>}
          {!past && (
            <div className="mt-4 flex items-center justify-between border-t border-[#ded8ce] pt-4">
              <div>
                <p className="text-sm font-semibold text-[#183b3a]">Accepting new requests</p>
                <p className="text-xs text-[#62645f]">{acceptingNewRequests ? "Senders can still request this trip." : "Closed to new requests."}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={acceptingNewRequests}
                disabled={togglingAccepting}
                onClick={toggleAccepting}
                className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${acceptingNewRequests ? "bg-[#285c59]" : "bg-[#d7d2c9]"}`}
              >
                <span className={`block size-5 rounded-full bg-white transition ${acceptingNewRequests ? "translate-x-5" : ""}`} />
              </button>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold text-[#183b3a]">Pickup</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(pickup.length ? pickup : ["Not specified"]).map((value) => (
                <span key={value} className="rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-medium capitalize text-[#285c59]">{tagLabel(value)}</span>
              ))}
            </div>
          </div>
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold text-[#183b3a]">Delivery</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(delivery.length ? delivery : ["Not specified"]).map((value) => (
                <span key={value} className="rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-medium capitalize text-[#285c59]">{tagLabel(value)}</span>
              ))}
            </div>
          </div>
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold text-[#183b3a]">Can carry</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(plan.acceptedParcelTypes?.length ? plan.acceptedParcelTypes : ["All suitable items"]).map((value) => (
                <span key={value} className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-[#183b3a]">{tagLabel(value)}</span>
              ))}
            </div>
          </div>
          <div className="border border-[#ded8ce] bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold text-[#183b3a]">Won&apos;t carry</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(plan.restrictedParcelTypes?.length ? plan.restrictedParcelTypes : ["Liquids", "Jewellery & valuables", "Cash & currency"]).map((value) => (
                <span key={value} className="rounded-full bg-[#fff0eb] px-3 py-1 text-xs font-medium capitalize text-[#b33e2c]">{tagLabel(value)}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold text-[#183b3a]">Requests for this trip ({requests.length})</h2>
          {pendingCount > 0 && (
            <p className="mt-3 rounded-xl border border-[#e7b65c]/50 bg-[#fff4d8] px-4 py-3 text-sm text-[#7a5310]">{pendingCount} awaiting your response</p>
          )}
          <div className="mt-4 space-y-3">
            {requests.map((request) => {
              const rawStatus = String(request.status || "").toLowerCase();
              const isExpiredRequest = past && effectiveStatus(rawStatus, request.targetDeliveryTime) === "expired";
              const respondable = !past && RESPONDABLE_STATUSES.has(rawStatus);
              const senderName = request.senderName || "Sender";
              const content = (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: avatarTint(senderName).bg, color: avatarTint(senderName).fg }}
                      >
                        {initials(senderName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#183b3a]">{senderName}</p>
                        <p className="truncate text-sm text-[#62645f]">{request.parcelDescription || request.parcelCategory || "Parcel request"}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#285c59]">
                      {request.agreedPrice ? `₹${request.agreedPrice}` : request.baseAmount ? `₹${request.baseAmount}` : "Offer pending"}
                    </p>
                  </div>
                  {respondable ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setPendingAction({ id: request.id, action: "reject" });
                        }}
                        className="flex-1 rounded-lg border border-[#d7d2c9] py-2 text-sm font-semibold text-[#62645f]"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setPendingAction({ id: request.id, action: "accept" });
                        }}
                        className="flex-1 rounded-lg bg-[#183b3a] py-2 text-sm font-semibold text-white"
                      >
                        Accept
                      </button>
                    </div>
                  ) : (
                    <span className="mt-3 inline-block rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-semibold text-[#285c59]">
                      {isExpiredRequest ? "Expired" : getRequestStatusLabel(rawStatus, "traveller")}
                    </span>
                  )}
                </>
              );
              return isExpiredRequest ? (
                <div key={request.id} className="border border-[#ded8ce] bg-[#fbfaf7] p-4 opacity-70">
                  {content}
                </div>
              ) : (
                <Link key={request.id} href={`/requests/${request.id}?role=traveller`} className="block border border-[#ded8ce] bg-[#fbfaf7] p-4 hover:border-[#e85b43]">
                  {content}
                </Link>
              );
            })}
            {!requests.length && <p className="text-sm text-[#62645f]">No requests for this trip yet.</p>}
          </div>
        </section>
      </main>

      <ConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.action === "accept" ? "Accept this request?" : "Decline this request?"}
        message={pendingAction?.action === "accept" ? "The sender will be notified that you accepted their parcel request." : "This request will be declined and the sender will be notified."}
        confirmLabel={actionLoading ? "Updating..." : pendingAction?.action === "accept" ? "Accept request" : "Decline request"}
        destructive={pendingAction?.action !== "accept"}
        loading={actionLoading}
        onCancel={() => setPendingAction(null)}
        onConfirm={respond}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Delete this trip?"
        message="This can't be undone, but since no one has requested it, nothing else is affected."
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Go back"
        destructive
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={deleteTrip}
      />

      <SiteFooter />
    </div>
  );
}
