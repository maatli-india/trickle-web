"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MatchPreview } from "@/components/home/match-preview";
import { ParcelSearch } from "@/components/home/parcel-search";
import { hasAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api-client";

type FeatureFlow = "parcel" | "trip" | null;
type LocationForm = { address: string; lat: string; lng: string };
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
};
type RecentSearch = {
  from: LocationForm;
  to: LocationForm;
  pickupDate: string;
  parcelNotes: string;
  travellers?: Traveller[];
};

const emptyLocation = (): LocationForm => ({ address: "", lat: "", lng: "" });
const formatDateTime = (value: string) => (value ? `${value}:00` : "");
const formatSearchDate = (value: string) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB")
    : "Date not provided";
const formatTravelMode = (value?: string) => {
  const labels: Record<string, string> = {
    by_flight: "Flight",
    by_road: "Road",
    by_train: "Train",
  };
  return labels[value || ""] || "Travel mode not provided";
};
const activeParcelSearchKey = "trickle.web.activeParcelSearch";
const recentParcelSearchesKey = "trickle.web.recentParcelSearches";
const maxRecentSearches = 5;

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]";
const labelClass = "block text-sm font-semibold text-[#183b3a]";

const getAreaName = (result: {
  address_components?: Array<{ long_name: string; types: string[] }>;
  formatted_address?: string;
}) => {
  const components = result.address_components || [];
  const area =
    components.find((component) => component.types.includes("neighborhood")) ||
    components.find((component) => component.types.includes("sublocality")) ||
    components.find((component) => component.types.includes("locality"));
  const city = components.find((component) =>
    component.types.includes("locality"),
  );
  if (area && city && area.long_name !== city.long_name)
    return `${area.long_name}, ${city.long_name}`;
  return area?.long_name || result.formatted_address || "Current location";
};

type AddressSuggestion = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
};

