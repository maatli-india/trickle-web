// Ported 1:1 from mobile's src/screens/CreateTrip/index.js so the same UI
// choices map to the same backend enum values on both platforms.
import type { TravelMode } from "@/types/travel";

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
