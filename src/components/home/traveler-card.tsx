"use client";

import { ArrowDownLeft, ArrowUpRight, Package, Plane, ShieldCheck, Star } from "lucide-react";
import { avatarTint, initials } from "@/lib/home-constants";

export type NearbyTravelerPlan = {
  id: string;
  from?: { address?: string };
  to?: { address?: string };
  departureDate?: string;
  arrivalDate?: string;
  pricePerPackage?: number;
  travelerReliabilityBadge?: { score?: number };
  profile?: { name?: string; rating?: number };
};

const place = (location: { address?: string } | undefined, fallback: string) => location?.address || fallback;

export function TravelerCard({
  plan,
  direction,
  currentArea,
  onSelect,
  className,
}: {
  plan: NearbyTravelerPlan;
  direction: "departure" | "arrival";
  currentArea: string;
  onSelect: () => void;
  className?: string;
}) {
  const name = plan.profile?.name || "Traveller";
  const tint = avatarTint(name);
  const travelDate = direction === "arrival" ? plan.arrivalDate : plan.departureDate;
  const dateObj = travelDate ? new Date(travelDate) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${className || "w-64 shrink-0"} snap-start rounded-2xl border border-[#ded8ce] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#e85b43] hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: tint.bg, color: tint.fg }}>
            {initials(name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-semibold text-[#183b3a]">{name}</p>
              <ShieldCheck size={12} className="shrink-0 text-[#0f6e56]" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#a7a297]">
              <Star size={11} className="fill-[#e7b65c] text-[#e7b65c]" />
              <span>{plan.profile?.rating || plan.travelerReliabilityBadge?.score || "New"}</span>
            </div>
          </div>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#183b3a]">{plan.pricePerPackage ? `₹${plan.pricePerPackage}` : "Open"}</p>
      </div>

      <span
        className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
          direction === "arrival" ? "bg-[#fff4d8] text-[#7a5310]" : "bg-[#e5f0eb] text-[#285c59]"
        }`}
      >
        {direction === "arrival" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
        {direction === "arrival" ? "Arriving" : "Departing"}
      </span>

      <div className="mt-3 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#183b3a]">{place(plan.from, "Origin")}</p>
        <span className="flex items-center gap-1 text-[#e85b43]">
          <span className="h-px w-3 bg-[#e5e0d5]" />
          <Plane size={12} />
          <span className="h-px w-3 bg-[#e5e0d5]" />
        </span>
        <p className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-[#183b3a]">{place(plan.to, currentArea)}</p>
      </div>

      {dateObj && !Number.isNaN(dateObj.getTime()) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#62645f]">
          <span>{dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className="size-1 rounded-full bg-[#d7d2c9]" />
          <span>{dateObj.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
        </p>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[#a7a297]">
        <Package size={11} />
        from ₹{plan.pricePerPackage || "open"}
      </p>
    </button>
  );
}
