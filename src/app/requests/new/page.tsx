"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LocationFields, emptyLocation, inputClass, labelClass, type LocationForm } from "@/components/forms/location-fields";
import { useLocationPair } from "@/hooks/use-location-pair";
import { apiRequest } from "@/services/api-client";
import { getWebUserId } from "@/services/auth";
import { dedupeRecentSearches, recentSearchesStorageKey } from "@/lib/recent-searches";
import { searchTravelPlansFlexible, searchTravelPlansStartingOnDate } from "@/services/travel-plans";

// Display-only mirror of transitorder's constants.TravelSearchMaxFlexDays —
// the backend is what actually enforces the cutoff.
const MAX_FLEX_DAYS = 5;

// searchTravelPlansStartingOnDate only ever geo-filters one leg of the
// route server-side — this checks the destination side client-side for
// that call specifically, so exact-date results still respect both pickup
// and delivery location.
const distanceKm = (
  first?: { lat?: number | string; lng?: number | string },
  second?: { lat?: number | string; lng?: number | string },
) => {
  const firstLat = Number(first?.lat);
  const firstLng = Number(first?.lng);
  const secondLat = Number(second?.lat);
  const secondLng = Number(second?.lng);
  if (!Number.isFinite(firstLat) || !Number.isFinite(firstLng) || !Number.isFinite(secondLat) || !Number.isFinite(secondLng)) return Infinity;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latDelta = radians(secondLat - firstLat);
  const lngDelta = radians(secondLng - firstLng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(firstLat)) * Math.cos(radians(secondLat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  from?: { address?: string; lat?: number; lng?: number };
  to?: { address?: string; lat?: number; lng?: number };
  departureDate?: string;
  arrivalDate?: string;
  travelMode?: string;
  additionalInfo?: string;
  maxWeightKg?: number;
  pricePerPackage?: number;
  senderDisplayPricePerPackage?: number;
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
  // laterTravellers is only populated alongside exact-date travellers (the
  // "travelling later on same route" section) — when there were no
  // exact-date matches, the flexible search's laterMatches get promoted
  // into `travellers` instead and this stays empty.
  const [laterTravellers, setLaterTravellers] = useState<Traveller[]>([]);
  const [usedFallbackDate, setUsedFallbackDate] = useState(false);
  const [travellerSearchMessage, setTravellerSearchMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [autoSearchPending, setAutoSearchPending] = useState(false);
  const [modeFilter, setModeFilter] = useState("all");
  const [sortKey, setSortKey] = useState("match");
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const filterAndSortTravellers = useCallback(
    (list: Traveller[]) => {
      const modeFiltered = modeFilter === "all" ? list : list.filter((traveller) => modeKey(traveller.travelMode) === modeFilter);
      return [...modeFiltered].sort((first, second) => {
        if (sortKey === "price") return Number(first.senderDisplayPricePerPackage ?? first.pricePerPackage ?? first.price ?? 0) - Number(second.senderDisplayPricePerPackage ?? second.pricePerPackage ?? second.price ?? 0);
        if (sortKey === "rating") return Number(second.user?.rating ?? second.rating ?? 0) - Number(first.user?.rating ?? first.rating ?? 0);
        if (sortKey === "earliest") return String(first.departureDate || "").localeCompare(String(second.departureDate || ""));
        return 0;
      });
    },
    [modeFilter, sortKey],
  );
  const filteredTravellers = useMemo(() => filterAndSortTravellers(travellers), [filterAndSortTravellers, travellers]);
  const filteredLaterTravellers = useMemo(() => filterAndSortTravellers(laterTravellers), [filterAndSortTravellers, laterTravellers]);

  // Fetches each traveller's profile when the search result didn't already
  // carry a name — same enrichment logic for both the exact and later sets.
  const enrichTravellers = (matches: Traveller[]) =>
    Promise.all(
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

  const findTravellers = async (event?: FormEvent) => {
    event?.preventDefault();
    setTravellerSearchMessage("");
    setTravellers([]);
    setLaterTravellers([]);
    setUsedFallbackDate(false);
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
      // Exact-date matches: the already-deployed, stable search. This is
      // the core experience — it must keep working regardless of whether
      // the bonus "later matches" search below is deployed.
      const exactSearch = searchTravelPlansStartingOnDate({
        lat: Number(from.lat),
        lng: Number(from.lng),
        radiusKm: 50,
        targetDate: pickupDate,
        status: "active",
      }).then((response) => ((response.items || []) as Traveller[]).filter((traveller) => distanceKm(traveller.to, to) <= 50));

      // "Travelling later on same route" bonus set — best-effort. Any
      // failure here (not deployed yet, network blip) is swallowed so it
      // never blocks or errors the exact-date search above.
      const laterSearch = searchTravelPlansFlexible({
        lat: Number(from.lat),
        lng: Number(from.lng),
        destinationLat: Number(to.lat),
        destinationLng: Number(to.lng),
        radiusKm: 50,
        targetDate: pickupDate,
        status: "active",
      })
        .then((response) => (response.items || []) as Traveller[])
        .catch((requestError) => {
          console.warn("[requests/new] later-date search failed (non-fatal)", requestError);
          return [] as Traveller[];
        });

      const [exactMatches, laterMatches] = await Promise.all([exactSearch, laterSearch]);
      const fallback = exactMatches.length === 0 && laterMatches.length > 0;
      const mainMatches = fallback ? laterMatches : exactMatches;
      const secondaryMatches = fallback ? [] : laterMatches;
      const [enrichedMain, enrichedSecondary] = await Promise.all([enrichTravellers(mainMatches), enrichTravellers(secondaryMatches)]);

      setTravellers(enrichedMain);
      setLaterTravellers(enrichedSecondary);
      setUsedFallbackDate(fallback);
      setTravellerSearchMessage(
        fallback
          ? `No exact match on ${formatSearchDate(pickupDate)} — showing ${enrichedMain.length} traveller${enrichedMain.length === 1 ? "" : "s"} over the next ${MAX_FLEX_DAYS} days on this route instead.`
          : enrichedMain.length
            ? `${enrichedMain.length} traveller${enrichedMain.length === 1 ? "" : "s"} found for your route.`
            : "No active travellers were found for that pickup date.",
      );
      setSearchSubmitted(true);
      const search: RecentSearch = { from, to, pickupDate, travellers: enrichedMain };
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
    setLaterTravellers([]);
    setUsedFallbackDate(false);
    setSearchSubmitted(Boolean(search.travellers));
    setTravellerSearchMessage(search.travellers?.length ? `${search.travellers.length} traveller${search.travellers.length === 1 ? "" : "s"} found for your route.` : "");
    setError("");
    window.sessionStorage.setItem(activeParcelSearchKey, JSON.stringify(search));
  };

  // isLater: true for a card in the "travelling later on same route"
  // section, or for the main list when it's been promoted from
  // laterMatches (no exact-date match) — in both cases the card's date is
  // not the sender's requested pickup date, so it's worth calling out.
  const renderTravellerCard = (traveller: Traveller, { isLater }: { isLater: boolean }) => {
    const name = traveller.user?.name || traveller.name || "Traveller";
    const profilePic = traveller.user?.profilePicUrl || traveller.profilePicUrl || traveller.profilePicture;
    const rating = traveller.user?.rating ?? traveller.user?.ratings ?? traveller.rating ?? traveller.ratings;
    const completedTrips = traveller.user?.completedTrips ?? traveller.user?.totalCount ?? traveller.user?.trips ?? traveller.completedTrips ?? traveller.totalCount ?? traveller.trips;
    const price = traveller.senderDisplayPricePerPackage ?? traveller.pricePerPackage ?? traveller.price;
    return (
      <article
        key={traveller.id || traveller.travelerId}
        className={`bg-[#fbfaf7] p-5 ${isLater ? "border-l-2 border-[#c7d8d6]" : "border-l-2 border-[#e7b65c]"}`}
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
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold text-[#285c59]">{price ? `₹${price}` : "Open"}</p>
            {price ? <p className="text-xs text-[#62645f]">per package</p> : null}
          </div>
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
            <span className={isLater ? "font-semibold text-[#b37113]" : ""}>
              {traveller.departureDate ? new Date(traveller.departureDate).toLocaleString() : "Date not provided"}
              {isLater ? " (different date)" : ""}
            </span>
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
              {filteredTravellers.map((traveller) => renderTravellerCard(traveller, { isLater: usedFallbackDate }))}
            </div>
            </div>
          )}
          {filteredLaterTravellers.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#d7d2c9] bg-white p-5 sm:p-7">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-[#183b3a]">Travelling later on same route</h3>
                  <p className="mt-1 text-sm text-[#62645f]">Within the next {MAX_FLEX_DAYS} days — a flexible option if you can ship a little sooner or later.</p>
                </div>
                {filteredLaterTravellers.map((traveller) => renderTravellerCard(traveller, { isLater: true }))}
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
