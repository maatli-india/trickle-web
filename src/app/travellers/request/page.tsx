"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { apiRequest } from "@/services/api-client";

type Location = {
  address?: string;
  lat?: string | number;
  lng?: string | number;
  coordinates?: number[];
};

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
  user?: {
    id?: string;
    name?: string;
    rating?: number;
    ratings?: number;
    trips?: number;
    completedTrips?: number;
    totalCount?: number;
  };
};

type Selection = {
  traveller: Traveller;
  from: Location;
  to: Location;
  pickupDate: string;
  parcelNotes?: string;
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not provided";
const maxParcelImages = 5;
const maxParcelImageSize = 1024 * 1024;

export default function TravellerRequestPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [itemDetails, setItemDetails] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [parcelImages, setParcelImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
        (file, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.name === file.name &&
              candidate.size === file.size &&
              candidate.lastModified === file.lastModified,
          ) === index,
      );
      if (unique.length > maxParcelImages) {
        setError(`You can upload up to ${maxParcelImages} images.`);
      }
      return unique.slice(0, maxParcelImages);
    });
  };

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.sessionStorage.getItem(
          "trickle.web.selectedTraveller",
        );
        if (saved) {
          const parsed = JSON.parse(saved) as Selection;
          setSelection(parsed);
          setItemDetails(parsed.parcelNotes || "");
        }
      } catch {
        setError("This traveller selection could not be loaded.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selection) return;

    const description = itemDetails.trim();
    const price = Number(estimatedPrice.trim());
    if (!description) {
      setError("Please describe your item.");
      return;
    }
    if (!estimatedPrice.trim() || !Number.isFinite(price) || price < 500) {
      setError("Please enter an estimated price of at least ₹500.");
      return;
    }

    const { traveller, from, to, pickupDate } = selection;
    const travelPlanId = traveller.travelPlanId || traveller.id;
    const travelerUserId =
      traveller.travelerUserId ||
      traveller.travelerId ||
      traveller.userId ||
      traveller.user?.id;
    let profile: { id?: string; userId?: string; name?: string } = {};
    try {
      profile = JSON.parse(
        window.localStorage.getItem("trickle.web.profile") || "{}",
      );
    } catch {
      profile = {};
    }

    if (!profile.id && !profile.userId) {
      setError("Your account details are missing. Please sign in again.");
      return;
    }
    if (
      !travelPlanId ||
      !travelerUserId ||
      from?.lat == null ||
      from?.lng == null ||
      to?.lat == null ||
      to?.lng == null ||
      !pickupDate
    ) {
      setError(
        "This traveller plan is missing information required for a pickup request.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const createdMatch = await apiRequest<{
        id?: string;
        data?: { id?: string };
      }>("/v1/parcel-matches", {
        method: "POST",
        body: JSON.stringify({
          senderUserId: profile.id || profile.userId,
          senderName: profile.name || "Parcel sender",
          travelerUserId,
          travelPlanId,
          baseAmount: price,
          from: {
            address: from.address,
            lat: Number(from.lat),
            lng: Number(from.lng),
          },
          to: {
            address: to.address,
            lat: Number(to.lat),
            lng: Number(to.lng),
          },
          targetDeliveryTime: pickupDate,
          parcelDescription: description,
          estimatedWeightKg: 1,
        }),
      });
      const matchId = createdMatch.id || createdMatch.data?.id;
      if (parcelImages.length && matchId) {
        const uploadRequests = await apiRequest<
          Array<{
            fileId?: string;
            uploadUrl?: string;
            error?: string;
          }>
        >("/v1/files/upload-urls", {
          method: "POST",
          body: JSON.stringify({
            files: parcelImages.map((file) => ({
              fileType: "parcel_image",
              contentType: file.type,
              metadata: { parcelMatchId: matchId },
            })),
          }),
        });
        for (const [index, upload] of uploadRequests.entries()) {
          if (!upload.uploadUrl || !upload.fileId) {
            throw new Error(upload.error || "Could not prepare an image upload.");
          }
          const uploadResponse = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": parcelImages[index].type },
            body: parcelImages[index],
          });
          if (!uploadResponse.ok) {
            throw new Error("Could not upload one of the parcel images.");
          }
        }
      }
      window.sessionStorage.removeItem("trickle.web.selectedTraveller");
      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send the pickup request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-[#62645f]">
          Loading request details...
        </main>
      </div>
    );

  if (!selection)
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-5 py-16">
          <p className="text-[#b33e2c]">
            {error || "No traveller is selected."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white"
          >
            Return home
          </button>
        </main>
        <SiteFooter />
      </div>
    );

  const travellerName =
    selection.traveller.user?.name || selection.traveller.name || "Traveller";
  const rating =
    selection.traveller.user?.rating ??
    selection.traveller.user?.ratings ??
    selection.traveller.rating ??
    selection.traveller.ratings;
  const completedTrips =
    selection.traveller.user?.completedTrips ??
    selection.traveller.user?.totalCount ??
    selection.traveller.user?.trips ??
    selection.traveller.completedTrips ??
    selection.traveller.totalCount ??
    selection.traveller.trips ??
    0;

  return (
    <div className="min-h-screen bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-32 sm:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="pt-8 text-sm font-semibold text-[#e85b43]"
        >
          ← Back to traveller details
        </button>

        <section className="mt-8 border-t-2 border-[#e85b43] bg-[#183b3a] p-6 text-white sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7b65c]">
            Request traveller
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Tell {travellerName} about your parcel
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d4ce]">
            Add the item details and your offer. {travellerName} can review the
            request before accepting it.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#fbfaf7] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">
              Traveller selected
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">
              {travellerName}
            </h2>
            <p className="mt-2 text-sm text-[#62645f]">
              ★ {rating ?? "Not rated"} <span className="px-1">·</span>{" "}
              {completedTrips} completed trips
            </p>
            <div className="mt-6 border-t border-[#ded8ce] pt-5 text-sm">
              <p className="font-semibold text-[#183b3a]">
                {selection.from.address || "Starting point"} <span className="px-1 text-[#e85b43]">→</span> {selection.to.address || "Destination"}
              </p>
              <p className="mt-3 text-[#62645f]">
                Pickup date: {selection.pickupDate || "Not provided"}
              </p>
              <p className="mt-2 text-[#62645f]">
                Departure: {formatDate(selection.traveller.departureDate)}
              </p>
            </div>
          </div>

          <div className="bg-[#fbfaf7] p-6 sm:p-8">
            {sent ? (
              <div className="border-l-2 border-[#285c59] bg-[#e5f0eb] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#285c59]">
                  Request sent
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">
                  Your request is with {travellerName}.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#62645f]">
                  You can follow the request from your delivery history while
                  the traveller reviews it.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="mt-6 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]"
                >
                  Return home
                </button>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">
                    Parcel details
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#183b3a]">
                    What should the traveller carry?
                  </h2>
                </div>
                <label className="block text-sm font-semibold text-[#183b3a]">
                  Item details
                  <textarea
                    required
                    value={itemDetails}
                    onChange={(event) => setItemDetails(event.target.value)}
                    className="mt-2 min-h-32 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"
                    placeholder="Describe the item, size, weight, and anything fragile"
                  />
                </label>
                <label className="block text-sm font-semibold text-[#183b3a]">
                  Estimated price
                  <span className="mt-1 block text-xs font-normal leading-5 text-[#62645f]">
                    Minimum offer: ₹500
                  </span>
                  <input
                    required
                    type="number"
                    min="500"
                    step="1"
                    value={estimatedPrice}
                    onChange={(event) => setEstimatedPrice(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"
                    placeholder="500"
                  />
                </label>
                <div className="block text-sm font-semibold text-[#183b3a]">
                  <span>Item photos</span>
                  <span className="mt-1 block text-xs font-normal leading-5 text-[#62645f]">
                    Optional. Add up to {maxParcelImages} JPG, PNG, or WebP images, 1 MB each.
                  </span>
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
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Parcel item ${index + 1}`}
                            className="size-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove image ${index + 1}`}
                            onClick={() =>
                              setParcelImages((current) => current.filter((_, imageIndex) => imageIndex !== index))
                            }
                            className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[#183b3a] text-sm text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {error && (
                  <p role="alert" className="border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#cf4935] disabled:opacity-60"
                >
                  {submitting ? "Sending request..." : "Send request"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}