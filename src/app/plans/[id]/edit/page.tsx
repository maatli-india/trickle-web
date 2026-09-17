"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getTravelPlanById, listParcelMatchesForPlan, updateTravelPlan } from "@/services/travel-plans";
import { extractListItems, extractOneItem, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { isTripPast, majorEditBlocked, majorChangeAllowanceUsed, hasPickedUpRequest } from "@/lib/trip-status";
import {
  DELIVERY,
  DELIVERY_API_TYPES,
  DELIVERY_KEY_FROM_API,
  PICKUP,
  PICKUP_API_TYPES,
  PICKUP_KEY_FROM_API,
  apiDate,
} from "@/lib/trip-form-constants";
import { inputClass, labelClass } from "@/components/forms/location-fields";

const keysFromApiValues = (values: string[] | undefined, single: string | undefined, map: Record<string, string>): Set<string> => {
  const source = values?.length ? values : single ? [single] : [];
  return new Set(source.map((value) => map[value]).filter(Boolean) as string[]);
};
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((value) => b.has(value));

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [requests, setRequests] = useState<ParcelMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingMajor, setConfirmingMajor] = useState(false);
  const [blockedAttempt, setBlockedAttempt] = useState(false);

  const [departureTime, setDepartureTime] = useState("");
  const [pickup, setPickup] = useState<Set<string>>(new Set());
  const [delivery, setDelivery] = useState<Set<string>>(new Set());
  const [maxWeight, setMaxWeight] = useState("5");
  const [maxParcelCount, setMaxParcelCount] = useState("1");
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getTravelPlanById(id), listParcelMatchesForPlan(id, { page: 1, limit: 100 })]).then(([planResult, matchesResult]) => {
      if (!active) return;
      const loadedPlan = planResult.status === "fulfilled" ? extractOneItem<TravelPlan>(planResult.value) : null;
      const loadedRequests = matchesResult.status === "fulfilled" ? extractListItems<ParcelMatch>(matchesResult.value as never) : [];
      if (loadedPlan) {
        setPlan(loadedPlan);
        setRequests(loadedRequests.length ? loadedRequests : loadedPlan.requesters || loadedPlan.requests || []);
        const departure = new Date(String(loadedPlan.departureDate).replace(" ", "T"));
        if (!Number.isNaN(departure.getTime())) {
          setDepartureTime(`${String(departure.getHours()).padStart(2, "0")}:${String(departure.getMinutes()).padStart(2, "0")}`);
        }
        setPickup(keysFromApiValues(loadedPlan.pickupHandovers, loadedPlan.pickupHandover, PICKUP_KEY_FROM_API));
        setDelivery(keysFromApiValues(loadedPlan.deliveryHandovers, loadedPlan.deliveryHandover, DELIVERY_KEY_FROM_API));
        setMaxWeight(String(loadedPlan.maxWeightKg || 5));
        setMaxParcelCount(String(loadedPlan.maxParcelCount || 1));
        setNote(loadedPlan.additionalInfo || "");
      } else {
        setError("We could not load this trip.");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const initialPickup = useMemo(() => keysFromApiValues(plan?.pickupHandovers, plan?.pickupHandover, PICKUP_KEY_FROM_API), [plan]);
  const initialDelivery = useMemo(() => keysFromApiValues(plan?.deliveryHandovers, plan?.deliveryHandover, DELIVERY_KEY_FROM_API), [plan]);
  const isMajorChange = !sameSet(pickup, initialPickup) || !sameSet(delivery, initialDelivery);
  const blocked = plan ? majorEditBlocked(plan, requests) : false;
  const allowanceUsed = plan ? majorChangeAllowanceUsed(plan) : false;
  const blockedReason = plan && hasPickedUpRequest(requests) ? "picked_up" : "allowance_used";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-[#62645f]">Loading trip...</main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl flex-1 px-5 py-16">
          <p className="text-[#b33e2c]">{error || "This trip could not be found."}</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isTripPast(plan)) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
        <SiteHeader />
        <main className="mx-auto max-w-2xl flex-1 px-5 py-20 sm:px-8">
          <h1 className="text-3xl font-semibold text-[#183b3a]">This trip has ended</h1>
          <p className="mt-3 text-sm text-[#62645f]">Past trips cannot be edited or cancelled.</p>
          <Link href={`/plans/${id}`} className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
            Back to trip
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const save = async (major: boolean) => {
    const weight = Number(maxWeight);
    const count = Number(maxParcelCount);
    if (!Number.isFinite(weight) || weight < 1 || weight > 20) {
      setError("Max weight must be between 1 and 20 kg.");
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setError("Max parcels must be a whole number between 1 and 20.");
      return;
    }
    if (!pickup.size || !delivery.size) {
      setError("Choose at least one pickup and one delivery option.");
      return;
    }
    const [hours, minutes] = departureTime.split(":").map(Number);
    const originalDeparture = new Date(String(plan.departureDate).replace(" ", "T"));
    const originalArrival = new Date(String(plan.arrivalDate).replace(" ", "T"));
    const newDeparture = new Date(originalDeparture);
    newDeparture.setHours(hours || 0, minutes || 0, 0, 0);
    const shiftMs = newDeparture.getTime() - originalDeparture.getTime();
    const newArrival = new Date(originalArrival.getTime() + shiftMs);
    if (newArrival.toDateString() !== originalArrival.toDateString()) {
      setError("Choose a departure time that keeps the arrival on the same date.");
      return;
    }
    if (newArrival <= newDeparture) {
      setError("Arrival must be after departure.");
      return;
    }
    const pickupHandovers = [...pickup].map((key) => PICKUP_API_TYPES[key]).filter(Boolean);
    const deliveryHandovers = [...delivery].map((key) => DELIVERY_API_TYPES[key]).filter(Boolean);
    setSaving(true);
    setError("");
    try {
      await updateTravelPlan(plan.id, {
        from: plan.from,
        to: plan.to,
        departureDate: apiDate(newDeparture),
        arrivalDate: apiDate(newArrival),
        travelMode: plan.travelMode,
        timezone: plan.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        additionalInfo: note.trim(),
        maxWeightKg: weight,
        pricePerPackage: plan.pricePerPackage,
        maxParcelCount: count,
        acceptedParcelTypes: plan.acceptedParcelTypes,
        acceptedParcelCategories: plan.acceptedParcelCategories,
        restrictedParcelTypes: plan.restrictedParcelTypes,
        pickupHandover: pickupHandovers[0],
        deliveryHandover: deliveryHandovers[0],
        pickupHandovers,
        deliveryHandovers,
        // Major changes (pickup/delivery mode) notify senders; minor edits (time, capacity, notes) don't.
        notifySenders: major,
      });
      setSaved(true);
      setConfirmingMajor(false);
    } catch (requestError) {
      const status = (requestError as { status?: number })?.status;
      const message = requestError instanceof Error ? requestError.message : "Please try again.";
      if (status === 409) {
        setError(/major|picked up|cancel the trip/i.test(message) ? `Major change blocked: ${message}` : `Trip time overlaps: ${message}`);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
      setConfirmingMajor(false);
    }
  };

  if (saved) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
        <SiteHeader />
        <main className="mx-auto max-w-2xl flex-1 px-5 py-20 sm:px-8">
          <div className="border-l-2 border-[#285c59] bg-[#e5f0eb] p-6">
            <h1 className="text-2xl font-semibold text-[#183b3a]">Trip updated</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">Your trip changes have been saved. Request participants have been notified about the updated details.</p>
            <Link href={`/plans/${id}`} className="mt-6 inline-block rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
              Back to trip
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-2xl flex-1 px-5 pb-32 pt-8 sm:px-8">
        <Link href={`/plans/${id}`} className="text-sm font-semibold text-[#e85b43]">
          ← Back to trip
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-[#183b3a]">Edit trip</h1>

        <div className={`mt-6 border p-4 ${allowanceUsed ? "border-[#f3d3cc] bg-[#faece7]" : "border-[#b7e4d4] bg-[#e1f5ee]"}`}>
          <p className={`text-sm font-semibold ${allowanceUsed ? "text-[#b33e2c]" : "text-[#085041]"}`}>
            {allowanceUsed ? "Free major change used" : "Free major change available"}
          </p>
          <p className={`mt-1 text-xs leading-5 ${allowanceUsed ? "text-[#b33e2c]" : "text-[#085041]"}`}>
            {allowanceUsed
              ? "Any further change to pickup or delivery mode needs a cancellation instead."
              : "You can change your pickup or delivery mode once for free — affected senders will be notified."}
          </p>
        </div>

        <p className="mt-6 text-sm font-semibold text-[#183b3a]">
          {plan.from?.address} → {plan.to?.address}
        </p>

        <label className={`mt-6 block ${labelClass}`}>
          Departure time
          <input type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} className={inputClass} />
          <span className="mt-1 block text-xs font-normal text-[#62645f]">Arrival time shifts by the same amount, staying on the same date.</span>
        </label>

        {blockedAttempt && (
          <div className="mt-6 border border-[#f3d3cc] bg-[#faece7] p-4">
            <p className="text-sm font-semibold text-[#b33e2c]">
              {blockedReason === "picked_up" ? "Major changes are frozen after pickup" : "You've already used your free change"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#b33e2c]">
              {blockedReason === "picked_up"
                ? "A confirmed package has been picked up, so changing pickup or delivery mode would disrupt a parcel already in transit."
                : "This trip already used its one free major change. You can still make minor edits below (time, capacity, notes)."}
            </p>
            <Link href={`/plans/${id}/cancel`} className="mt-3 inline-block text-sm font-semibold text-[#b33e2c] underline">
              Cancel this trip instead
            </Link>
          </div>
        )}
        <>
            <div className="mt-6">
              <p className={labelClass}>Pickup mode</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {PICKUP.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => (blocked && !pickup.has(item.key) ? setBlockedAttempt(true) : setPickup(new Set([item.key])))}
                    className={`rounded-xl border p-3 text-left text-sm ${pickup.has(item.key) ? "border-[#e85b43] bg-[#fff0eb] font-semibold" : "border-[#d7d2c9] bg-white"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <p className={labelClass}>Delivery mode</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {DELIVERY.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => (blocked && !delivery.has(item.key) ? setBlockedAttempt(true) : setDelivery(new Set([item.key])))}
                    className={`rounded-xl border p-3 text-left text-sm ${delivery.has(item.key) ? "border-[#e85b43] bg-[#fff0eb] font-semibold" : "border-[#d7d2c9] bg-white"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {isMajorChange && (
              <p className="mt-3 text-xs font-semibold text-[#7a5310]">
                This is a major change — it&apos;ll use your one free change for this trip, and affected senders will be notified.
              </p>
            )}
        </>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            Max weight (kg)
            <input type="number" min={1} max={20} step={0.5} value={maxWeight} onChange={(event) => setMaxWeight(event.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Max parcels
            <input type="number" min={1} max={20} step={1} value={maxParcelCount} onChange={(event) => setMaxParcelCount(event.target.value)} className={inputClass} />
          </label>
        </div>
        <label className={`mt-6 block ${labelClass}`}>
          Notes
          <textarea value={note} onChange={(event) => setNote(event.target.value)} className={`${inputClass} min-h-24`} maxLength={300} />
        </label>

        <p className="mt-6 flex gap-2 rounded-xl bg-[#e6f1fb] px-4 py-3 text-xs leading-5 text-[#0c447c]">
          Minor edits like time, capacity, and notes never affect your reliability score or use your free change.
        </p>

        {error && <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={() => (isMajorChange && !blocked ? setConfirmingMajor(true) : save(false))}
          className="mt-8 w-full rounded-xl bg-[#183b3a] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#285c59] disabled:opacity-60"
        >
          {saving ? "Saving changes..." : "Save changes"}
        </button>
      </main>

      <ConfirmModal
        open={confirmingMajor}
        title="Confirm change"
        message="This will use your one free major change for this trip. Any further change to pickup or delivery mode will require a cancellation instead. Affected senders will be notified."
        confirmLabel={saving ? "Saving..." : "Confirm change"}
        cancelLabel="Go back"
        loading={saving}
        onCancel={() => setConfirmingMajor(false)}
        onConfirm={() => save(true)}
      />
      <SiteFooter />
    </div>
  );
}
