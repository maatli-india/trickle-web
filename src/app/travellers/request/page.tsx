"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, PackageX } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { apiRequest } from "@/services/api-client";
import { listParcelMatches } from "@/services/parcel-matches";
import { getTravelPlanInterest, recordTravelPlanView, registerTravelPlanInterest } from "@/services/travel-plans";
import { extractListItems, type ParcelMatch } from "@/types/travel";
import { inputClass, labelClass } from "@/components/forms/location-fields";
import { CATEGORIES, MAX_PHOTOS, PICKUP_HANDOVER_OPTIONS, DELIVERY_HANDOVER_OPTIONS, getHandoverOptions, BLOCKING_REQUEST_STATUSES } from "@/lib/request-form-constants";
import { SafetyDeclarationModal, type SafetyDeclaration } from "@/components/forms/safety-declaration-modal";

type Location = { address?: string; lat?: string | number; lng?: string | number };

type Traveller = {
  id?: string;
  travelPlanId?: string;
  travelerId?: string;
  travelerUserId?: string;
  userId?: string;
  name?: string;
  rating?: number;
  ratings?: number;
  trips?: number;
  completedTrips?: number;
  totalCount?: number;
  departureDate?: string;
  from?: Location;
  to?: Location;
  maxWeightKg?: number;
  maxParcelCount?: number;
  pricePerPackage?: number;
  price?: number;
  pickupHandovers?: string[];
  pickupHandover?: string;
  deliveryHandovers?: string[];
  deliveryHandover?: string;
  acceptingNewRequests?: boolean;
  user?: { id?: string; name?: string; rating?: number; ratings?: number; trips?: number; completedTrips?: number; totalCount?: number };
};

type Selection = { traveller: Traveller; from: Location; to: Location; pickupDate: string; parcelNotes?: string };

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "Not provided");
const maxParcelImageSize = 1024 * 1024;

