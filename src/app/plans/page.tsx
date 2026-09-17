"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { listMyTravelPlans, listParcelMatchesForPlan } from "@/services/travel-plans";
import { extractListItems, type ParcelMatch, type TravelPlan } from "@/types/travel";
import { isTripPast } from "@/lib/trip-status";
import { RESPONDABLE_STATUSES } from "@/lib/parcel-status";

type UiStatus = "upcoming" | "past" | "completed" | "cancelled";
type PlanRow = { plan: TravelPlan; status: UiStatus; requests: ParcelMatch[] };

const FILTERS: { key: UiStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const deriveStatus = (plan: TravelPlan): UiStatus => {
  const status = String(plan.status || "").toLowerCase();
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return isTripPast(plan) ? "past" : "upcoming";
};

const formatDateTime = (value?: string) => {
  if (!value) return "Not provided";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const modeLabel = (mode?: string) => ({ by_flight: "Flight", by_train: "Train", by_road: "Road" }[mode || ""] || "Travel");

export default function PlansPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [filter, setFilter] = useState<UiStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listMyTravelPlans({ page: 1, limit: 100 })
      .then(async (response) => {
        const plans = extractListItems<TravelPlan>(response);
        const withRequests = await Promise.all(
          plans.map(async (plan) => {
            try {
              const matches = await listParcelMatchesForPlan(plan.id, { page: 1, limit: 100 });
              const requests = extractListItems<ParcelMatch>(matches as never);
              return { plan, status: deriveStatus(plan), requests: requests.length ? requests : plan.requesters || plan.requests || [] };
            } catch {
              return { plan, status: deriveStatus(plan), requests: plan.requesters || plan.requests || [] };
            }
          }),
        );
        if (active) setRows(withRequests);
      })
      .catch(() => active && setError("We could not load your plans right now."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: rows.length, upcoming: 0, past: 0, completed: 0, cancelled: 0 };
    rows.forEach((row) => {
      base[row.status] += 1;
    });
    return base;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const scoped = filter === "all" ? rows : rows.filter((row) => row.status === filter);
    const sorted = [...scoped].sort((a, b) => {
      const aTime = new Date(String(a.plan.departureDate || "").replace(" ", "T")).getTime();
      const bTime = new Date(String(b.plan.departureDate || "").replace(" ", "T")).getTime();
      if (filter === "all") {
        if (a.status === "upcoming" && b.status === "upcoming") return aTime - bTime;
        if (a.status === "upcoming") return -1;
        if (b.status === "upcoming") return 1;
        return bTime - aTime;
      }
      return filter === "past" ? bTime - aTime : aTime - bTime;
    });
    return sorted;
  }, [rows, filter]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl flex-1 px-5 pb-32 sm:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ded8ce] py-12 sm:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Your journeys</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Plans</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#62645f]">Manage the trips you have posted and the requests they receive.</p>
          </div>
          <Link href="/plans/new" className="rounded-full bg-[#e85b43] px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf4935]">
            New trip
          </Link>
        </section>

        <div className="flex flex-wrap gap-2 py-8">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                filter === item.key ? "border-[#183b3a] bg-[#183b3a] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a] hover:border-[#e85b43]"
              }`}
            >
              {item.label} ({counts[item.key] ?? 0})
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-[#62645f]">Loading your plans...</p>}
        {error && <p role="alert" className="rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
        {!loading && !error && filteredRows.length === 0 && (
          <div className="border-t-2 border-[#e7b65c] bg-[#fbfaf7] px-6 py-8 sm:px-8">
            <h2 className="text-xl font-semibold text-[#183b3a]">No trips here yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#62645f]">Post a trip and senders on your route will be able to find and request it.</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredRows.map(({ plan, status, requests }) => {
            const needsResponse = requests.filter((request) => RESPONDABLE_STATUSES.has(String(request.status || "").toLowerCase())).length;
            return (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="block border-l-2 border-[#e7b65c] bg-[#fbfaf7] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">From</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{plan.from?.address || "Starting point"}</p>
                    </div>
                    <span className="hidden text-[#e85b43] sm:block">→</span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">To</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{plan.to?.address || "Destination"}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-semibold capitalize text-[#285c59]">{status}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#ded8ce] pt-3 text-sm text-[#62645f]">
                  <span>
                    {modeLabel(plan.travelMode)} · {formatDateTime(plan.departureDate)}
                  </span>
                  <span>
                    {requests.length} request{requests.length === 1 ? "" : "s"}
                    {needsResponse > 0 && <span className="ml-2 rounded-full bg-[#fff0eb] px-2 py-0.5 text-xs font-semibold text-[#e85b43]">{needsResponse} need response</span>}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
