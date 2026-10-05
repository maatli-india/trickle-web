import { apiRequest } from "@/services/api-client";
import type { Location, TravelMode, TravelPlan } from "@/types/travel";

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!pairs.length) return "";
  return "?" + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
};

export type TravelPlanPayload = {
  from: Location;
  to: Location;
  departureDate: string;
  arrivalDate: string;
  travelMode: TravelMode;
  timezone?: string;
  additionalInfo?: string;
  maxWeightKg?: number;
  pricePerPackage: number;
  maxParcelCount?: number;
  acceptingNewRequests?: boolean;
  acceptedParcelTypes?: string[];
  acceptedParcelCategories?: string[];
  restrictedParcelTypes?: string[];
  pickupHandover?: string;
  deliveryHandover?: string;
  pickupHandovers?: string[];
  deliveryHandovers?: string[];
  notifySenders?: boolean;
};

export const createTravelPlan = (plan: TravelPlanPayload) =>
  apiRequest<TravelPlan>("/v1/travel-plans", {
    method: "POST",
    body: JSON.stringify({ acceptingNewRequests: true, ...plan }),
  });

export const updateTravelPlan = (planId: string, plan: TravelPlanPayload) =>
  apiRequest<TravelPlan>(`/v1/travel-plans/${encodeURIComponent(planId)}`, {
    method: "PUT",
    body: JSON.stringify(plan),
  });

export const listMyTravelPlans = (params: { status?: string; page?: number; limit?: number } = {}) =>
  apiRequest<{ items?: TravelPlan[]; data?: TravelPlan[] }>(`/v1/travel-plans${buildQuery(params)}`);

export const getTravelPlanById = (planId: string) =>
  apiRequest<TravelPlan | { data?: TravelPlan }>(`/v1/travel-plans/${encodeURIComponent(planId)}`);

export const recordTravelPlanView = (planId: string) =>
  apiRequest<TravelPlan | { data?: TravelPlan }>(`/v1/travel-plans/${encodeURIComponent(planId)}/view`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const registerTravelPlanInterest = (planId: string) =>
  apiRequest(`/v1/travel-plans/${encodeURIComponent(planId)}/interest`, { method: "POST", body: JSON.stringify({}) });

export const getTravelPlanInterest = (planId: string) =>
  apiRequest(`/v1/travel-plans/${encodeURIComponent(planId)}/interest`);

// Hard delete — only valid when the trip has zero requests.
export const cancelTravelPlan = (planId: string) =>
  apiRequest<null>(`/v1/travel-plans/${encodeURIComponent(planId)}`, { method: "DELETE" });

// Policy-aware cancel with refund — used once the trip has requests.
export const cancelTravelPlanWithPolicy = (planId: string, reason = "") =>
  apiRequest(`/v1/travel-plans/${encodeURIComponent(planId)}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });

export const listParcelMatchesForPlan = (planId: string, params: { page?: number; limit?: number } = {}) =>
  apiRequest(`/v1/travel-plans/${encodeURIComponent(planId)}/parcel-matches${buildQuery(params)}`);

export const searchTravelPlans = (params: {
  lat: number;
  lng: number;
  destinationLat?: number;
  destinationLng?: number;
  radiusKm?: number;
  targetDate?: string;
  upcoming?: boolean;
  travelMode?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => apiRequest(`/v1/travel-plans/search${buildQuery(params)}`);

export type TravelPlanPricingPreview = {
  pricePerPackage: number;
  senderDisplayAmount: number;
  travelerPayoutAmount: number;
};

// previewTripPricing lets a traveler see what a sender would be shown and
// what they'd actually take home for a candidate price, before saving the
// trip — mirrors the server's real payout math (see transitorder's
// computeAmountViews) rather than duplicating tier logic client-side.
export const previewTripPricing = (pricePerPackage: number) =>
  apiRequest<TravelPlanPricingPreview>(`/v1/travel-plans/price-preview${buildQuery({ pricePerPackage })}`);

export type TravelPlanSearchPage = { items?: TravelPlan[]; total?: number; page?: number; limit?: number };

export const searchTravelPlansStartingOnDate = (params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  targetDate?: string;
  travelMode?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => apiRequest<TravelPlanSearchPage>(`/v1/travel-plans/search-by-start-date${buildQuery(params)}`);

// "Travelling later on same route" bonus search — both route legs are
// required and always geo-filtered server-side (unlike
// searchTravelPlansStartingOnDate, which only filters by whichever single
// point you pass it). Returns every match from targetDate+1 through
// targetDate+5 (server-enforced) — deliberately NOT the exact-date search;
// call searchTravelPlansStartingOnDate separately for that, so the core
// search never depends on this bonus endpoint being deployed. Treat a
// failure here as non-fatal: just show nothing extra.
export const searchTravelPlansFlexible = (params: {
  lat: number;
  lng: number;
  destinationLat: number;
  destinationLng: number;
  radiusKm?: number;
  targetDate: string;
  travelMode?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => apiRequest<TravelPlanSearchPage>(`/v1/travel-plans/search-flexible${buildQuery(params)}`);
