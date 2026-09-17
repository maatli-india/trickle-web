import { apiRequest } from "@/services/api-client";

export type SavedPlace = { id: string; label: string; iconKey?: string; address?: string; lat?: number; lng?: number; place?: { address?: string; lat?: number; lng?: number } };
type SavedPlacesResponse = { items?: SavedPlace[]; data?: SavedPlace[] };

export const listSavedPlaces = async () => {
  const response = await apiRequest<SavedPlacesResponse | SavedPlace[]>("/v1/saved-places");
  return Array.isArray(response) ? response : response.items || response.data || [];
};

export const createSavedPlace = (place: { label: string; iconKey?: string; place: { address: string; lat: number; lng: number } }) =>
  apiRequest<SavedPlace>("/v1/saved-places", { method: "POST", body: JSON.stringify(place) });

export const deleteSavedPlace = (id: string) => apiRequest(`/v1/saved-places/${encodeURIComponent(id)}`, { method: "DELETE" });