export default function TravellerRequestPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [acceptingNewRequests, setAcceptingNewRequests] = useState(true);
  const [waitlisted, setWaitlisted] = useState(false);
  const [interestLoading, setInterestLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const [category, setCategory] = useState("documents");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("1");
  const [packageCount, setPackageCount] = useState("1");
  const [pickup, setPickup] = useState<string | null>(null);
  const [pickupNote, setPickupNote] = useState("");
  const [delivery, setDelivery] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [parcelImages, setParcelImages] = useState<File[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.sessionStorage.getItem("trickle.web.selectedTraveller");
        if (saved) {
          const parsed = JSON.parse(saved) as Selection;
          setSelection(parsed);
          setDescription(parsed.parcelNotes || "");
          setWeight(String(Math.min(1, Number(parsed.traveller.maxWeightKg) || 1)));
          setAmount(String(parsed.traveller.pricePerPackage || parsed.traveller.price || ""));
          setAcceptingNewRequests(parsed.traveller.acceptingNewRequests !== false);
        }
      } catch {
        setError("This traveller selection could not be loaded.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const travelPlanId = selection?.traveller.travelPlanId || selection?.traveller.id;
    if (!travelPlanId) return;
    recordTravelPlanView(travelPlanId)
      .then((response) => {
        const viewedTrip = (response as { data?: { acceptingNewRequests?: boolean } })?.data || response;
        if (typeof (viewedTrip as { acceptingNewRequests?: boolean })?.acceptingNewRequests === "boolean") {
          setAcceptingNewRequests(Boolean((viewedTrip as { acceptingNewRequests?: boolean }).acceptingNewRequests));
        }
      })
      .catch(() => undefined);
    getTravelPlanInterest(travelPlanId)
      .then((interest) => setWaitlisted(Boolean((interest as { id?: string; _id?: string })?.id || (interest as { id?: string; _id?: string })?._id)))
      .catch(() => undefined)
      .finally(() => setInterestLoading(false));
  }, [selection?.traveller.id, selection?.traveller.travelPlanId]);

  const joinWaitlist = async () => {
    const travelPlanId = selection?.traveller.travelPlanId || selection?.traveller.id;
    if (!travelPlanId || registering) return;
    setRegistering(true);
    try {
      await registerTravelPlanInterest(travelPlanId);
      setWaitlisted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join the notification list.");
    } finally {
      setRegistering(false);
    }
  };

  const addParcelImages = (files: FileList | null) => {
    if (!files) return;
    const nextFiles = Array.from(files);
    if (nextFiles.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Use JPG, PNG, or WebP images only.");
      return;
    }
    if (nextFiles.some((file) => file.size > maxParcelImageSize)) {
      setError("Each parcel image must be 1 MB or smaller.");
      return;
    }
    setParcelImages((current) => {
      const combined = [...current, ...nextFiles];
      const unique = combined.filter(
        (file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index,
      );
      if (unique.length > MAX_PHOTOS) setError(`You can upload up to ${MAX_PHOTOS} images.`);
      return unique.slice(0, MAX_PHOTOS);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-[#62645f]">Loading request details...</main>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl flex-1 px-5 py-16">
          <p className="text-[#b33e2c]">{error || "No traveller is selected."}</p>
          <button type="button" onClick={() => router.push("/")} className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white">
            Return home
          </button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { traveller, from, to, pickupDate } = selection;
  const travellerName = traveller.user?.name || traveller.name || "Traveller";
  const rating = traveller.user?.rating ?? traveller.user?.ratings ?? traveller.rating ?? traveller.ratings;
  const completedTrips = traveller.user?.completedTrips ?? traveller.user?.totalCount ?? traveller.user?.trips ?? traveller.completedTrips ?? traveller.totalCount ?? traveller.trips ?? 0;
  const pickupOptions = getHandoverOptions(traveller, "pickupHandovers", "pickupHandover", PICKUP_HANDOVER_OPTIONS);
  const deliveryOptions = getHandoverOptions(traveller, "deliveryHandovers", "deliveryHandover", DELIVERY_HANDOVER_OPTIONS);
  const maxWeight = traveller.maxWeightKg || 20;
  const maxPackages = traveller.maxParcelCount || 5;
  const tripClosed = !acceptingNewRequests;
  const numericWeight = Number(weight);
  const numericPackageCount = Number(packageCount);

  const openDeclaration = async () => {
    setError("");
    const travelPlanId = traveller.travelPlanId || traveller.id;
    const travelerUserId = traveller.travelerUserId || traveller.travelerId || traveller.userId || traveller.user?.id;
    let profile: { id?: string; userId?: string; name?: string } = {};
    try {
      profile = JSON.parse(window.localStorage.getItem("trickle.web.profile") || "{}");
    } catch {
      profile = {};
    }
    if (!profile.id && !profile.userId) {
      setError("Your account details are missing. Please sign in again.");
      return;
    }
    if (!travelPlanId || !travelerUserId || from?.lat == null || from?.lng == null || to?.lat == null || to?.lng == null || !pickupDate) {
      setError("This traveller plan is missing information required for a pickup request.");
      return;
    }
    if (tripClosed) {
      setError("This trip is no longer accepting new requests.");
      return;
    }
    if (!category || !pickup || !delivery) {
      setError("Choose a package category, pickup, and delivery option.");
      return;
    }
    if (!Number(amount) || Number(amount) <= 0) {
      setError("Enter an amount for the traveller.");
      return;
    }
    if (!Number.isFinite(numericWeight) || numericWeight < 0.1 || numericWeight > maxWeight) {
      setError(`Weight must be between 0.1 and ${maxWeight} kg.`);
      return;
    }
    if (!Number.isInteger(numericPackageCount) || numericPackageCount < 1 || numericPackageCount > maxPackages) {
      setError(`Package count must be between 1 and ${maxPackages}.`);
      return;
    }
    try {
      const existing = extractListItems<ParcelMatch>(await listParcelMatches({ side: "sender", page: 1, limit: 100 }) as never);
      const hasExisting = existing.some(
        (request) => String(request.travelPlanId) === String(travelPlanId) && BLOCKING_REQUEST_STATUSES.has(String(request.status || "").toLowerCase()),
      );
      if (hasExisting) {
        setDuplicateAlert(true);
        return;
      }
    } catch {
      // If the duplicate check fails, fall through — the backend still owns final validation.
    }
    setShowDeclaration(true);
  };

  const submitRequest = async (safetyDeclaration: SafetyDeclaration) => {
    setShowDeclaration(false);
    const travelPlanId = String(traveller.travelPlanId || traveller.id);
    const travelerUserId = String(traveller.travelerUserId || traveller.travelerId || traveller.userId || traveller.user?.id);
    let profile: { id?: string; userId?: string; name?: string } = {};
    try {
      profile = JSON.parse(window.localStorage.getItem("trickle.web.profile") || "{}");
    } catch {
      profile = {};
    }
    setSubmitting(true);
    setError("");
    try {
      const createdMatch = await apiRequest<{ id?: string; data?: { id?: string } }>("/v1/parcel-matches", {
        method: "POST",
        body: JSON.stringify({
          senderUserId: profile.id || profile.userId,
          senderName: profile.name || "Parcel sender",
          travelerUserId,
          travelPlanId,
          travelerName: travellerName,
          parcelType: category,
          parcelCategory: category,
          baseAmount: Number(amount),
          from: { address: from.address, lat: Number(from.lat), lng: Number(from.lng) },
          to: { address: to.address, lat: Number(to.lat), lng: Number(to.lng) },
          targetDeliveryTime: pickupDate,
          parcelDescription: description.trim() || category,
          estimatedWeightKg: numericWeight,
          packageCount: Math.max(1, numericPackageCount),
          pickupOption: pickup,
          pickupNote: pickupNote || undefined,
          deliveryOption: delivery,
          deliveryNote: deliveryNote || undefined,
          note: message || undefined,
          safetyDeclaration,
        }),
      });
      const matchId = createdMatch.id || createdMatch.data?.id;
      if (parcelImages.length && matchId) {
        const uploadRequests = await apiRequest<Array<{ fileId?: string; uploadUrl?: string; error?: string }>>("/v1/files/upload-urls", {
          method: "POST",
          body: JSON.stringify({
            files: parcelImages.map((file) => ({ fileType: "parcel_image", contentType: file.type, metadata: { parcelMatchId: matchId } })),
          }),
        });
        for (const [index, upload] of uploadRequests.entries()) {
          if (!upload.uploadUrl || !upload.fileId) throw new Error(upload.error || "Could not prepare an image upload.");
          const uploadResponse = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": parcelImages[index].type }, body: parcelImages[index] });
          if (!uploadResponse.ok) throw new Error("Could not upload one of the parcel images.");
        }
      }
      window.sessionStorage.removeItem("trickle.web.selectedTraveller");
      setSent(true);
    } catch (requestError) {
      const status = (requestError as { status?: number })?.status;
      const messageText = requestError instanceof Error ? requestError.message : "Could not send the pickup request.";
      setError(status === 409 && /not accepting|full/i.test(messageText) ? "This trip is no longer accepting new requests." : messageText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-5 pb-32 sm:px-8">
        <button type="button" onClick={() => router.back()} className="pt-8 text-sm font-semibold text-[#e85b43]">
          ← Back to traveller details
        </button>

        <section className="mt-8 border-t-2 border-[#e85b43] bg-[#183b3a] p-6 text-white sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7b65c]">Request traveller</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Tell {travellerName} about your parcel</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d4ce]">Add the item details and your offer. {travellerName} can review the request before accepting it.</p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="bg-[#fbfaf7] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Traveller selected</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">{travellerName}</h2>
              <p className="mt-2 text-sm text-[#62645f]">
                ★ {rating ?? "Not rated"} <span className="px-1">·</span> {completedTrips} completed trips
              </p>
              <div className="mt-6 border-t border-[#ded8ce] pt-5 text-sm">
                <p className="font-semibold text-[#183b3a]">
                  {selection.from.address || "Starting point"} <span className="px-1 text-[#e85b43]">→</span> {selection.to.address || "Destination"}
                </p>
                <p className="mt-3 text-[#62645f]">Pickup date: {selection.pickupDate || "Not provided"}</p>
                <p className="mt-2 text-[#62645f]">Departure: {formatDate(selection.traveller.departureDate)}</p>
                <p className="mt-2 text-[#62645f]">Capacity: up to {maxWeight} kg · {maxPackages} parcels</p>
              </div>
            </div>
          </div>

          <div className="bg-[#fbfaf7] p-6 sm:p-8">
            {sent ? (
              <div className="border-l-2 border-[#285c59] bg-[#e5f0eb] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#285c59]">Request sent</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">Your request is with {travellerName}.</h2>
                <p className="mt-3 text-sm leading-6 text-[#62645f]">You can follow the request from your Requests tab while the traveller reviews it.</p>
                <button type="button" onClick={() => router.push("/requests")} className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">
                  View my requests
                </button>
              </div>
            ) : tripClosed ? (
              interestLoading ? (
                <p className="text-sm text-[#62645f]">Checking notification status...</p>
              ) : waitlisted ? (
                <div className="flex items-start gap-4 border border-[#b7e4d4] bg-[#e1f5ee] p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0f6e56] text-white"><Check size={16} /></span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#085041]">You&apos;re on the list</h2>
                    <p className="mt-1 text-sm leading-6 text-[#085041]">We&apos;ll notify you the moment a slot opens on this trip.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center border border-[#ded8ce] bg-white p-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#eef1f6] text-[#5a6478]"><PackageX size={22} /></span>
                  <h2 className="mt-4 text-lg font-semibold text-[#183b3a]">This trip is full</h2>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-[#62645f]">{travellerName.split(" ")[0]} isn&apos;t accepting new requests on this trip right now.</p>
                  {error && <p role="alert" className="mt-4 text-sm text-[#b33e2c]">{error}</p>}
                  <button type="button" disabled={registering} onClick={joinWaitlist} className="mt-6 flex items-center gap-2 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59] disabled:opacity-60">
                    <BellRing size={15} />
                    {registering ? "Joining..." : "Notify me if a slot opens"}
                  </button>
                </div>
              )
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  openDeclaration();
                }}
                className="space-y-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Parcel details</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">What should the traveller carry?</h2>
                </div>

                <div>
                  <p className={labelClass}>Category</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCategory(item.key)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold ${category === item.key ? "border-[#e85b43] bg-[#e85b43] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a]"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={labelClass}>
                  Item details
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className={`${inputClass} min-h-24`}
                    placeholder="Describe the item, size, weight, and anything fragile"
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={labelClass}>
                    Weight (kg)
                    <input type="number" min={0.1} max={maxWeight} step="any" value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Package count
                    <span className="ml-2 text-xs font-normal text-[#8a8579]">1 to {maxPackages}</span>
                    <input
                      type="number"
                      min={1}
                      max={maxPackages}
                      step={1}
                      value={packageCount}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "") {
                          setPackageCount("1");
                          return;
                        }
                        const nextCount = Number(value);
                        setPackageCount(Number.isInteger(nextCount) && nextCount >= 1 ? String(nextCount) : "1");
                      }}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div>
                  <p className={labelClass}>Pickup</p>
                  {pickupOptions.length ? (
                    <div className="mt-2 space-y-2">
                      {pickupOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setPickup(option.key)}
                          className={`block w-full rounded-xl border p-3 text-left ${pickup === option.key ? "border-[#e85b43] bg-[#fff0eb]" : "border-[#d7d2c9] bg-white"}`}
                        >
                          <p className="text-sm font-semibold text-[#183b3a]">{option.label}</p>
                          <p className="mt-0.5 text-xs text-[#62645f]">{option.sub}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#62645f]">This trip has not specified pickup options.</p>
                  )}
                  {pickup === "point" && (
                    <input value={pickupNote} onChange={(event) => setPickupNote(event.target.value)} placeholder="Suggest a meeting point (optional)" className={`${inputClass} mt-2`} />
                  )}
                </div>

                <div>
                  <p className={labelClass}>Delivery</p>
                  {deliveryOptions.length ? (
                    <div className="mt-2 space-y-2">
                      {deliveryOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setDelivery(option.key)}
                          className={`block w-full rounded-xl border p-3 text-left ${delivery === option.key ? "border-[#e85b43] bg-[#fff0eb]" : "border-[#d7d2c9] bg-white"}`}
                        >
                          <p className="text-sm font-semibold text-[#183b3a]">{option.label}</p>
                          <p className="mt-0.5 text-xs text-[#62645f]">{option.sub}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#62645f]">This trip has not specified delivery options.</p>
                  )}
                  {delivery === "point" && (
                    <input value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)} placeholder="Suggest a meeting point (optional)" className={`${inputClass} mt-2`} />
                  )}
                </div>

                <label className={labelClass}>
                  Your offer
                  <input required type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} placeholder="₹" />
                </label>

                <label className={labelClass}>
                  Message to traveller (optional)
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} className={`${inputClass} min-h-20`} />
                </label>

                <div className="block text-sm font-semibold text-[#183b3a]">
                  <span>Item photos</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-[#62645f]">Optional. Add up to {MAX_PHOTOS} JPG, PNG, or WebP images, 1 MB each.</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      addParcelImages(event.target.files);
                      event.target.value = "";
                    }}
                    className="mt-3 block w-full rounded-xl border border-dashed border-[#d7d2c9] bg-white px-4 py-3 text-sm font-normal text-[#62645f] file:mr-4 file:rounded-lg file:border-0 file:bg-[#e5f0eb] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#285c59]"
                  />
                  {parcelImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {parcelImages.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#e5f0eb]">
                          <img src={URL.createObjectURL(file)} alt={`Parcel item ${index + 1}`} className="size-full object-cover" />
                          <button
                            type="button"
                            aria-label={`Remove image ${index + 1}`}
                            onClick={() => setParcelImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[#183b3a] text-sm text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {duplicateAlert && (
                  <p role="alert" className="border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">
                    You already have an active request with this traveller. Check your Requests tab before sending another.
                  </p>
                )}
                {error && (
                  <p role="alert" className="border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={submitting || tripClosed} className="w-full rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#cf4935] disabled:opacity-60">
                  {submitting ? "Sending request..." : "Continue"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <SafetyDeclarationModal open={showDeclaration} onCancel={() => setShowDeclaration(false)} onConfirm={submitRequest} />
    </div>
  );
}
