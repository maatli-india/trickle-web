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
  pricePerPackage?: number;
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

export const searchTravelPlansStartingOnDate = (params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  targetDate?: string;
  travelMode?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => apiRequest(`/v1/travel-plans/search-by-start-date${buildQuery(params)}`);
