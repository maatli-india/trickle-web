import { apiRequest } from "@/services/api-client";

// Public parcel-tracking link (GET /v1/track/{token}) — no auth. The token
// is a secret capability: anyone holding the link sees the parcel's progress
// and, once available, its delivery code.

export type TrackingStatus =
  | "awaiting_pickup"
  | "on_the_way"
  | "arriving"
  | "delayed"
  | "awaiting_recipient"
  | "delivered"
  | "returning"
  | "returned"
  | "cancelled";

export type TrackingCodeStatus = "not_yet" | "available" | "awaiting_payment" | "used" | "none";

export type ParcelTracking = {
  // Typed loosely on top of the known values: the backend may add states
  // before this page learns about them, and the page must not break.
  status: TrackingStatus | (string & {});
  fromCity: string;
  toCity: string;
  travellerFirstName: string;
  senderFirstName: string;
  receiverFirstName?: string;
  // Trip wall-clock time "YYYY-MM-DD HH:MM:SS" — display as-is, never new Date() it.
  plannedArrival?: string;
  // RFC3339 instants.
  pickedUpAt?: string;
  deliveredAt?: string;
  latestUpdate?: { stage: string; eventType: string; at: string };
  codeStatus: TrackingCodeStatus | (string & {});
  // Only present when codeStatus === "available".
  otp?: string;
};

// 404 = unknown or expired link (error.status === 404 on the thrown Error).
export function getParcelTracking(token: string) {
  return apiRequest<ParcelTracking>(`/v1/track/${encodeURIComponent(token)}`, { cache: "no-store" });
}