function LocationFields({
  title,
  hint,
  value,
  onChange,
  onUseCurrentLocation,
  locating,
}: {
  title: string;
  hint: string;
  value: LocationForm;
  onChange: (value: LocationForm) => void;
  onUseCurrentLocation: () => void;
  locating: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedAddressRef = useRef("");

  useEffect(() => {
    if (value.lat && value.lng) selectedAddressRef.current = value.address;
  }, [value.address, value.lat, value.lng]);

  useEffect(() => {
    if (
      value.address === selectedAddressRef.current ||
      value.address === "Current location" ||
      value.address.trim().length < 2
    )
      return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(value.address)}`,
          { signal: controller.signal },
        );
        if (response.ok)
          setSuggestions((await response.json()).predictions || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value.address]);

  const visibleSuggestions =
    value.address.trim().length >= 2 && value.address !== "Current location"
      ? suggestions
      : [];

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    setSearching(false);
    const response = await fetch(
      `/api/places/details?placeId=${encodeURIComponent(suggestion.place_id)}`,
    );
    if (!response.ok) return;
    const result = await response.json();
    const location = result.result?.geometry?.location;
    if (location) {
      const address = result.result.formatted_address || suggestion.description;
      selectedAddressRef.current = address;
      onChange({
        address,
        lat: String(location.lat),
        lng: String(location.lng),
      });
    }
  };

  return (
    <fieldset className="rounded-xl border border-[#ded8ce] bg-[#fbfaf7] p-4">
      <legend className="px-1 text-sm font-semibold text-[#183b3a]">
        {title}
      </legend>
      <p className="mb-3 text-xs leading-5 text-[#62645f]">{hint}</p>
      <label className={labelClass}>
        Address
        <div className="relative">
          <input
            required
            value={value.address}
            onChange={(event) => {
              selectedAddressRef.current = "";
              onChange({ address: event.target.value, lat: "", lng: "" });
            }}
            className={inputClass}
            placeholder="Search an area or address"
            autoComplete="off"
          />
          {(searching || visibleSuggestions.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#d7d2c9] bg-white shadow-lg">
              {searching && (
                <p className="px-4 py-3 text-xs text-[#62645f]">
                  Searching areas...
                </p>
              )}
              {visibleSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.place_id}
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full border-b border-[#eee9e1] px-4 py-3 text-left last:border-0 hover:bg-[#f6f2eb]"
                >
                  <span className="block text-sm font-semibold text-[#183b3a]">
                    {suggestion.structured_formatting?.main_text ||
                      suggestion.description}
                  </span>
                  {suggestion.structured_formatting?.secondary_text && (
                    <span className="mt-1 block text-xs text-[#62645f]">
                      {suggestion.structured_formatting.secondary_text}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </label>
      <button
        type="button"
        onClick={onUseCurrentLocation}
        disabled={locating}
        className="mt-3 text-sm font-semibold text-[#e85b43] hover:text-[#183b3a] disabled:opacity-60"
      >
        {locating ? "Requesting location..." : "Use my current location"}
      </button>
      <p className="mt-1 text-xs leading-5 text-[#62645f]">
        Your browser will ask for permission before sharing this location. Use
        the button before submitting.
      </p>
    </fieldset>
  );
}

function PublicHome() {
  return (
    <div className="min-h-screen bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />

      <main id="top" className="mx-auto max-w-7xl px-5 pb-32 sm:px-8">
        <section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">
              People-powered delivery
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">
              A parcel can travel with someone already going your way.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#62645f]">
              Find a traveler on your route, agree on the details, and hand over
              with confidence. Trickle keeps the journey clear from first match
              to delivery.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#send"
                className="rounded-full bg-[#e85b43] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#cf4935]"
              >
                Send a parcel
              </a>
              <a
                href="#travel"
                className="rounded-full border border-[#bbb6ad] px-6 py-3 text-center text-sm font-semibold transition hover:border-[#1b1d1c]"
              >
                Post your trip
              </a>
            </div>
          </div>
          <MatchPreview />
        </section>

        <ParcelSearch />

        <section
          id="activity"
          className="grid gap-5 pb-12 sm:grid-cols-3 sm:pb-20"
        >
          {[
            [
              "01",
              "Match with a route",
              "See travelers already heading in the right direction.",
            ],
            [
              "02",
              "Agree together",
              "Review parcel details and settle on a fair amount.",
            ],
            [
              "03",
              "Handoff with care",
              "Use pickup and delivery verification at each handoff.",
            ],
          ].map(([number, title, description]) => (
            <article key={number} className="border-t-2 border-[#e7b65c] pt-4">
              <span className="text-xs font-semibold text-[#e85b43]">
                {number}
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#62645f]">
                {description}
              </p>
            </article>
          ))}
        </section>

        <section
          id="travel"
          className="scroll-mt-8 border-t border-[#ded8ce] py-12 sm:py-16"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">
              Have a journey planned?
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Turn your spare space into a useful route.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#62645f]">
              Post your origin, destination, travel date, and available parcel
              space. We will show you requests that fit your journey.
            </p>
            <button className="mt-6 rounded-full bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#285c59]">
              Post a trip
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function AuthenticatedHome() {
  const router = useRouter();
  const [flow, setFlow] = useState<FeatureFlow>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [from, setFrom] = useState(emptyLocation);
  const [to, setTo] = useState(emptyLocation);
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [travelMode, setTravelMode] = useState("by_road");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [maxWeightKg, setMaxWeightKg] = useState("");
  const [maxParcelCount, setMaxParcelCount] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [parcelNotes, setParcelNotes] = useState("");
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [travellerSearchMessage, setTravellerSearchMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState<"from" | "to" | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const requestedFlow = new URLSearchParams(window.location.search).get("flow");
        const activeSearch = window.sessionStorage.getItem(
          activeParcelSearchKey,
        );
        if (activeSearch) {
          const saved = JSON.parse(activeSearch) as RecentSearch;
          setFrom(saved.from || emptyLocation());
          setTo(saved.to || emptyLocation());
          setPickupDate(saved.pickupDate || "");
          setParcelNotes(saved.parcelNotes || "");
          setTravellers(saved.travellers || []);
          setFlow("parcel");
          if (saved.travellers?.length)
            setTravellerSearchMessage(
              `${saved.travellers.length} traveller${saved.travellers.length === 1 ? "" : "s"} found for your route.`,
            );
        }
        const savedRecentSearches = window.localStorage.getItem(
          recentParcelSearchesKey,
        );
        if (savedRecentSearches) {
          const recentSearches = (
            JSON.parse(savedRecentSearches) as RecentSearch[]
          ).slice(0, maxRecentSearches);
          setRecentSearches(recentSearches);
          window.localStorage.setItem(
            recentParcelSearchesKey,
            JSON.stringify(recentSearches),
          );
        }
        if (requestedFlow === "parcel" || requestedFlow === "trip") {
          setFlow(requestedFlow);
          window.requestAnimationFrame(() =>
            document
              .getElementById("feature-flow")
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }
      } catch {
        window.sessionStorage.removeItem(activeParcelSearchKey);
        window.localStorage.removeItem(recentParcelSearchesKey);
      }
    });
  }, []);

  useEffect(() => {
    apiRequest<{ items?: RecentSearch[] }>("/v1/recent-searches")
      .then((response) => {
        const searches = (response.items || []).slice(0, maxRecentSearches).map((search) => ({
          ...search,
          from: { ...search.from, lat: String(search.from.lat || ""), lng: String(search.from.lng || "") },
          to: { ...search.to, lat: String(search.to.lat || ""), lng: String(search.to.lng || "") },
        }));
        setRecentSearches(searches);
        window.localStorage.setItem(recentParcelSearchesKey, JSON.stringify(searches));
      })
      .catch(() => {
        // Browser storage remains a fallback when an older API deployment lacks this endpoint.
      });
  }, []);

  const requestCurrentLocation = (target: "from" | "to") => {
    if (!navigator.geolocation) {
      setError(
        "Location is not available in this browser. Enter the coordinates manually.",
      );
      return;
    }
    setError("");
    setLocating(target);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = {
          address: "Current location",
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        };
        fetch(
          `/api/places/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`,
        )
          .then((response) => (response.ok ? response.json() : null))
          .then((result) => {
            const address = result?.results?.[0]
              ? getAreaName(result.results[0])
              : "Current location";
            const resolved = { ...location, address };
            if (target === "from") setFrom(resolved);
            else setTo(resolved);
          })
          .catch(() => {
            if (target === "from") setFrom(location);
            else setTo(location);
          })
          .finally(() => setLocating(null));
      },
      (locationError) => {
        setLocating(null);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. You can allow it in Chrome site settings or enter coordinates manually."
            : "Could not determine your location. Enter the coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const openFlow = (nextFlow: FeatureFlow) => {
    setFlow(nextFlow);
    setMessage("");
    setError("");
    window.requestAnimationFrame(() => {
      document
        .getElementById("feature-flow")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const findTravellers = async (event: FormEvent) => {
    event.preventDefault();
    setTravellerSearchMessage("");
    setTravellers([]);
    if (!pickupDate) {
      setError("Select a pickup date before finding travellers.");
      return;
    }
    if (!from.lat || !from.lng || !to.lat || !to.lng) {
      setError(
        "Use your current location for both route locations before finding travellers.",
      );
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({
        lat: from.lat,
        lng: from.lng,
        radiusKm: "50",
        targetDate: pickupDate,
        status: "active",
      });
      let response: { items?: typeof travellers; data?: typeof travellers };
      try {
        response = await apiRequest<{
          items?: typeof travellers;
          data?: typeof travellers;
        }>(`/v1/travel-plans/search-by-start-date?${query.toString()}`);
      } catch {
        // Older hosted API deployments expose the general search route only.
        response = await apiRequest<{
          items?: typeof travellers;
          data?: typeof travellers;
        }>(`/v1/travel-plans/search?${query.toString()}`);
      }
      const matches = response.items || response.data || [];
      const enrichedMatches = await Promise.all(
        matches.map(async (traveller) => {
          const travellerId =
            traveller.travelerId ||
            traveller.userId ||
            traveller.user?.id ||
            traveller.id;
          if (!travellerId || traveller.name || traveller.user?.name)
            return traveller;
          try {
            const profile = await apiRequest<
              | {
                  profileDetails?: Traveller;
                  user?: Traveller;
                  data?: Traveller;
                }
              | Traveller
            >(`/v1/users/${travellerId}`);
            const profileUser =
              "profileDetails" in profile
                ? profile.profileDetails
                : "user" in profile
                  ? profile.user
                  : "data" in profile
                    ? profile.data
                    : profile;
            return {
              ...traveller,
              user: { ...traveller.user, ...profileUser },
            };
          } catch {
            return traveller;
          }
        }),
      );
      setTravellers(enrichedMatches);
      setTravellerSearchMessage(
        matches.length
          ? `${matches.length} traveller${matches.length === 1 ? "" : "s"} found for your route.`
          : "No active travellers were found for that pickup date.",
      );
      const search: RecentSearch = {
        from,
        to,
        pickupDate,
        parcelNotes,
        travellers: enrichedMatches,
      };
      void apiRequest("/v1/recent-searches", {
        method: "POST",
        body: JSON.stringify({
          from: { address: from.address, lat: Number(from.lat), lng: Number(from.lng) },
          to: { address: to.address, lat: Number(to.lat), lng: Number(to.lng) },
          pickupDate,
          parcelNotes,
        }),
      }).catch(() => {
        // Local history remains available until the backend route is deployed.
      });
      window.sessionStorage.setItem(
        activeParcelSearchKey,
        JSON.stringify(search),
      );
      setRecentSearches((current) => {
        const next = [
          search,
          ...current.filter(
            (item) =>
              !(
                item.from.address === from.address &&
                item.to.address === to.address &&
                item.pickupDate === pickupDate
              ),
          ),
        ].slice(0, maxRecentSearches);
        window.localStorage.setItem(
          recentParcelSearchesKey,
          JSON.stringify(next),
        );
        return next;
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not find travellers.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openTravellerDetails = (traveller: Traveller) => {
    window.sessionStorage.setItem(
      "trickle.web.selectedTraveller",
      JSON.stringify({ traveller, from, to, pickupDate, parcelNotes }),
    );
    router.push("/travellers/details");
  };

  const selectRecentSearch = (search: RecentSearch) => {
    setFlow("parcel");
    setFrom(search.from);
    setTo(search.to);
    setPickupDate(search.pickupDate);
    setParcelNotes(search.parcelNotes);
    setTravellers(search.travellers || []);
    setTravellerSearchMessage(
      search.travellers?.length
        ? `${search.travellers.length} traveller${search.travellers.length === 1 ? "" : "s"} found for your route.`
        : "",
    );
    setError("");
    window.sessionStorage.setItem(
      activeParcelSearchKey,
      JSON.stringify(search),
    );
    window.requestAnimationFrame(() =>
      document
        .getElementById("feature-flow")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const submitTrip = async (event: FormEvent) => {
    event.preventDefault();
    if (!from.lat || !from.lng || !to.lat || !to.lng) {
      setError(
        "Use your current location for both departure and arrival locations before submitting.",
      );
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/v1/travel-plans", {
        method: "POST",
        body: JSON.stringify({
          from: {
            address: from.address,
            lat: Number(from.lat),
            lng: Number(from.lng),
          },
          to: { address: to.address, lat: Number(to.lat), lng: Number(to.lng) },
          departureDate: formatDateTime(departureDate),
          arrivalDate: formatDateTime(arrivalDate),
          travelMode,
          timezone: "Asia/Kolkata",
          additionalInfo: additionalInfo || undefined,
          maxWeightKg: maxWeightKg ? Number(maxWeightKg) : undefined,
          maxParcelCount: maxParcelCount ? Number(maxParcelCount) : undefined,
        }),
      });
      setMessage("Your trip was posted successfully.");
      setFlow(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not post your trip.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main id="top" className="mx-auto max-w-7xl px-5 pb-32 sm:px-8">
        <section className="border-b border-[#ded8ce] py-12 sm:py-16 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">
            Your Trickle home
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">
            What would you like to do today?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#62645f]">
            Send a parcel, post your journey, and manage your activity from one
            place.
          </p>
        </section>

        {message && (
          <p
            role="status"
            className="mt-8 rounded-xl border border-[#285c59]/20 bg-[#e5f0eb] px-4 py-3 text-sm text-[#183b3a]"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]"
          >
            {error}
          </p>
        )}

        <section className="grid gap-5 py-10 sm:grid-cols-2 lg:py-14">
          <button
            type="button"
            onClick={() => openFlow("parcel")}
            className="group cursor-pointer border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e85b43] sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">
              Send a parcel
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Search for travellers
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              Share your pickup date, route, and parcel notes to find travellers
              heading your way.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-[#183b3a] transition group-hover:text-[#e85b43]">
              Find travellers →
            </span>
          </button>
          <button
            type="button"
            onClick={() => openFlow("trip")}
            className="group cursor-pointer border-t-2 border-[#e7b65c] bg-[#fbfaf7] p-6 text-left transition hover:-translate-y-1 hover:bg-white hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e7b65c] sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#183b3a]">
              Post a trip
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Share your upcoming journey
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#62645f]">
              Add your route and available space so parcel requests can find
              you.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-[#183b3a] transition group-hover:text-[#e85b43]">
              Post your trip →
            </span>
          </button>
        </section>

        {flow && (
          <section
            id="feature-flow"
            className="scroll-mt-8 border-t border-[#ded8ce] py-10 lg:py-14"
            aria-label={
              flow === "parcel" ? "Search for travellers" : "Post a trip"
            }
          >
            <div className="mb-8 flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">
                  {flow === "parcel" ? "Send a parcel" : "Post a trip"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {flow === "parcel"
                    ? "Search for travellers"
                    : "Share your upcoming journey"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#62645f]">
                  {flow === "parcel"
                    ? "Tell us when and where your parcel needs to travel. We will look for active travellers whose journey starts near your pickup route."
                    : "Use the same route and request details as the mobile app."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFlow(null)}
                className="text-sm font-semibold text-[#62645f] hover:text-[#e85b43]"
              >
                Close
              </button>
            </div>
            {flow === "parcel" ? (
              <form
                onSubmit={findTravellers}
                className="grid gap-5 lg:grid-cols-2"
              >
                <label className={labelClass}>
                  Pickup date
                  <p className="mt-1 text-xs font-normal leading-5 text-[#62645f]">
                    Choose the day you want your parcel collected.
                  </p>
                  <input
                    required
                    type="date"
                    value={pickupDate}
                    onChange={(event) => setPickupDate(event.target.value)}
                    className={inputClass}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <div className="hidden lg:block" aria-hidden="true" />
                <LocationFields
                  title="Pickup location"
                  hint="Where should the traveller collect your parcel?"
                  value={from}
                  onChange={setFrom}
                  onUseCurrentLocation={() => requestCurrentLocation("from")}
                  locating={locating === "from"}
                />
                <LocationFields
                  title="Delivery location"
                  hint="Where should the parcel be delivered?"
                  value={to}
                  onChange={setTo}
                  onUseCurrentLocation={() => requestCurrentLocation("to")}
                  locating={locating === "to"}
                />
                <label className={`${labelClass} lg:col-span-2`}>
                  Parcel notes
                  <p className="mt-1 text-xs font-normal leading-5 text-[#62645f]">
                    Describe the item so travellers can decide whether it is
                    suitable to carry.
                  </p>
                  <textarea
                    value={parcelNotes}
                    onChange={(event) => setParcelNotes(event.target.value)}
                    className={`${inputClass} min-h-28`}
                    placeholder="E.g. small fragile package, clothing, or special instructions"
                  />
                </label>
                <button
                  disabled={submitting}
                  className="rounded-xl bg-[#e85b43] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#cf4935] disabled:opacity-60 lg:col-span-2"
                >
                  {submitting ? "Finding travellers..." : "Find travellers"}
                </button>
                {travellerSearchMessage && (
                  <p
                    role="status"
                    className="lg:col-span-2 text-sm text-[#285c59]"
                  >
                    {travellerSearchMessage}
                  </p>
                )}
                {travellers.length > 0 && (
                  <div className="space-y-3 lg:col-span-2">
                    <h3 className="text-xl font-semibold text-[#183b3a]">
                      Travellers on this route
                    </h3>
                    {travellers.map((traveller, index) => {
                      const name =
                        traveller.user?.name || traveller.name || "Traveller";
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
                        traveller.trips;
                      return (
                        <article
                          key={traveller.id || traveller.travelerId || index}
                          onClick={() => openTravellerDetails(traveller)}
                          className="cursor-pointer border-l-2 border-[#e7b65c] bg-[#fbfaf7] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                        >
                          <div className="flex items-start gap-4">
                            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e7b65c] text-xl font-semibold text-[#183b3a]">
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
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-lg font-semibold text-[#183b3a]">
                                {name}
                              </h4>
                              <p className="mt-1 text-sm text-[#62645f]">
                                ★ {rating ?? "Not rated"}{" "}
                                <span className="px-1">·</span>{" "}
                                {completedTrips ?? 0} completed trips
                              </p>
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
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm text-[#62645f]">
                                {traveller.departureDate
                                  ? new Date(
                                      traveller.departureDate,
                                    ).toLocaleString()
                                  : "Date not provided"}
                              </p>
                              <span className="inline-flex items-center border border-[#e7b65c] bg-[#fff4d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#7a5310]">
                                {formatTravelMode(traveller.travelMode)}
                              </span>
                            </div>
                          </div>
                          <span className="mt-4 inline-block text-sm font-semibold text-[#e85b43]">
                            View details →
                          </span>
                        </article>
                      );
                    })}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={submitTrip} className="grid gap-5 lg:grid-cols-2">
                <LocationFields
                  title="Departure location"
                  hint="Where will your journey begin?"
                  value={from}
                  onChange={setFrom}
                  onUseCurrentLocation={() => requestCurrentLocation("from")}
                  locating={locating === "from"}
                />
                <LocationFields
                  title="Arrival location"
                  hint="Where will your journey end?"
                  value={to}
                  onChange={setTo}
                  onUseCurrentLocation={() => requestCurrentLocation("to")}
                  locating={locating === "to"}
                />
                <label className={labelClass}>
                  Departure date and time
                  <input
                    required
                    type="datetime-local"
                    value={departureDate}
                    onChange={(event) => setDepartureDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Arrival date and time
                  <input
                    required
                    type="datetime-local"
                    value={arrivalDate}
                    onChange={(event) => setArrivalDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Travel mode
                  <select
                    value={travelMode}
                    onChange={(event) => setTravelMode(event.target.value)}
                    className={inputClass}
                  >
                    <option value="by_road">By road</option>
                    <option value="by_train">By train</option>
                    <option value="by_flight">By flight</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Additional information
                  <textarea
                    value={additionalInfo}
                    onChange={(event) => setAdditionalInfo(event.target.value)}
                    className={`${inputClass} min-h-24`}
                    placeholder="Luggage space, travel notes, etc."
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>
                    Max weight (kg)
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={maxWeightKg}
                      onChange={(event) => setMaxWeightKg(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Max parcels
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={maxParcelCount}
                      onChange={(event) =>
                        setMaxParcelCount(event.target.value)
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <button
                  disabled={submitting}
                  className="rounded-xl bg-[#183b3a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#285c59] disabled:opacity-60"
                >
                  {submitting ? "Posting trip..." : "Post your trip"}
                </button>
              </form>
            )}
          </section>
        )}

        <section className="grid gap-5 border-t border-[#ded8ce] py-10 sm:grid-cols-3 sm:py-14">
          <article className="border-t-2 border-[#e85b43] pt-4 sm:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Saved routes</p>
                <h2 className="mt-1 text-lg font-semibold">Recent searches</h2>
              </div>
              <span className="text-sm text-[#62645f]">Your latest parcel searches</span>
            </div>
            {recentSearches.length ? (
              <div className="mt-5 grid gap-3">
                {recentSearches.slice(0, maxRecentSearches).map((search, index) => (
                  <button type="button" key={`${search.from.address}-${search.to.address}-${search.pickupDate}-${index}`} onClick={() => selectRecentSearch(search)} className="grid gap-3 border border-[#ded8ce] bg-[#fbfaf7] p-4 text-left transition hover:border-[#e85b43] sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#183b3a]">{search.from.address || "Starting point"} <span className="px-1 text-[#e85b43]">→</span> {search.to.address || "Destination"}</p>
                      <p className="mt-1 text-xs text-[#62645f]">Pickup {formatSearchDate(search.pickupDate)} · {search.travellers?.length || 0} traveller matches</p>
                      {search.parcelNotes && <p className="mt-2 truncate text-xs text-[#77766f]">{search.parcelNotes}</p>}
                    </div>
                    <span className="text-xs font-semibold text-[#e85b43]">Open search →</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[#62645f]">No recent searches yet. Search for a traveller and your latest parcel routes will appear here.</p>
            )}
          </article>
          <article className="border-t border-[#bbb6ad] pt-4">
            <h2 className="text-lg font-semibold">Delivery history</h2>
            <p className="mt-2 text-sm leading-6 text-[#62645f]">Parcel activity will appear here when delivery requests are available for your account.</p>
            <Link href="/account/delivery-history" className="mt-4 inline-block text-sm font-semibold text-[#e85b43] hover:text-[#183b3a]">View delivery history →</Link>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function Home() {
  const authenticated = useSyncExternalStore(
    () => () => {},
    hasAccessToken,
    () => false,
  );
  return authenticated ? <AuthenticatedHome /> : <PublicHome />;
}
