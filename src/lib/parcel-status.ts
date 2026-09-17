// Ported from the mobile app's src/constants/requestStatus.js so web and app
// present identical status language for the same backend statuses.

export type ViewerRole = "sender" | "traveller";

export const mapRequestStatus = (status?: string): string => {
  const table: Record<string, string> = {
    searching: "negotiating",
    pending: "pending",
    negotiating: "negotiating",
    countered: "countered",
    accepted: "accepted_awaiting_payment",
    accepted_awaiting_payment: "accepted_awaiting_payment",
    awaiting_payment: "awaiting_sender_payment",
    payment_initiated: "awaiting_sender_payment",
    confirmed: "confirmed",
    picked_up: "picked_up",
    interrupted_in_transit: "interrupted_in_transit",
    awaiting_recipient: "awaiting_recipient",
    return_pending: "return_pending",
    expired: "expired",
    returned: "returned",
    cancelled_by_sender: "cancelled_by_sender",
    cancelled_by_traveler: "cancelled_by_traveler",
    in_transit: "in_transit",
    delivered: "completed",
    completed: "completed",
    cancelled: "cancelled",
    rejected: "declined",
    declined: "declined",
  };
  return table[String(status || "").toLowerCase()] || "negotiating";
};

export const getRequestStatusLabel = (status?: string, role: ViewerRole = "traveller"): string => {
  const rawStatus = String(status || "").toLowerCase();
  if (rawStatus === "pending" || rawStatus === "negotiating" || rawStatus === "searching") {
    return role === "sender" ? "Waiting for traveller response" : "Needs your response";
  }
  if (rawStatus === "accepted" || rawStatus === "accepted_awaiting_payment") {
    return role === "sender" ? "Confirm and pay" : "Waiting for sender payment";
  }
  if (rawStatus === "awaiting_payment" || rawStatus === "payment_initiated") {
    return role === "sender" ? "Complete payment" : "Waiting for sender payment";
  }
  const labels: Record<string, string> = {
    countered: role === "sender" ? "Review counter-offer" : "Waiting for sender response",
    confirmed: "Confirmed",
    picked_up: "Picked up",
    interrupted_in_transit: "Support case open",
    awaiting_recipient: "Recipient unavailable",
    return_pending: "Return pending",
    expired: "Expired",
    returned: "Returned",
    cancelled_by_sender: "Cancelled by sender",
    cancelled_by_traveler: "Cancelled by traveller",
    in_transit: "In transit",
    delivered: "Completed",
    completed: "Completed",
    rejected: "Declined",
    declined: "Declined",
    cancelled: "Cancelled",
  };
  return labels[rawStatus] || "Negotiating";
};

// Simplified bucketing used by list screens (Requests, per-trip request preview).
export type RequestBucket = "pending" | "confirmed" | "in_transit" | "completed" | "cancelled" | "declined" | "expired";

export const bucketRequestStatus = (status?: string): RequestBucket => {
  const rawStatus = String(status || "").toLowerCase();
  const table: Record<string, RequestBucket> = {
    searching: "pending",
    negotiating: "pending",
    pending: "pending",
    countered: "pending",
    accepted: "confirmed",
    awaiting_payment: "confirmed",
    payment_initiated: "confirmed",
    accepted_awaiting_payment: "confirmed",
    confirmed: "confirmed",
    picked_up: "in_transit",
    in_transit: "in_transit",
    delivered: "completed",
    completed: "completed",
    returned: "completed",
    expired: "cancelled",
    cancelled_by_sender: "cancelled",
    cancelled_by_traveler: "cancelled",
    cancelled: "cancelled",
    rejected: "declined",
    declined: "declined",
  };
  return table[rawStatus] || "pending";
};

// Any match still in a pre-payment/negotiation status whose relevant date has
// passed is relabelled "expired" client-side — the backend never sets this.
export const EXPIRABLE_REQUEST_STATUSES = new Set([
  "pending",
  "searching",
  "negotiating",
  "countered",
  "accepted",
  "awaiting_payment",
  "accepted_awaiting_payment",
  "awaiting_sender_confirmation",
  "awaiting_sender_payment",
  "payment_initiated",
]);

export const isExpired = (status: string | undefined, relevantDateIso: string | undefined): boolean => {
  if (!relevantDateIso) return false;
  if (!EXPIRABLE_REQUEST_STATUSES.has(String(status || "").toLowerCase())) return false;
  const date = new Date(String(relevantDateIso).replace(" ", "T"));
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

export const effectiveStatus = (status: string | undefined, relevantDateIso: string | undefined): string =>
  isExpired(status, relevantDateIso) ? "expired" : String(status || "").toLowerCase();

// Statuses a viewer can still act on (accept/decline) or cancel.
export const RESPONDABLE_STATUSES = new Set(["pending", "negotiating", "countered"]);
export const CANCELLABLE_STATUSES = new Set([
  "pending",
  "countered",
  "negotiating",
  "accepted",
  "accepted_awaiting_payment",
  "confirmed",
]);

export const relevantMatchDate = (match: { targetDeliveryTime?: string; departureDate?: string; createdAt?: string }) =>
  match.targetDeliveryTime || match.departureDate || match.createdAt;

export const formatMoney = (value?: number) => (value || value === 0 ? `₹${value}` : "Offer pending");

// Ported from mobile Home's activeIncomingRequest() — a traveler-side request
// that's genuinely waiting on the traveler (not one where the traveler just
// sent a counter-offer that's awaiting the sender instead).
export const isActiveIncomingRequest = (request: {
  status?: string;
  travelerUserId?: string;
  offerHistory?: { status?: string; proposedByUserId?: string }[];
}): boolean =>
  ["pending", "searching", "negotiating", "countered"].includes(String(request.status || "").toLowerCase()) &&
  !request.offerHistory?.some((offer) => offer.status === "pending" && offer.proposedByUserId === request.travelerUserId);
