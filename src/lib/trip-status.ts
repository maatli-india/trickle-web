import type { ParcelMatch, TravelPlan } from "@/types/travel";

// TripDetails/EditTrip/CancelTrip on mobile use arrivalDate as the "is this
// trip still actionable" cutoff (Activity's list uses departureDate instead,
// which mobile itself notes is inconsistent) — arrivalDate is the safer rule
// since a trip already in transit shouldn't be editable, so it's the single
// canonical rule used everywhere on web.
export const isTripPast = (plan: Pick<TravelPlan, "arrivalDate" | "departureDate">): boolean => {
  const value = plan.arrivalDate || plan.departureDate;
  if (!value) return false;
  const date = new Date(String(value).replace(" ", "T"));
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const COLLECTED_STATUSES = new Set([
  "picked_up",
  "interrupted_in_transit",
  "awaiting_recipient",
  "return_pending",
  "in_transit",
  "delivered",
]);

export const isCollectedRequest = (request: ParcelMatch): boolean => {
  const handoff = request as unknown as { pickupHandoff?: { verifiedAt?: string }; pickedUpAt?: string };
  return Boolean(handoff.pickupHandoff?.verifiedAt || handoff.pickedUpAt) || COLLECTED_STATUSES.has(String(request.status || "").toLowerCase());
};

export const hasPickedUpRequest = (requests: ParcelMatch[]): boolean =>
  requests.some((request) => {
    const status = String(request.status || "").toLowerCase();
    const handoff = request as unknown as { pickupHandoff?: { verifiedAt?: string } };
    return ["picked_up", "in_transit", "delivered", "completed"].includes(status) || Boolean(handoff.pickupHandoff?.verifiedAt);
  });

export const canEditTrip = (plan: TravelPlan, requests: ParcelMatch[]): boolean => {
  const status = String(plan.status || "").toLowerCase();
  return !isTripPast(plan) && !["completed", "cancelled"].includes(status);
};

export const canCancelOrDeleteTrip = (plan: TravelPlan): boolean => {
  const status = String(plan.status || "").toLowerCase();
  return !isTripPast(plan) && !["completed", "cancelled"].includes(status);
};

// One free pickup/delivery-mode ("major") change per trip — the backend
// surfaces this via one of several possible flag names; check all of them.
export const majorChangeAllowanceUsed = (plan: TravelPlan): boolean =>
  Boolean(
    (plan.majorChangeCount ?? 0) >= 1 ||
      plan.majorChangeUsed ||
      plan.freeMajorChangeUsed ||
      plan.major_change_used ||
      plan.free_major_change_used ||
      plan.majorChange?.used ||
      plan.freeMajorChange?.used ||
      plan.allowanceUsed,
  );

export const majorEditBlocked = (plan: TravelPlan, requests: ParcelMatch[]): boolean =>
  hasPickedUpRequest(requests) || majorChangeAllowanceUsed(plan);
