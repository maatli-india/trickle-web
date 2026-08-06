"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { apiRequest } from "@/services/api-client";

type Location = {
  address?: string;
  lat?: string | number;
  lng?: string | number;
  coordinates?: number[];
  type?: string;
};
type Traveller = {
  [key: string]: unknown;
  id?: string;
  travelerId?: string;
  userId?: string;
  name?: string;
  profilePicUrl?: string;
  profilePicture?: string;
  rating?: number;
  ratings?: number;
  trips?: number;
  completedTrips?: number;
  totalCount?: number;
  user?: {
    id?: string;
    name?: string;
    profilePicUrl?: string;
    rating?: number;
    ratings?: number;
    trips?: number;
    completedTrips?: number;
    totalCount?: number;
  };
  from?: Location;
  to?: Location;
  departureDate?: string;
  arrivalDate?: string;
  travelMode?: string;
  maxWeightKg?: number;
  maxParcelCount?: number;
  acceptedParcelTypes?: string[];
  additionalInfo?: string;
};
type Selection = {
  traveller: Traveller;
  from: Location;
  to: Location;
  pickupDate: string;
  parcelNotes: string;
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not provided";
const formatTravelMode = (value?: string) =>
  value ? value.replace("by_", "").replace(/_/g, " ") : "Not specified";

export default function TravellerDetailsPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const saved = window.sessionStorage.getItem(
          "trickle.web.selectedTraveller",
        );
        if (saved) {
          const parsed = JSON.parse(saved) as Selection;
          setSelection(parsed);
          if (parsed.traveller.id) {
            try {
              const response = await apiRequest<
                Traveller | { data?: Traveller }
              >(`/v1/travel-plans/${parsed.traveller.id}`);
              const plan = "data" in response ? response.data : response;
              if (plan)
                setSelection({
                  ...parsed,
                  traveller: { ...parsed.traveller, ...plan },
                });
            } catch {
              // The search result remains usable when the detail endpoint is unavailable.
            }
          }
        }
      } catch {
        setError("This traveller selection could not be loaded.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-[#f6f2eb]">
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-5 py-16 text-sm text-[#62645f]">
          Loading traveller details...
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
          </button>
        </main>
      </div>
    );

  const { traveller, from, to, pickupDate } = selection;
  const name = traveller.user?.name || traveller.name || "Traveller";
  const profilePic =
    traveller.user?.profilePicUrl ||
    traveller.profilePicUrl ||
    traveller.profilePicture;
  const rating =
    traveller.user?.rating ??
    traveller.user?.ratings ??
    traveller.rating ??
    traveller.ratings;
  const completedTrips =
    traveller.user?.completedTrips ??
    traveller.user?.totalCount ??
    traveller.user?.trips ??
    traveller.completedTrips ??
    traveller.totalCount ??
    traveller.trips ??
    0;

  return (
    <div className="min-h-screen bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pb-32 sm:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="pt-8 text-sm font-semibold text-[#e85b43]"
        >
          ← Back to travellers
        </button>
        <section className="mt-8 border-t-2 border-[#e85b43] bg-[#183b3a] p-6 text-white sm:p-10">
          <div className="flex flex-wrap items-center gap-5">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e7b65c] text-3xl font-semibold text-[#183b3a]">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt={`${name} profile`}
                  className="size-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7b65c]">
                Traveller profile
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{name}</h1>
              <p className="mt-2 text-sm text-[#c5d4ce]">
                ★ {rating ?? "Not rated"} · {completedTrips} completed trips
              </p>
            </div>
          </div>
        </section>
        <section className="mt-6 bg-[#fbfaf7] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">
            Travel plan
          </p>
          <div className="mt-5 grid gap-4 border-t border-[#ded8ce] pt-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#e85b43]">From</p>
              <p className="mt-1 break-words text-lg font-semibold leading-6 text-[#183b3a]">{traveller.from?.address || from.address}</p>
            </div>
            <span className="hidden text-xl text-[#e85b43] sm:block">→</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#e85b43]">To</p>
              <p className="mt-1 break-words text-lg font-semibold leading-6 text-[#183b3a]">{traveller.to?.address || to.address}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-5 border-t border-[#ded8ce] pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#62645f]">
                Departure
              </dt>
              <dd className="mt-1 text-sm text-[#183b3a]">
                {formatDate(traveller.departureDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#62645f]">
                Arrival
              </dt>
              <dd className="mt-1 text-sm text-[#183b3a]">
                {formatDate(traveller.arrivalDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#62645f]">
                Travel mode
              </dt>
              <dd className="mt-1 capitalize text-sm text-[#183b3a]">
                {traveller.travelMode?.replace("by_", " ") || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#62645f]">
                Your pickup date
              </dt>
              <dd className="mt-1 text-sm text-[#183b3a]">
                {pickupDate || "Not provided"}
              </dd>
            </div>
          </dl>
          {traveller.additionalInfo && (
            <p className="mt-6 border-t border-[#ded8ce] pt-5 text-sm leading-6 text-[#62645f]">
              {traveller.additionalInfo}
            </p>
          )}
          <div className="mt-8 border-t border-[#ded8ce] pt-6">
            <h3 className="text-lg font-semibold text-[#183b3a]">
              All travel plan details
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border border-[#ded8ce] bg-[#f6f2eb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Travel mode</p>
                <p className="mt-2 text-lg font-semibold capitalize text-[#183b3a]">{formatTravelMode(traveller.travelMode)}</p>
              </div>
              <div className="border border-[#ded8ce] bg-[#f6f2eb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Max weight</p>
                <p className="mt-2 text-lg font-semibold text-[#183b3a]">{traveller.maxWeightKg ? `${traveller.maxWeightKg} kg` : "Not specified"}</p>
              </div>
              <div className="border border-[#ded8ce] bg-[#f6f2eb] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Max parcels</p>
                <p className="mt-2 text-lg font-semibold text-[#183b3a]">{traveller.maxParcelCount ?? "Not specified"}</p>
              </div>
              <div className="border border-[#ded8ce] bg-[#f6f2eb] p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62645f]">Accepted parcel types</p>
                {traveller.acceptedParcelTypes?.length ? <div className="mt-3 flex flex-wrap gap-2">{traveller.acceptedParcelTypes.map((type) => <span key={type} className="border border-[#e7b65c] bg-white px-3 py-1.5 text-sm font-medium capitalize text-[#183b3a]">{type.replace(/_/g, " ")}</span>)}</div> : <p className="mt-2 text-sm text-[#62645f]">Not specified</p>}
              </div>
            </div>
          </div>
        </section>
        <section className="mt-6 border-t-2 border-[#e7b65c] bg-[#fbfaf7] p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-[#183b3a]">
            Ready to send a parcel?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#62645f]">
            Add your parcel details and offer in the next step. The traveller
            can review your request before accepting it.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-[#b33e2c]">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/travellers/request")}
            className="mt-6 rounded-xl bg-[#e85b43] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#cf4935]"
          >
            Request Traveller
          </button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
