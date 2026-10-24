import { apiRequest } from "@/services/api-client";

export type SavedPlace = {
  id: string;
  label: string;
  iconKey?: string;
  address?: string;
  lat?: number;
  lng?: number;
  buildingNumber?: string;
  street?: string;
  landmark?: string;
  place?: { address?: string; lat?: number; lng?: number };
};
type SavedPlacesResponse = { items?: SavedPlace[]; data?: SavedPlace[] };

export type SavedPlacePayload = {
  label: string;
  iconKey?: string;
  buildingNumber?: string;
  street?: string;
  landmark?: string;
  place: { address: string; lat: number; lng: number };
};

export const listSavedPlaces = async () => {
  const response = await apiRequest<SavedPlacesResponse | SavedPlace[]>("/v1/saved-places");
  return Array.isArray(response) ? response : response.items || response.data || [];
};

export const createSavedPlace = (place: SavedPlacePayload) =>
  apiRequest<SavedPlace>("/v1/saved-places", { method: "POST", body: JSON.stringify(place) });

export const updateSavedPlace = (id: string, place: SavedPlacePayload) =>
  apiRequest<SavedPlace>(`/v1/saved-places/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(place) });

export const deleteSavedPlace = (id: string) => apiRequest(`/v1/saved-places/${encodeURIComponent(id)}`, { method: "DELETE" });

// Shared by the saved-places list/edit page and SavedAddressPicker — combines
// the granular building/street fields with the base address and landmark
// into one human-readable line.
export const formatSavedPlaceAddress = (place: SavedPlace): string => {
  const baseAddress = place.place?.address || place.address || "";
  const detail = [place.buildingNumber, place.street].filter(Boolean).join(", ");
  const withBase = [detail, baseAddress].filter(Boolean).join(", ");
  return place.landmark ? [withBase, `near ${place.landmark}`].filter(Boolean).join(", ") : withBase;
};
