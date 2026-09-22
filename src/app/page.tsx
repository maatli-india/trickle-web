"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, BadgeCheck, Calendar, ChevronRight, FileCheck, Grid3X3, Lock, MapPin, MessageCircleWarning, Package, Search, ShieldCheck, X } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MatchPreview } from "@/components/home/match-preview";
import { ParcelSearch } from "@/components/home/parcel-search";
import { RouteSearchBox } from "@/components/home/route-search-box";
import { TravelerCard, type NearbyTravelerPlan } from "@/components/home/traveler-card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { LocationForm } from "@/components/forms/location-fields";
import { useLocationPair } from "@/hooks/use-location-pair";
import { getWebUserId, hasAccessToken } from "@/services/auth";
import { apiRequest } from "@/services/api-client";
import { searchTravelPlans } from "@/services/travel-plans";
import { listMyTravelPlans } from "@/services/travel-plans";
import { dismissHomeOverlay, listParcelMatches } from "@/services/parcel-matches";
import { listNotifications, type Notification } from "@/services/notifications";
import { extractListItems, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { isActiveIncomingRequest } from "@/lib/parcel-status";
import { ALL_CATEGORIES, CATEGORIES, MOCK_NEARBY_ARRIVALS, POPULAR_ITEMS, TINTS, getDateOptions } from "@/lib/home-constants";
import { dedupeRecentSearches, recentSearchesStorageKey } from "@/lib/recent-searches";

type RecentSearch = { from: LocationForm; to: LocationForm; pickupDate: string; parcelNotes: string; parcelCategory?: string; travellers?: unknown[] };
const activeParcelSearchKey = "trickle.web.activeParcelSearch";
const formatSearchDate = (value: string) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "Date not provided");
const formatDateTime = (value?: string) => {
  if (!value) return "Date not set";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const isUpcomingPlan = (plan: TravelPlan) => {
  const departure = new Date(String(plan.departureDate || "").replace(" ", "T"));
  if (Number.isNaN(departure.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return departure >= today;
};

function PublicHome() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />

      <main id="top" className="mx-auto flex-1 max-w-7xl px-5 pb-32 sm:px-8">
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
          id="how-it-works"
          className="scroll-mt-8 grid gap-5 pb-12 sm:grid-cols-3 sm:pb-20"
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
            <a
              href="/register"
              className="mt-6 inline-block rounded-full bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#285c59]"
            >
              Post a trip
            </a>
          </div>
        </section>

        <section className="border-t border-[#ded8ce] py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">
              Built for trust
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Safety controls at every step.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#62645f]">
              People-powered delivery only works when both sides can trust the
              process. Here is what Trickle puts in place before, during, and
              after every handoff.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BadgeCheck,
                title: "Verified accounts",
                description: "Every account is verified with phone OTP before it can send a request or post a trip.",
                href: "/safety-disclaimer",
              },
              {
                icon: FileCheck,
                title: "Pickup & delivery checks",
                description: "Parcel details are recorded up front and confirmed at pickup and drop-off.",
                href: "/community-guidelines",
              },
              {
                icon: Lock,
                title: "Secure payments",
                description: "Payments run through an approved payment provider. We never ask for OTPs or card details in chat.",
                href: "/privacy",
              },
              {
                icon: MessageCircleWarning,
                title: "Report & support",
                description: "Report a user, parcel, or message any time. Our support team investigates every report.",
                href: "/support",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col gap-4 rounded-2xl border border-[#ded8ce] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#e85b43] hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-full bg-[#e5f0eb] text-[#285c59]">
                  <item.icon size={20} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#183b3a]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#62645f]">{item.description}</p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#e85b43] opacity-0 transition group-hover:opacity-100">
                  Learn more <ChevronRight size={13} />
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-[#62645f]">
            <ShieldCheck size={16} className="shrink-0 text-[#285c59]" />
            <p>
              Read the full{" "}
              <Link href="/safety-disclaimer" className="font-semibold text-[#183b3a] underline decoration-[#e7b65c] decoration-2 underline-offset-4">
                safety disclaimer
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-[#183b3a] underline decoration-[#e7b65c] decoration-2 underline-offset-4">
                privacy policy
              </Link>{" "}
              before your first delivery.
            </p>
          </div>
        </section>

        <section className="border-t border-[#ded8ce] py-12 sm:py-16">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Have questions?</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A few things people ask first.</h2>
            </div>
            <Link href="/faqs" className="text-sm font-semibold text-[#e85b43]">See all FAQs →</Link>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["What is Trickle?", "Trickle connects parcel senders with travelers who are already heading in the right direction, so a parcel can move along a route someone is already taking."],
              ["Is it safe to send a parcel this way?", "Accounts are phone-verified, parcel details are recorded before pickup, and payments run through an approved provider. See our safety disclaimer for full guidance."],
              ["How do I contact support?", "Email support@trickle.org.in with your request or trip reference. Never share an OTP, password, or card details with anyone, including in chat."],
            ].map(([question, answer]) => (
              <div key={question} className="rounded-2xl border border-[#ded8ce] bg-[#fbfaf7] p-5">
                <h3 className="text-sm font-semibold text-[#183b3a]">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-[#62645f]">{answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#ded8ce] py-12 sm:py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#183b3a] px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Ready to move your first parcel?</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#c5d4ce]">Create an account with your phone number to send a parcel or post a trip. It takes less than a minute.</p>
            </div>
            <a href="/register" className="shrink-0 rounded-full bg-[#e85b43] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#cf4935]">
              Get started
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

type HomeTraveller = {
  travelPlanId?: string;
  travelerUserId?: string;
  from?: { address?: string };
  to?: { address?: string };
  departureDate?: string;
  arrivalDate?: string;
  travelMode?: string;
  maxWeightKg?: number;
  maxParcelCount?: number;
  acceptedParcelTypes?: string[];
  pricePerPackage?: number;
  name?: string;
  rating?: number;
};

function NearbyStatusCard({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return (
    <div className={`mt-4 flex items-center gap-4 rounded-2xl border px-5 py-5 ${error ? "border-[#f0c9bd] bg-[#fff5f1]" : "border-[#d5eadf] bg-[#f2f8f5]"}`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${error ? "bg-[#ffe2d9] text-[#c94f3d]" : "bg-[#dcefe6] text-[#285c59]"}`}>
        <MapPin size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#183b3a]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#62645f]">{message}</p>
      </div>
    </div>
  );
}

function AuthenticatedHome() {
  const router = useRouter();
  const recentParcelSearchesKey = recentSearchesStorageKey(getWebUserId());
  const dateOptions = useMemo(() => getDateOptions(), []);
  const { from, setFrom, to: address, setTo: setAddress, currentLocation, requestCurrentLocation, locationError } = useLocationPair();
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].key);
  const [customDate, setCustomDate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [nearbyTravelers, setNearbyTravelers] = useState<NearbyTravelerPlan[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbyExpanded, setNearbyExpanded] = useState(false);
  const [arrivingExpanded, setArrivingExpanded] = useState(false);
  const [requestCards, setRequestCards] = useState<ParcelMatch[]>([]);
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [routeAlert, setRouteAlert] = useState<{ title: string; message: string } | null>(null);

  const arrivingTravelers: NearbyTravelerPlan[] = useMemo(
    () => MOCK_NEARBY_ARRIVALS.map((plan) => ({ ...plan, profile: { name: plan.travelerName, rating: plan.rating } })),
    [],
  );
  const currentArea = currentLocation.address || "Locating...";

  useEffect(() => {
    queueMicrotask(() => {
      requestCurrentLocation("from");
      try {
        if (recentParcelSearchesKey) {
          const saved = window.localStorage.getItem(recentParcelSearchesKey);
          if (saved) setRecentSearches(dedupeRecentSearches(JSON.parse(saved) as RecentSearch[], 6));
        }
      } catch {
        // Ignore malformed local storage.
      }
    });
    listParcelMatches({ side: "traveler", page: 1, limit: 100 })
      .then((response) => setRequestCards(extractListItems<ParcelMatch>(response as never).filter(isActiveIncomingRequest)))
      .catch(() => undefined);
    listMyTravelPlans({ page: 1, limit: 6 })
      .then((response) => setPlans(extractListItems<TravelPlan>(response).filter((plan) => String(plan.status || "active").toLowerCase() !== "cancelled" && isUpcomingPlan(plan))))
      .catch(() => undefined);
    listNotifications({ page: 1, limit: 4 })
      .then((response) => setNotifications(extractListItems<Notification>(response)))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentParcelSearchesKey]);

  useEffect(() => {
    if (!currentLocation.lat || !currentLocation.lng) {
      queueMicrotask(() => setNearbyTravelers([]));
      return;
    }
    queueMicrotask(() => {
      setNearbyLoading(true);
      setNearbyError("");
    });
    searchTravelPlans({ lat: Number(currentLocation.lat), lng: Number(currentLocation.lng), radiusKm: 75, upcoming: true, status: "active", page: 1, limit: 10 })
      .then(async (response) => {
        const plans = extractListItems<Record<string, unknown>>(response as never);
        const entries = await Promise.all(
          plans.map(async (plan) => {
            const id = String(plan.id);
            const travelerId = (plan.travelerId || plan.travellerId) as string | undefined;
            if (!travelerId) return [id, {} as { name?: string; rating?: number }] as const;
            try {
              const profileResponse = await apiRequest<Record<string, unknown>>(`/v1/users/${travelerId}`);
              const profile = (profileResponse.profileDetails || profileResponse.data || profileResponse) as { name?: string; rating?: number };
              return [id, profile] as const;
            } catch {
              return [id, {} as { name?: string; rating?: number }] as const;
            }
          }),
        );
        const profiles = Object.fromEntries(entries);
        setNearbyTravelers(plans.map((plan) => ({ ...(plan as unknown as NearbyTravelerPlan), profile: profiles[String(plan.id)] || {} })));
      })
      .catch((error) => {
        setNearbyTravelers([]);
        setNearbyError(error instanceof Error ? error.message : "Nearby traveler data is unavailable right now.");
      })
      .finally(() => setNearbyLoading(false));
  }, [currentLocation.lat, currentLocation.lng]);

  const swapLocations = () => {
    const previousFrom = from;
    setFrom(address);
    setAddress(previousFrom);
  };

  const findTravellers = () => {
    if (!from.address.trim() || !address.address.trim()) {
      setRouteAlert({ title: "Complete your route", message: "Select both a send-from location and a delivery address." });
      return;
    }
    if (!from.lat || !from.lng || !address.lat || !address.lng) {
      setRouteAlert({ title: "Select your route", message: "Choose both locations from the address suggestions so we can find matching travellers." });
      return;
    }
    const search: RecentSearch = { from, to: address, pickupDate: selectedDate, parcelNotes: "", parcelCategory: selectedCategory || undefined };
    window.sessionStorage.setItem(activeParcelSearchKey, JSON.stringify({ ...search, autoSearch: true }));
    void apiRequest("/v1/recent-searches", {
      method: "POST",
      body: JSON.stringify({
        from: { address: from.address, lat: Number(from.lat), lng: Number(from.lng) },
        to: { address: address.address, lat: Number(address.lat), lng: Number(address.lng) },
        pickupDate: selectedDate,
      }),
    }).catch(() => undefined);
    router.push("/requests/new");
  };

  const selectRecentSearch = (search: RecentSearch) => {
    window.sessionStorage.setItem(activeParcelSearchKey, JSON.stringify(search.travellers?.length ? search : { ...search, autoSearch: true }));
    router.push("/requests/new");
  };

  const openTravelerRequest = (plan: NearbyTravelerPlan & HomeTraveller) => {
    const traveller = {
      travelPlanId: plan.id,
      travelerUserId: (plan as unknown as { travelerId?: string; travellerId?: string }).travelerId || (plan as unknown as { travellerId?: string }).travellerId,
      name: plan.profile?.name,
      rating: plan.profile?.rating,
      from: plan.from,
      to: plan.to,
      departureDate: plan.departureDate,
      arrivalDate: plan.arrivalDate,
      pricePerPackage: plan.pricePerPackage,
    };
    window.sessionStorage.setItem(
      "trickle.web.selectedTraveller",
      JSON.stringify({ traveller, from, to: address, pickupDate: selectedDate, parcelNotes: "" }),
    );
    router.push("/travellers/details");
  };

  const openRequestDetails = (request: ParcelMatch) => router.push(`/requests/${request.id}?role=traveller`);

  const dismissRequestCard = (request: ParcelMatch) => {
    setDismissingId(request.id);
    setRequestCards((current) => current.filter((item) => item.id !== request.id));
    dismissHomeOverlay(request.id).catch(() => undefined).finally(() => setDismissingId(null));
  };

  const orderedCategories = selectedCategory ? [selectedCategory, ...CATEGORIES.map((c) => c.name).filter((name) => name !== selectedCategory)] : CATEGORIES.map((c) => c.name);

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main id="top" className="mx-auto flex-1 max-w-7xl px-5 pb-32 sm:px-8">
        <div className="flex items-center justify-between gap-3 border-b border-[#ded8ce] py-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e5f0eb] text-[#285c59]">
              <MapPin size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a7a297]">Current address</p>
              <p className="truncate text-sm font-semibold text-[#183b3a]">{currentArea}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.65fr)] lg:items-start">
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e85b43]">Start a delivery</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[#183b3a] sm:text-5xl">Find a route that fits.</h1></div>
              <p className="hidden max-w-xs text-right text-sm leading-6 text-[#62645f] lg:block">Search active trips, review the full plan, and send a request when the route works for you.</p>
            </div>
            <RouteSearchBox from={from} to={address} onFromChange={setFrom} onToChange={setAddress} onSwap={swapLocations} />
            {locationError && <p className="mt-2 text-xs text-[#b33e2c]">{locationError}</p>}

        <section className="pt-8">
          <h2 className="text-base font-semibold text-[#183b3a]">What are you sending?</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 pt-2">
            {orderedCategories.map((name) => {
              const category = CATEGORIES.find((item) => item.name === name);
              const Icon = category?.icon || Grid3X3;
              const tint = TINTS[CATEGORIES.findIndex((item) => item.name === name) % TINTS.length] || TINTS[0];
              const active = selectedCategory === name;
              return (
                <button key={name} type="button" onClick={() => setSelectedCategory(name)} className="flex shrink-0 flex-col items-center gap-1.5">
                  <span
                    className="grid size-14 place-items-center rounded-full transition"
                    style={{ backgroundColor: tint.bg, color: tint.fg, outline: active ? `2px solid ${tint.fg}` : undefined, outlineOffset: 2 }}
                  >
                    <Icon size={20} />
                  </span>
                  <span className={`text-xs ${active ? "font-semibold text-[#183b3a]" : "text-[#62645f]"}`}>{name}</span>
                </button>
              );
            })}
            <button type="button" onClick={() => setAllCategoriesOpen((value) => !value)} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="grid size-14 place-items-center rounded-full bg-[#eef1f6] text-[#62645f]">
                <Grid3X3 size={20} />
              </span>
              <span className="text-xs text-[#62645f]">See all</span>
            </button>
          </div>
          {allCategoriesOpen && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee9e1] pt-4">
              {ALL_CATEGORIES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(name);
                    setAllCategoriesOpen(false);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCategory === name ? "border-[#e85b43] bg-[#e85b43] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a]"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </section>
          </section>

          <aside className="space-y-4 lg:pt-1">
            <div className="border-t-2 border-[#e7b65c] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Your activity</p><h2 className="mt-1 text-xl font-semibold text-[#183b3a]">Stay in the loop</h2></div><Bell size={18} className="text-[#e85b43]" /></div>
              <div className="mt-5 grid grid-cols-2 gap-2"><Link href="/requests" className="rounded-xl bg-[#f6f2eb] p-3 hover:bg-[#fff0eb]"><p className="text-2xl font-semibold text-[#183b3a]">{requestCards.length}</p><p className="text-xs text-[#62645f]">New requests</p></Link><Link href="/plans" className="rounded-xl bg-[#f6f2eb] p-3 hover:bg-[#fff0eb]"><p className="text-2xl font-semibold text-[#183b3a]">{plans.length}</p><p className="text-xs text-[#62645f]">Your plans</p></Link></div>
              <div className="mt-5 space-y-3 border-t border-[#eee9e1] pt-4">
                {notifications.length ? notifications.slice(0, 3).map((item) => <Link key={item.id} href="/notifications" className="block border-b border-[#eee9e1] pb-3 last:border-0 last:pb-0"><p className="line-clamp-1 text-sm font-semibold text-[#183b3a]">{item.title || "New update"}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#62645f]">{item.message || item.body || "Open notifications to see the latest activity."}</p></Link>) : <p className="text-sm leading-6 text-[#62645f]">No new updates. Request and trip activity will appear here.</p>}
              </div>
              <Link href="/notifications" className="mt-4 flex items-center justify-between text-sm font-semibold text-[#e85b43]">Open notification center <ChevronRight size={15} /></Link>
            </div>
            <Link href="/plans/new" className="flex items-center justify-between border border-[#183b3a] bg-[#183b3a] p-5 text-white transition hover:bg-[#285c59]"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e7b65c]">Have a journey planned?</p><p className="mt-1 text-lg font-semibold">Post your trip</p></div><ChevronRight size={18} className="text-[#e7b65c]" /></Link>
          </aside>
        </div>

        <section className="pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#183b3a]">When are you sending or collecting?</h2>
            <span className="text-sm font-semibold text-[#e85b43]">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map((date) => {
              const active = selectedDate === date.key && !customDate;
              return (
                <button
                  key={date.key}
                  type="button"
                  onClick={() => {
                    setCustomDate(false);
                    setSelectedDate(date.key);
                  }}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 ${active ? "border-[#e85b43] bg-[#e85b43] text-white" : "border-[#ded8ce] bg-white text-[#183b3a]"}`}
                >
                  <span className="text-[11px] font-semibold uppercase">{date.dow}</span>
                  <span className="text-lg font-semibold leading-tight">{date.day}</span>
                  <span className="text-[11px]">{date.mon}</span>
                </button>
              );
            })}
          </div>
          {customDate ? (
            <input
              type="date"
              value={selectedDate}
              min={dateOptions[0].key}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-3 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#e85b43]"
            />
          ) : (
            <button type="button" onClick={() => setCustomDate(true)} className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#285c59]">
              <Calendar size={14} />
              Choose another date
            </button>
          )}
          <button type="button" onClick={findTravellers} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e85b43] py-3.5 text-sm font-semibold text-white hover:bg-[#cf4935]">
            <Search size={16} />
            Find travelers on this route
          </button>
        </section>

        {plans.length > 0 && <section className="border-t border-[#ded8ce] py-8"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e85b43]">Your journeys</p><h2 className="mt-1 text-2xl font-semibold text-[#183b3a]">Upcoming trip plans</h2></div><Link href="/plans" className="text-sm font-semibold text-[#e85b43]">See all plans →</Link></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.slice(0, 3).map((plan) => <Link key={plan.id} href={`/plans/${plan.id}`} className="group border-l-2 border-[#e7b65c] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><p className="min-w-0 flex-1 text-lg font-semibold text-[#183b3a]">{plan.from?.address || "Origin"} <span className="text-[#e85b43]">→</span> {plan.to?.address || "Destination"}</p><ChevronRight size={16} className="mt-1 shrink-0 text-[#e85b43] transition group-hover:translate-x-1" /></div><p className="mt-3 text-sm text-[#62645f]">{formatDateTime(plan.departureDate)} · {plan.travelMode?.replace("by_", "") || "travel"}</p><div className="mt-4 flex items-center justify-between border-t border-[#eee9e1] pt-3 text-xs"><span className="text-[#62645f]">{plan.maxWeightKg ? `Up to ${plan.maxWeightKg} kg` : "Capacity open"}</span><span className="font-semibold text-[#285c59]">{plan.acceptingNewRequests === false ? "Closed" : "Accepting requests"}</span></div></Link>)}</div></section>}

        {requestCards.length > 0 && (
          <section className="pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#183b3a]">New requests</h2>
              <span className="text-xs font-semibold text-[#e85b43]">{requestCards.length} waiting</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {requestCards.map((request) => (
                <div key={request.id} className="relative rounded-2xl border border-[#e7b65c]/60 bg-[#fff9ee] p-4">
                  <button
                    type="button"
                    aria-label="Remove from this list"
                    disabled={dismissingId === request.id}
                    onClick={() => dismissRequestCard(request)}
                    className="absolute right-3 top-3 text-[#a7a297] hover:text-[#183b3a]"
                  >
                    <X size={14} />
                  </button>
                  <button type="button" onClick={() => openRequestDetails(request)} className="block w-full text-left">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7a5310]">
                      <Package size={12} />
                      New parcel request
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-[#183b3a]">{request.parcelDescription || request.parcelCategory || "Parcel request"}</p>
                    <p className="mt-1 text-xs text-[#62645f]">From {request.senderName || "Sender"}</p>
                    <p className="mt-2 truncate text-xs text-[#62645f]">
                      {request.from?.address || "Origin"} → {request.to?.address || "Destination"}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-[#f0e6c9] pt-2">
                      <span className="text-xs text-[#62645f]">Offered amount</span>
                      <span className="text-sm font-semibold text-[#183b3a]">{request.agreedPrice || request.baseAmount ? `₹${request.agreedPrice || request.baseAmount}` : "Review offer"}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#e85b43]">Review request →</p>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {recentSearches.length > 0 && (
          <section className="pt-8">
            <h2 className="text-base font-semibold text-[#183b3a]">Recent routes</h2>
            <p className="text-sm text-[#a7a297]">Pick up where you left off</p>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {recentSearches.map((search, index) => (
                <button
                  key={`${search.from.address}-${search.to.address}-${index}`}
                  type="button"
                  onClick={() => selectRecentSearch(search)}
                  className="w-96 shrink-0 rounded-xl border border-[#ded8ce] bg-white p-4 text-left hover:border-[#e85b43]"
                >
                  <p className="flex items-start gap-1.5 break-words text-sm font-semibold leading-5 text-[#183b3a]">
                    <MapPin size={12} className="shrink-0 text-[#285c59]" />
                    {search.from.address || "Starting point"}
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 break-words text-sm font-semibold leading-5 text-[#183b3a]">
                    <MapPin size={12} className="shrink-0 text-[#e85b43]" />
                    {search.to.address || "Destination"}
                  </p>
                  <p className="mt-2 text-xs text-[#a7a297]">{formatSearchDate(search.pickupDate)}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="pt-8">
          <h2 className="text-base font-semibold text-[#183b3a]">Trending deliveries</h2>
          <p className="text-sm text-[#a7a297]">See what&apos;s moving through the platform right now</p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {POPULAR_ITEMS.map((item, index) => {
              const tint = TINTS[(index + 3) % TINTS.length];
              return (
                <div key={item.name} className="w-40 shrink-0 rounded-xl border border-[#ded8ce] bg-white p-4">
                  <span className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: tint.bg, color: tint.fg }}>
                    <item.icon size={17} />
                  </span>
                  <p className="mt-2 text-sm font-semibold leading-snug text-[#183b3a]">{item.name}</p>
                  <p className="mt-1 text-xs text-[#a7a297]">{item.stat}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-base font-semibold text-[#183b3a]">Travelers departing from {currentArea === "Locating..." ? "your area" : currentArea}</h2>
            {nearbyTravelers.length > 5 && (
              <button type="button" onClick={() => setNearbyExpanded((value) => !value)} className="shrink-0 text-xs font-semibold text-[#e85b43]">
                {nearbyExpanded ? "Show less" : "See all"}
              </button>
            )}
          </div>
          <p className="text-sm text-[#a7a297]">Active trips starting near your current location</p>
          {nearbyLoading && <p className="mt-4 text-sm text-[#a7a297]">Looking for active travelers near you...</p>}
          {!nearbyLoading && nearbyError && (
            <NearbyStatusCard
              title="Nearby departures are temporarily unavailable"
              message="We could not load active travelers from this area. Please check again shortly."
              error
            />
          )}
          {!nearbyLoading && !nearbyError && nearbyTravelers.length === 0 && (
            <NearbyStatusCard
              title="No departures nearby yet"
              message="Active travelers starting near this area will appear here with their destinations, dates, and available capacity."
            />
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {nearbyTravelers.slice(0, nearbyExpanded ? undefined : 5).map((plan) => (
              <TravelerCard key={plan.id} plan={plan} direction="departure" currentArea={currentArea} className="w-full" onSelect={() => openTravelerRequest(plan as NearbyTravelerPlan & HomeTraveller)} />
            ))}
          </div>
        </section>

        <section className="pt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-base font-semibold text-[#183b3a]">Travelers arriving near {currentArea === "Locating..." ? "your area" : currentArea}</h2>
            <button type="button" onClick={() => setArrivingExpanded((value) => !value)} className="shrink-0 text-xs font-semibold text-[#e85b43]">
              {arrivingExpanded ? "Show less" : "See all"}
            </button>
          </div>
          <p className="text-sm text-[#a7a297]">Active trips ending near your current location</p>
          {!arrivingTravelers.length && (
            <NearbyStatusCard
              title="No arrivals nearby yet"
              message="We will show travelers arriving near this area as soon as an active trip is available."
            />
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {arrivingTravelers.slice(0, arrivingExpanded ? undefined : 5).map((plan) => (
              <TravelerCard key={plan.id} plan={plan} direction="arrival" currentArea={currentArea} className="w-full" onSelect={() => openTravelerRequest(plan as NearbyTravelerPlan & HomeTraveller)} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />

      <ConfirmModal
        open={Boolean(routeAlert)}
        title={routeAlert?.title || ""}
        message={routeAlert?.message}
        confirmLabel="Got it"
        singleAction
        onCancel={() => setRouteAlert(null)}
        onConfirm={() => setRouteAlert(null)}
      />
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
