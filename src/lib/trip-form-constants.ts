// Ported 1:1 from mobile's src/screens/CreateTrip/index.js so the same UI
// choices map to the same backend enum values on both platforms.
import type { TravelMode, TravelPlan } from "@/types/travel";
import type { LocationForm } from "@/components/forms/location-fields";

export const MODES: { key: string; apiKey: TravelMode; label: string }[] = [
  { key: "flight", apiKey: "by_flight", label: "Flight" },
  { key: "train", apiKey: "by_train", label: "Train" },
  { key: "bus", apiKey: "by_road", label: "Bus" },
  { key: "car", apiKey: "by_road", label: "Car" },
  { key: "bike", apiKey: "by_road", label: "Bike" },
];

export const PICKUP: { key: string; label: string; sub: string }[] = [
  { key: "home", label: "Home pickup", sub: "Collect from sender's address" },
  { key: "point", label: "Meet at a common point", sub: "Station, mall or landmark" },
  { key: "drop", label: "Sender drops it to me", sub: "You just receive it" },
];

export const DELIVERY: { key: string; label: string; sub: string }[] = [
  { key: "home", label: "Home delivery", sub: "Deliver to receiver's address" },
  { key: "point", label: "Meet at a common point", sub: "Station, mall or landmark" },
  { key: "pickup", label: "Receiver picks up from me", sub: "They collect it from you" },
];

export const ACCEPTED: { key: string; label: string }[] = [
  { key: "gifts", label: "Gifts" },
  { key: "medicines", label: "Medicines" },
  { key: "food", label: "Food items" },
  { key: "documents", label: "Documents" },
  { key: "footwear", label: "Footwear" },
  { key: "clothes", label: "Clothes" },
  { key: "electronics", label: "Electronics" },
  { key: "books", label: "Books" },
];

export const RESTRICTED: { key: string; label: string }[] = [
  { key: "liquids", label: "Liquids" },
  { key: "jewellery", label: "Jewellery & valuables" },
  { key: "cash", label: "Cash & currency" },
  { key: "fragile", label: "Fragile items" },
  { key: "perishable", label: "Perishables" },
  { key: "sharp", label: "Sharp objects" },
  { key: "animals", label: "Live animals" },
  { key: "illegal", label: "Illegal / restricted goods" },
];

export const ACCEPTED_API_TYPES: Record<string, string> = {
  gifts: "small_packages",
  medicines: "medicines",
  food: "small_packages",
  documents: "documents",
  footwear: "clothes",
  clothes: "clothes",
  electronics: "electronics",
  books: "documents",
};

export const PICKUP_API_TYPES: Record<string, string> = { home: "door_pickup", point: "public_place", drop: "flexible" };
export const DELIVERY_API_TYPES: Record<string, string> = { home: "door_delivery", point: "public_place", pickup: "flexible" };

// Reverse maps (API value -> UI key) for EditTrip pre-fill.
export const PICKUP_KEY_FROM_API: Record<string, string> = { door_pickup: "home", public_place: "point", flexible: "drop" };
export const DELIVERY_KEY_FROM_API: Record<string, string> = { public_place: "point", flexible: "pickup", door_delivery: "home" };

export const apiDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;

// Maps a plan's already-API-shaped pickupHandovers/deliveryHandovers (or the
// older single pickupHandover/deliveryHandover) back to the UI keys — shared
// by the edit page's pre-fill and tripFormPrefillFromPlan below.
export const keysFromApiValues = (values: string[] | undefined, single: string | undefined, map: Record<string, string>): Set<string> => {
  const source = values?.length ? values : single ? [single] : [];
  return new Set(source.map((value) => map[value]).filter(Boolean) as string[]);
};

// acceptedParcelCategories carries the UI's own keys verbatim (lossless —
// acceptedParcelTypes alone can't tell "gifts" apart from "food", both map
// to small_packages), same precedence the create page's own submit payload
// implies: categories first, falling back to reverse-mapping the API enum.
const acceptedKeysFromPlan = (plan: TravelPlan): Set<string> => {
  const validKeys = new Set(ACCEPTED.map((item) => item.key));
  const categories = (plan.acceptedParcelCategories || []).filter((key) => validKeys.has(key));
  if (categories.length) return new Set(categories);
  const apiTypes = new Set(plan.acceptedParcelTypes || []);
  const fromTypes = Object.entries(ACCEPTED_API_TYPES)
    .filter(([, apiValue]) => apiTypes.has(apiValue))
    .map(([key]) => key);
  return new Set(fromTypes.length ? fromTypes : ["documents"]);
};

export type TripFormPrefill = {
  from: LocationForm;
  to: LocationForm;
  mode: string;
  pickup: Set<string>;
  delivery: Set<string>;
  accepted: Set<string>;
  restricted: Set<string>;
  maxWeight: string;
  maxParcelCount: string;
  price: string;
};

// Maps an existing TravelPlan (as returned by GET /v1/travel-plans/{id}) into
// the create page's form-state shape, for the "Repeat this trip" action —
// everything except departure/arrival is carried over; those are left for
// the create page's own "" defaults so the traveler always picks a fresh
// date/time.
export const tripFormPrefillFromPlan = (plan: TravelPlan): TripFormPrefill => ({
  from: { address: plan.from?.address || "", lat: plan.from?.lat != null ? String(plan.from.lat) : "", lng: plan.from?.lng != null ? String(plan.from.lng) : "" },
  to: { address: plan.to?.address || "", lat: plan.to?.lat != null ? String(plan.to.lat) : "", lng: plan.to?.lng != null ? String(plan.to.lng) : "" },
  mode: MODES.find((item) => item.apiKey === plan.travelMode)?.key || "flight",
  pickup: keysFromApiValues(plan.pickupHandovers, plan.pickupHandover, PICKUP_KEY_FROM_API),
  delivery: keysFromApiValues(plan.deliveryHandovers, plan.deliveryHandover, DELIVERY_KEY_FROM_API),
  accepted: acceptedKeysFromPlan(plan),
  restricted: new Set(plan.restrictedParcelTypes || []),
  maxWeight: String(plan.maxWeightKg || 5),
  maxParcelCount: String(plan.maxParcelCount || 1),
  price: plan.pricePerPackage ? String(plan.pricePerPackage) : "",
});
