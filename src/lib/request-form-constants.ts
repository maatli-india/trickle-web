// Ported from mobile's src/screens/RequestParcel/index.js — maps a trip's
// declared handover values (API vocabulary) to the sender-facing options a
// request can choose from, plus the short key actually sent as pickupOption/
// deliveryOption on the parcel match (a different vocabulary than the trip's
// own pickupHandover/deliveryHandover fields).

export const CATEGORIES: { key: string; label: string }[] = [
  { key: "documents", label: "Documents" },
  { key: "gifts", label: "Gifts" },
  { key: "electronics", label: "Electronics" },
];

export const MAX_PHOTOS = 5;

type HandoverOption = { key: string; label: string; sub: string };

export const PICKUP_HANDOVER_OPTIONS: Record<string, HandoverOption> = {
  door_pickup: { key: "home", label: "Traveller picks up from you", sub: "Traveller collects the parcel from your address" },
  public_place: { key: "point", label: "Meet the traveller at a common point", sub: "You hand over the parcel at an agreed station or landmark" },
  station_airport: { key: "point", label: "Meet the traveller at a common point", sub: "You hand over the parcel at an agreed station, airport, or landmark" },
  flexible: { key: "drop", label: "You drop it to the traveller", sub: "You take the parcel to an agreed handover place" },
};

export const DELIVERY_HANDOVER_OPTIONS: Record<string, HandoverOption> = {
  public_place: { key: "point", label: "Receiver meets the traveller at a common point", sub: "Receiver collects the parcel at an agreed station or landmark" },
  station_airport: { key: "point", label: "Receiver meets the traveller at a common point", sub: "Receiver collects the parcel at an agreed station, airport, or landmark" },
  flexible: { key: "pickup", label: "Receiver picks up from the traveller", sub: "Receiver collects the parcel from the traveller at an agreed place" },
  door_delivery: { key: "home", label: "Traveller delivers to the receiver", sub: "Traveller takes the parcel to the receiver address" },
};

const getHandoverValues = (
  trip: { pickupHandovers?: string[]; pickupHandover?: string; deliveryHandovers?: string[]; deliveryHandover?: string },
  pluralKey: "pickupHandovers" | "deliveryHandovers",
  singularKey: "pickupHandover" | "deliveryHandover",
): string[] => {
  const values = trip[pluralKey] || trip[singularKey];
  return Array.isArray(values) ? values : values ? [values] : [];
};

export const getHandoverOptions = (
  trip: { pickupHandovers?: string[]; pickupHandover?: string; deliveryHandovers?: string[]; deliveryHandover?: string },
  pluralKey: "pickupHandovers" | "deliveryHandovers",
  singularKey: "pickupHandover" | "deliveryHandover",
  definitions: Record<string, HandoverOption>,
): HandoverOption[] => {
  const options = [...new Set(getHandoverValues(trip, pluralKey, singularKey))].map((value) => definitions[value]).filter(Boolean) as HandoverOption[];
  return options.filter((option, index) => options.findIndex((item) => item.key === option.key) === index);
};

export const BLOCKING_REQUEST_STATUSES = new Set([
  "pending",
  "negotiating",
  "countered",
  "accepted",
  "accepted_awaiting_payment",
  "awaiting_payment",
  "payment_initiated",
  "confirmed",
  "picked_up",
  "in_transit",
  "awaiting_recipient",
  "interrupted_in_transit",
  "return_pending",
  "delivered",
  "completed",
]);
