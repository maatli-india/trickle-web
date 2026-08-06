"use client";

import { useEffect, useState } from "react";
import { AccountPage, EmptyState } from "@/components/account/account-page";
import { apiRequest } from "@/services/api-client";

type TravelPlan = {
  id?: string;
  from?: { address?: string; lat?: number; lng?: number };
  to?: { address?: string; lat?: number; lng?: number };
  departureDate?: string;
  arrivalDate?: string;
  travelMode?: string;
  status?: string;
  additionalInfo?: string;
  maxWeightKg?: number;
  maxParcelCount?: number;
};

type TravelResponse = { items?: TravelPlan[]; data?: TravelPlan[]; total?: number };

export default function TravelHistoryPage() {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<TravelResponse | TravelPlan[]>("/v1/travel-plans")
      .then((response) => setPlans(Array.isArray(response) ? response : response.items || response.data || []))
      .catch(() => setError("We could not load your travel history right now."));
  }, []);

  return (
    <AccountPage title="Travel history" description="Review the journeys you have shared with the Trickle community.">
      {error ? <p role="alert" className="rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p> : plans.length === 0 ? <EmptyState title="No trips posted yet" description="Your posted trips will appear here after you share a journey." /> : <div className="space-y-4">{plans.map((plan, index) => <article key={plan.id || index} className="border-l-2 border-[#e7b65c] bg-[#fbfaf7] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">From</p><p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{plan.from?.address || "Starting point"}</p></div><span className="hidden text-[#e85b43] sm:block">→</span><div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e85b43]">To</p><p className="mt-1 break-words text-sm font-semibold leading-5 text-[#183b3a]">{plan.to?.address || "Destination"}</p></div></div><span className="rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-semibold capitalize text-[#285c59]">{plan.status || "active"}</span></div><dl className="mt-4 grid gap-3 text-sm text-[#62645f] sm:grid-cols-2"><div><dt className="font-semibold text-[#183b3a]">Departure</dt><dd>{plan.departureDate ? new Date(plan.departureDate).toLocaleString() : "Not provided"}</dd></div><div><dt className="font-semibold text-[#183b3a]">Arrival</dt><dd>{plan.arrivalDate ? new Date(plan.arrivalDate).toLocaleString() : "Not provided"}</dd></div><div><dt className="font-semibold text-[#183b3a]">Travel mode</dt><dd>{plan.travelMode?.replace("by_", "") || "Not provided"}</dd></div><div><dt className="font-semibold text-[#183b3a]">Capacity</dt><dd>{plan.maxWeightKg ? `${plan.maxWeightKg} kg` : "Weight not set"}{plan.maxParcelCount ? ` · ${plan.maxParcelCount} parcels` : ""}</dd></div></dl>{plan.additionalInfo && <p className="mt-4 border-t border-[#ded8ce] pt-3 text-sm leading-6 text-[#62645f]">{plan.additionalInfo}</p>}</article>)}</div>}
    </AccountPage>
  );
}
