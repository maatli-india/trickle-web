"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LocationFields, inputClass, labelClass } from "@/components/forms/location-fields";
import { useLocationPair } from "@/hooks/use-location-pair";
import { createTravelPlan } from "@/services/travel-plans";
import {
  ACCEPTED,
  ACCEPTED_API_TYPES,
  DELIVERY,
  DELIVERY_API_TYPES,
  MODES,
  PICKUP,
  PICKUP_API_TYPES,
  RESTRICTED,
  apiDate,
} from "@/lib/trip-form-constants";

const STEP_NAMES = ["Route & schedule", "Pickup & delivery", "What you carry", "Review & publish"];

const toggleInSet = (set: Set<string>, key: string) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active ? "border-[#e85b43] bg-[#e85b43] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a] hover:border-[#e85b43]"
      }`}
    >
      {children}
    </button>
  );
}

export default function CreateTripPage() {
  const router = useRouter();
  const { from, setFrom, to, setTo, locationError } = useLocationPair();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("flight");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [pickup, setPickup] = useState<Set<string>>(new Set());
  const [delivery, setDelivery] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set(["documents"]));
  const [restricted, setRestricted] = useState<Set<string>>(new Set());
  const [maxWeight, setMaxWeight] = useState("5");
  const [maxParcelCount, setMaxParcelCount] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [published, setPublished] = useState(false);

  const validateStep = (index: number) => {
    if (index === 0) {
      if (!from.address.trim() || !from.lat || !to.address.trim() || !to.lat) {
        return "Choose both locations from the suggestions so we have coordinates.";
      }
      if (!departure || !arrival) return "Add a departure and arrival date & time.";
      if (new Date(arrival) <= new Date(departure)) return "Arrival must be after departure.";
      return "";
    }
    if (index === 1) {
      if (!pickup.size || !delivery.size) return "Choose at least one pickup and one delivery option.";
      return "";
    }
    if (index === 2) {
      if (!accepted.size) return "Choose at least one category you can carry.";
      const weight = Number(maxWeight);
      if (!Number.isFinite(weight) || weight < 1 || weight > 20) return "Max weight must be between 1 and 20 kg.";
      const count = Number(maxParcelCount);
      if (!Number.isInteger(count) || count < 1 || count > 20) return "Max parcels must be a whole number between 1 and 20.";
      return "";
    }
    return "";
  };

  const goNext = () => {
    const stepError = validateStep(step);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEP_NAMES.length - 1));
  };
  const goBack = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  };

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const stepError = validateStep(0) || validateStep(1) || validateStep(2);
    if (stepError) {
      setError(stepError);
      return;
    }
    setSubmitting(true);
    setError("");
    const pickupHandovers = [...pickup].map((key) => PICKUP_API_TYPES[key]).filter(Boolean);
    const deliveryHandovers = [...delivery].map((key) => DELIVERY_API_TYPES[key]).filter(Boolean);
    const acceptedParcelCategories = [...accepted];
    try {
      await createTravelPlan({
        from: { address: from.address, lat: Number(from.lat), lng: Number(from.lng) },
        to: { address: to.address, lat: Number(to.lat), lng: Number(to.lng) },
        departureDate: apiDate(new Date(departure)),
        arrivalDate: apiDate(new Date(arrival)),
        travelMode: MODES.find((item) => item.key === mode)?.apiKey || "by_flight",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        maxWeightKg: Number(maxWeight),
        maxParcelCount: Number(maxParcelCount),
        pricePerPackage: price ? Number(price) : undefined,
        acceptedParcelTypes: [...new Set(acceptedParcelCategories.map((key) => ACCEPTED_API_TYPES[key]).filter(Boolean))],
        acceptedParcelCategories,
        restrictedParcelTypes: [...restricted],
        pickupHandover: pickupHandovers[0],
        deliveryHandover: deliveryHandovers[0],
        pickupHandovers,
        deliveryHandovers,
      });
      setPublished(true);
    } catch (requestError) {
      const status = (requestError as { status?: number })?.status;
      if (status === 409) {
        setError(
          (requestError as Error).message ||
            "You already have another active trip during this time. Choose a time after it ends or cancel the earlier trip.",
        );
      } else {
        setError(requestError instanceof Error ? requestError.message : "Could not publish trip.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (published) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl flex-1 px-5 py-20 sm:px-8">
          <div className="border-l-2 border-[#285c59] bg-[#e5f0eb] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#285c59]">Trip published</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#183b3a]">Your trip is live.</h1>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              Senders on this route can now find and request your trip.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/plans")}
                className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]"
              >
                View my plans
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-5 pb-32 sm:px-8">
        <section className="border-b border-[#ded8ce] py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Post a trip</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Share your upcoming journey</h1>
          <ol className="mt-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
            {STEP_NAMES.map((name, index) => (
              <li
                key={name}
                className={`rounded-full px-3 py-1.5 ${
                  index === step ? "bg-[#183b3a] text-white" : index < step ? "bg-[#e5f0eb] text-[#285c59]" : "bg-[#f0ece3] text-[#62645f]"
                }`}
              >
                {index + 1}. {name}
              </li>
            ))}
          </ol>
        </section>

        <form onSubmit={publish} className="py-10">
          {step === 0 && (
            <div className="space-y-5">
              <LocationFields
                title="Departure location"
                hint="Where will your journey begin?"
                value={from}
                onChange={setFrom}
              />
              <LocationFields
                title="Arrival location"
                hint="Where will your journey end?"
                value={to}
                onChange={setTo}
              />
              <div>
                <p className={labelClass}>Travel mode</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MODES.map((item) => (
                    <ChipToggle key={item.key} active={mode === item.key} onClick={() => setMode(item.key)}>
                      {item.label}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Departure date & time
                  <input
                    required
                    type="datetime-local"
                    value={departure}
                    onChange={(event) => setDeparture(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Arrival date & time
                  <input
                    required
                    type="datetime-local"
                    value={arrival}
                    onChange={(event) => setArrival(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div>
                <p className={labelClass}>Pickup options</p>
                <p className="mt-1 text-xs text-[#62645f]">How will you collect the parcel from the sender?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {PICKUP.map((item) => {
                    const active = pickup.has(item.key);
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setPickup((current) => toggleInSet(current, item.key))}
                        className={`rounded-xl border p-4 text-left transition ${
                          active ? "border-[#e85b43] bg-[#fff0eb]" : "border-[#d7d2c9] bg-white hover:border-[#e85b43]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#183b3a]">{item.label}</p>
                        <p className="mt-1 text-xs text-[#62645f]">{item.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className={labelClass}>Delivery options</p>
                <p className="mt-1 text-xs text-[#62645f]">How will the receiver get the parcel?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DELIVERY.map((item) => {
                    const active = delivery.has(item.key);
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setDelivery((current) => toggleInSet(current, item.key))}
                        className={`rounded-xl border p-4 text-left transition ${
                          active ? "border-[#e85b43] bg-[#fff0eb]" : "border-[#d7d2c9] bg-white hover:border-[#e85b43]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#183b3a]">{item.label}</p>
                        <p className="mt-1 text-xs text-[#62645f]">{item.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <p className={labelClass}>What you can carry</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCEPTED.map((item) => (
                    <ChipToggle
                      key={item.key}
                      active={accepted.has(item.key)}
                      onClick={() => setAccepted((current) => toggleInSet(current, item.key))}
                    >
                      {item.label}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>What you won&apos;t carry</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {RESTRICTED.map((item) => (
                    <ChipToggle
                      key={item.key}
                      active={restricted.has(item.key)}
                      onClick={() => setRestricted((current) => toggleInSet(current, item.key))}
                    >
                      {item.label}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <label className={labelClass}>
                  Max weight (kg)
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={0.5}
                    value={maxWeight}
                    onChange={(event) => setMaxWeight(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Max parcels
                  <input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={maxParcelCount}
                    onChange={(event) => setMaxParcelCount(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Price per package (optional)
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={inputClass}
                    placeholder="₹"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 border-t-2 border-[#e7b65c] bg-[#fbfaf7] p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-[#183b3a]">Review your trip</h2>
              <div className="grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">From</p>
                  <p className="mt-1 font-semibold text-[#183b3a]">{from.address}</p>
                </div>
                <span className="hidden text-[#e85b43] sm:block">→</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">To</p>
                  <p className="mt-1 font-semibold text-[#183b3a]">{to.address}</p>
                </div>
              </div>
              <dl className="grid gap-3 border-t border-[#ded8ce] pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[#62645f]">Departure</dt>
                  <dd className="font-semibold text-[#183b3a]">{departure ? new Date(departure).toLocaleString() : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#62645f]">Arrival</dt>
                  <dd className="font-semibold text-[#183b3a]">{arrival ? new Date(arrival).toLocaleString() : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#62645f]">Travel mode</dt>
                  <dd className="font-semibold capitalize text-[#183b3a]">{mode}</dd>
                </div>
                <div>
                  <dt className="text-[#62645f]">Capacity</dt>
                  <dd className="font-semibold text-[#183b3a]">{maxParcelCount} parcels · up to {maxWeight} kg{price ? ` · ₹${price}/package` : ""}</dd>
                </div>
                <div>
                  <dt className="text-[#62645f]">Pickup</dt>
                  <dd className="font-semibold text-[#183b3a]">{[...pickup].map((key) => PICKUP.find((item) => item.key === key)?.label).join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#62645f]">Delivery</dt>
                  <dd className="font-semibold text-[#183b3a]">{[...delivery].map((key) => DELIVERY.find((item) => item.key === key)?.label).join(", ") || "—"}</dd>
                </div>
              </dl>
              <p className="border-t border-[#ded8ce] pt-4 text-sm text-[#62645f]">
                Accepts: {[...accepted].map((key) => ACCEPTED.find((item) => item.key === key)?.label).join(", ") || "None"}
                {restricted.size ? ` · Won't carry: ${[...restricted].map((key) => RESTRICTED.find((item) => item.key === key)?.label).join(", ")}` : ""}
              </p>
            </div>
          )}

          {(error || locationError) && (
            <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">
              {error || locationError}
            </p>
          )}

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="rounded-xl border border-[#d7d2c9] px-5 py-3 text-sm font-semibold text-[#183b3a] disabled:opacity-40"
            >
              Back
            </button>
            {step < STEP_NAMES.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#285c59]"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#e85b43] px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf4935] disabled:opacity-60"
              >
                {submitting ? "Publishing..." : "Publish trip"}
              </button>
            )}
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
