"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LocationFields, emptyLocation, inputClass, labelClass, type LocationForm } from "@/components/forms/location-fields";
import { useLocationPair } from "@/hooks/use-location-pair";
import { apiRequest } from "@/services/api-client";
import { getWebUserId } from "@/services/auth";
import { dedupeRecentSearches, recentSearchesStorageKey } from "@/lib/recent-searches";

type Traveller = {
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
  from?: { address?: string };
  to?: { address?: string };
  departureDate?: string;
  arrivalDate?: string;
  travelMode?: string;
  additionalInfo?: string;
  maxWeightKg?: number;
  pricePerPackage?: number;
  price?: number;
};
type RecentSearch = { from: LocationForm; to: LocationForm; pickupDate: string; parcelNotes?: string; travellers?: Traveller[] };

const formatSearchDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "Date not provided");
const formatTravelMode = (value?: string) => {
  const labels: Record<string, string> = { by_flight: "Flight", by_road: "Road", by_train: "Train" };
  return labels[value || ""] || "Travel mode not provided";
};
const modeKey = (value?: string) => ({ by_flight: "flight", by_train: "train", by_road: "car", flight: "flight", train: "train", bus: "bus", car: "car" })[value || ""] || "car";
const MODE_FILTERS = [
  { key: "all", label: "All modes" },
  { key: "flight", label: "Flight" },
  { key: "train", label: "Train" },
  { key: "bus", label: "Bus" },
  { key: "car", label: "Car" },
];
const SORT_OPTIONS = [
  { key: "match", label: "Best match" },
  { key: "price", label: "Price: Low to high" },
  { key: "rating", label: "Rating: High to low" },
  { key: "earliest", label: "Departure: Earliest" },
];
const activeParcelSearchKey = "trickle.web.activeParcelSearch";
const maxRecentSearches = 5;

export default function NewParcelRequestPage() {
  const router = useRouter();
  const recentParcelSearchesKey = recentSearchesStorageKey(getWebUserId());
  const { from, setFrom, to, setTo } = useLocationPair();
  const [pickupDate, setPickupDate] = useState("");
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [travellerSearchMessage, setTravellerSearchMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [autoSearchPending, setAutoSearchPending] = useState(false);
  const [modeFilter, setModeFilter] = useState("all");
  const [sortKey, setSortKey] = useState("match");
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const filteredTravellers = useMemo(() => {
    const list = modeFilter === "all" ? travellers : travellers.filter((traveller) => modeKey(traveller.travelMode) === modeFilter);
    return [...list].sort((first, second) => {
      if (sortKey === "price") return Number(first.pricePerPackage || first.price || 0) - Number(second.pricePerPackage || second.price || 0);
      if (sortKey === "rating") return Number(second.user?.rating ?? second.rating ?? 0) - Number(first.user?.rating ?? first.rating ?? 0);
      if (sortKey === "earliest") return String(first.departureDate || "").localeCompare(String(second.departureDate || ""));
      return 0;
    });
  }, [modeFilter, sortKey, travellers]);

  const findTravellers = async (event?: FormEvent) => {
    event?.preventDefault();
    setTravellerSearchMessage("");
    setTravellers([]);
    if (!pickupDate) {
      setError("Select a pickup date before finding travellers.");
      return;
    }
    if (!from.lat || !from.lng || !to.lat || !to.lng) {
      setError("Choose both locations from the address suggestions before finding travellers.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const query = new URLSearchParams({ lat: from.lat, lng: from.lng, radiusKm: "50", targetDate: pickupDate, status: "active" });
      let response: { items?: typeof travellers; data?: typeof travellers };
      try {
        response = await apiRequest(`/v1/travel-plans/search-by-start-date?${query.toString()}`);
      } catch {
        response = await apiRequest(`/v1/travel-plans/search?${query.toString()}`);
      }
      const matches = response.items || response.data || [];
      const enrichedMatches = await Promise.all(
        matches.map(async (traveller) => {
          const travellerId = traveller.travelerId || traveller.userId || traveller.user?.id || traveller.id;
          if (!travellerId || traveller.name || traveller.user?.name) return traveller;
          try {
            const profile = await apiRequest<{ profileDetails?: Traveller; user?: Traveller; data?: Traveller } | Traveller>(`/v1/users/${travellerId}`);
            const profileUser = "profileDetails" in profile ? profile.profileDetails : "user" in profile ? profile.user : "data" in profile ? profile.data : profile;
            return { ...traveller, user: { ...traveller.user, ...profileUser } };
          } catch {
            return traveller;
          }
        }),
      );
      setTravellers(enrichedMatches);
      setTravellerSearchMessage(matches.length ? `${matches.length} traveller${matches.length === 1 ? "" : "s"} found for your route.` : "No active travellers were found for that pickup date.");
      setSearchSubmitted(true);
      const search: RecentSearch = { from, to, pickupDate, travellers: enrichedMatches };
      void apiRequest("/v1/recent-searches", {
        method: "POST",
        body: JSON.stringify({
          from: { address: from.address, lat: Number(from.lat), lng: Number(from.lng) },
          to: { address: to.address, lat: Number(to.lat), lng: Number(to.lng) },
          pickupDate,
        }),
      }).catch(() => undefined);
      window.sessionStorage.setItem(activeParcelSearchKey, JSON.stringify(search));
      setRecentSearches((current) => {
        const next = dedupeRecentSearches([search, ...current], maxRecentSearches);
        if (recentParcelSearchesKey) window.localStorage.setItem(recentParcelSearchesKey, JSON.stringify(next));
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not find travellers.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const activeSearch = window.sessionStorage.getItem(activeParcelSearchKey);
        if (activeSearch) {
          const saved = JSON.parse(activeSearch) as RecentSearch & { autoSearch?: boolean };
          setFrom(saved.from || emptyLocation());
          setTo(saved.to || emptyLocation());
          setPickupDate(saved.pickupDate || "");
          setTravellers(saved.travellers || []);
          if (saved.travellers?.length) {
            setSearchSubmitted(true);
            setTravellerSearchMessage(`${saved.travellers.length} traveller${saved.travellers.length === 1 ? "" : "s"} found for your route.`);
          } else if (saved.autoSearch) {
            // Home hands off a route it hasn't searched yet — run the search as soon as it's loaded.
            setAutoSearchPending(true);
          }
        }
        if (recentParcelSearchesKey) {
          const savedRecentSearches = window.localStorage.getItem(recentParcelSearchesKey);
          if (savedRecentSearches) setRecentSearches(dedupeRecentSearches(JSON.parse(savedRecentSearches) as RecentSearch[], maxRecentSearches));
        }
      } catch {
        window.sessionStorage.removeItem(activeParcelSearchKey);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentParcelSearchesKey]);

  useEffect(() => {
    if (!autoSearchPending || !from.lat || !to.lat || !pickupDate) return;
    queueMicrotask(() => {
      setAutoSearchPending(false);
      findTravellers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchPending, from.lat, to.lat, pickupDate]);

  useEffect(() => {
    apiRequest<{ items?: RecentSearch[] }>("/v1/recent-searches")
      .then((response) => {
        const searches = dedupeRecentSearches(response.items || [], maxRecentSearches).map((search) => ({
          ...search,
          from: { ...search.from, lat: String(search.from.lat || ""), lng: String(search.from.lng || "") },
          to: { ...search.to, lat: String(search.to.lat || ""), lng: String(search.to.lng || "") },
        }));
        setRecentSearches(searches);
        if (recentParcelSearchesKey) window.localStorage.setItem(recentParcelSearchesKey, JSON.stringify(searches));
      })
      .catch(() => {
        // Browser storage remains a fallback when an older API deployment lacks this endpoint.
      });
  }, [recentParcelSearchesKey]);

  const openTravellerDetails = (traveller: Traveller) => {
    window.sessionStorage.setItem("trickle.web.selectedTraveller", JSON.stringify({ traveller, from, to, pickupDate, parcelNotes: "" }));
    router.push("/travellers/details");
  };

  const requestTraveller = (traveller: Traveller) => {
    window.sessionStorage.setItem("trickle.web.selectedTraveller", JSON.stringify({ traveller, from, to, pickupDate, parcelNotes: "" }));
    router.push("/travellers/request");
  };

  const selectRecentSearch = (search: RecentSearch) => {
    setFrom(search.from);
    setTo(search.to);
    setPickupDate(search.pickupDate);
    setTravellers(search.travellers || []);
    setSearchSubmitted(Boolean(search.travellers));
    setTravellerSearchMessage(search.travellers?.length ? `${search.travellers.length} traveller${search.travellers.length === 1 ? "" : "s"} found for your route.` : "");
    setError("");
    window.sessionStorage.setItem(activeParcelSearchKey, JSON.stringify(search));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-5 pb-32 sm:px-8">
        <section className="border-b border-[#ded8ce] py-10 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Send a parcel</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Search for travellers</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#62645f]">Choose a pickup date and route to find travellers heading your way.</p>
        </section>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">
            {error}
          </p>
        )}

        <form onSubmit={findTravellers} className="py-10">
          {!searchSubmitted && (
            <div className="grid gap-5 lg:grid-cols-2">
              <label className={labelClass}>
                Pickup date
                <p className="mt-1 text-xs font-normal leading-5 text-[#62645f]">Choose the day you want your parcel collected.</p>
                <input required type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} className={inputClass} min={new Date().toISOString().slice(0, 10)} />
              </label>
              <div className="hidden lg:block" aria-hidden="true" />
              <LocationFields title="Pickup location" hint="Where should the traveller collect your parcel?" value={from} onChange={setFrom} />
              <LocationFields title="Delivery location" hint="Where should the parcel be delivered?" value={to} onChange={setTo} />
              <button disabled={submitting} className="rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cf4935] disabled:opacity-60 lg:col-span-2">
                {submitting ? "Finding travellers..." : "Find travellers"}
              </button>
            </div>
          )}
          {searchSubmitted && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d5eadf] bg-[#f2f8f5] p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#285c59]">Your search</p>
                <p className="mt-2 break-words text-base font-semibold text-[#183b3a]">{from.address} <span className="px-1 text-[#e85b43]">→</span> {to.address}</p>
                <p className="mt-1 text-sm text-[#62645f]">Pickup {formatSearchDate(pickupDate)}</p>
              </div>
              <button type="button" onClick={() => setSearchSubmitted(false)} className="shrink-0 rounded-xl border border-[#285c59] bg-white px-4 py-2.5 text-sm font-semibold text-[#285c59] hover:border-[#e85b43] hover:text-[#e85b43]">Change search</button>
            </div>
          )}
          {travellerSearchMessage && <p role="status" className="mb-4 text-sm font-semibold text-[#285c59]">{travellerSearchMessage}</p>}
          {travellers.length > 0 && (
            <div className="rounded-2xl border border-[#e7b65c] bg-[#fffaf0] p-5 shadow-[0_12px_35px_rgba(122,83,16,0.08)] sm:p-7">
              <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Best matches</p><h3 className="mt-1 text-2xl font-semibold text-[#183b3a]">Travellers on this route</h3></div>
                <label className="text-xs font-semibold text-[#62645f]">
                  Sort by{" "}
                  <select value={sortKey} onChange={(event) => setSortKey(event.target.value)} className="ml-1 rounded-full border border-[#d7d2c9] bg-white px-3 py-1.5 text-xs font-semibold text-[#183b3a] outline-none focus:border-[#e85b43]">
                    {SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {MODE_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setModeFilter(filter.key)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${modeFilter === filter.key ? "border-[#183b3a] bg-[#183b3a] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a] hover:border-[#e85b43]"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {filteredTravellers.length === 0 && <p className="text-sm text-[#62645f]">No travellers match this filter. Try a different mode.</p>}
              {filteredTravellers.map((traveller, index) => {
                const name = traveller.user?.name || traveller.name || "Traveller";
                const profilePic = traveller.user?.profilePicUrl || traveller.profilePicUrl || traveller.profilePicture;
                const rating = traveller.user?.rating ?? traveller.user?.ratings ?? traveller.rating ?? traveller.ratings;
                const completedTrips = traveller.user?.completedTrips ?? traveller.user?.totalCount ?? traveller.user?.trips ?? traveller.completedTrips ?? traveller.totalCount ?? traveller.trips;
                const price = traveller.pricePerPackage || traveller.price;
                return (
                  <article
                    key={traveller.id || traveller.travelerId || index}
                    className="border-l-2 border-[#e7b65c] bg-[#fbfaf7] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e7b65c] text-xl font-semibold text-[#183b3a]">
                          {profilePic ? <img src={profilePic} alt={`${name} profile`} className="size-full object-cover" /> : name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-lg font-semibold text-[#183b3a]">{name}</h4>
                          <p className="mt-1 text-sm text-[#62645f]">
                            ★ {rating ?? "Not rated"} <span className="px-1">·</span> {completedTrips ?? 0} completed trips
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-lg font-semibold text-[#285c59]">{price ? `₹${price}` : "Open"}</p>
                    </div>
                    <div className="mt-4 border-t border-[#ded8ce] pt-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">From</p>
                          <p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{traveller.from?.address || from.address}</p>
                        </div>
                        <span className="hidden text-[#e85b43] sm:block">→</span>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">To</p>
                          <p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{traveller.to?.address || to.address}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#62645f]">
                        <span>{traveller.departureDate ? new Date(traveller.departureDate).toLocaleString() : "Date not provided"}</span>
                        <span className="text-[#d7d2c9]">·</span>
                        <span>Up to {traveller.maxWeightKg ? `${traveller.maxWeightKg} kg` : "space"}</span>
                        <span className="ml-auto inline-flex items-center border border-[#e7b65c] bg-[#fff4d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#7a5310]">{formatTravelMode(traveller.travelMode)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => openTravellerDetails(traveller)} className="flex-1 rounded-lg border border-[#d7d2c9] bg-white py-2 text-sm font-semibold text-[#62645f] hover:border-[#e85b43]">
                        View profile
                      </button>
                      <button type="button" onClick={() => requestTraveller(traveller)} className="flex-1 rounded-lg bg-[#e85b43] py-2 text-sm font-semibold text-white hover:bg-[#cf4935]">
                        Request →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            </div>
          )}
        </form>

        <section className="border-t border-[#ded8ce] py-10">
          <h2 className="text-lg font-semibold text-[#183b3a]">Recent searches</h2>
          {recentSearches.length ? (
            <div className="mt-5 grid gap-3">
              {recentSearches.slice(0, maxRecentSearches).map((search, index) => (
                <button
                  type="button"
                  key={`${search.from.address}-${search.to.address}-${search.pickupDate}-${index}`}
                  onClick={() => selectRecentSearch(search)}
                  className="grid gap-3 border border-[#ded8ce] bg-[#fbfaf7] p-4 text-left transition hover:border-[#e85b43] sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[#183b3a]">
                      {search.from.address || "Starting point"} <span className="px-1 text-[#e85b43]">→</span> {search.to.address || "Destination"}
                    </p>
                    <p className="mt-1 text-xs text-[#62645f]">
                      Pickup {formatSearchDate(search.pickupDate)} · {search.travellers?.length || 0} traveller matches
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#e85b43]">Open search →</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[#62645f]">No recent searches yet. Search for a traveller and your latest parcel routes will appear here.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
