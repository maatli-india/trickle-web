import { apiRequest } from "@/services/api-client";
import type { Location, ParcelMatch } from "@/types/travel";

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!pairs.length) return "";
  return "?" + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
};

export type CreateParcelMatchPayload = {
  senderUserId: string;
  senderName?: string;
  travelerUserId: string;
  travelPlanId: string;
  travelerName?: string;
  parcelType?: string;
  parcelCategory?: string;
  parcelSubcategory?: string;
  weightRange?: string;
  baseAmount: number;
  from: Location;
  to: Location;
  targetDeliveryTime: string;
  parcelDescription: string;
  estimatedWeightKg: number;
  packageCount?: number;
  pickupOption?: string;
  pickupNote?: string;
  deliveryOption?: string;
  deliveryNote?: string;
  note?: string;
  safetyDeclaration?: Record<string, boolean | string>;
};

export const createParcelMatch = (payload: CreateParcelMatchPayload) =>
  apiRequest<ParcelMatch>("/v1/parcel-matches", { method: "POST", body: JSON.stringify(payload) });

export const listParcelMatches = (params: { side?: "sender" | "traveler"; status?: string; page?: number; limit?: number } = {}) =>
  apiRequest<{ items?: ParcelMatch[]; data?: ParcelMatch[] }>(`/v1/parcel-matches${buildQuery(params)}`);

export const getParcelMatch = (matchId: string) =>
  apiRequest<ParcelMatch | { data?: ParcelMatch }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}`);

export const cancelParcelMatch = (matchId: string) =>
  apiRequest<null>(`/v1/parcel-matches/${encodeURIComponent(matchId)}`, { method: "DELETE" });

export const deletePastParcelMatch = (matchId: string) =>
  apiRequest<null>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/history`, { method: "DELETE" });

export const dismissHomeOverlay = (matchId: string) =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/home-overlay-dismissal`, { method: "POST", body: JSON.stringify({}) });

export const initiateHandoff = (matchId: string) =>
  apiRequest<{ handoff?: { otp?: string } }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/handoff/initiate`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const confirmHandoff = (matchId: string, otp: string) =>
  apiRequest<ParcelMatch | { match?: ParcelMatch; data?: ParcelMatch }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/handoff/confirm`, {
    method: "POST",
    body: JSON.stringify({ otp }),
  });

export const acknowledgeInspection = (matchId: string, accepted: boolean, declineReason?: string) =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/handoff/acknowledge-inspection`, {
    method: "POST",
    body: JSON.stringify({ accepted, ...(declineReason ? { declineReason } : {}) }),
  });

export const submitMatchRating = (matchId: string, payload: Record<string, unknown>) =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/rating`, { method: "POST", body: JSON.stringify(payload) });

export const counterOfferParcelMatch = (matchId: string, payload: { baseAmount: number; comment?: string }) =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/counter-offer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const respondToCounterOffer = (matchId: string, action: "accept" | "reject", comment?: string) =>
  apiRequest<ParcelMatch | { data?: ParcelMatch }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/respond-offer`, {
    method: "POST",
    body: JSON.stringify({ action, ...(comment ? { comment } : {}) }),
  });

export const withdrawCounterOffer = (matchId: string, negotiationId: string, nextAction: "accept" | "decline") =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/negotiations/${encodeURIComponent(negotiationId)}/withdraw`, {
    method: "POST",
    body: JSON.stringify({ nextAction }),
  });

export const flagParcelDispute = (matchId: string, reason: string) =>
  apiRequest(`/v1/parcel-matches/${encodeURIComponent(matchId)}/dispute`, { method: "POST", body: JSON.stringify({ reason }) });

// Payments — web completes a real PayU hosted-checkout redirect (see
// /payment/result and requests/[id] "Pay now"). Backend echoes the payer's
// firstName/email/phone here so the values submitted to PayU exactly match
// what the server signed into the hash (any drift breaks PayU's hash check).
export type PaymentOrder = {
  transactionId: string;
  amount: string;
  currency: string;
  gateway: string;
  merchantKey: string;
  productInfo: string;
  surl: string;
  furl: string;
  isProduction: boolean;
  checkoutUrl?: string;
  email: string;
  firstName: string;
  phone: string;
};

export const createPaymentOrder = (matchId: string, client: "web" | "app" = "web") =>
  apiRequest<PaymentOrder>("/v1/payments/orders", {
    method: "POST",
    body: JSON.stringify({ entityType: "parcel-match", entityId: matchId, client }),
  });

export const signCheckoutHash = (transactionId: string, name: "hosted_checkout_hash" | "payment_hash" = "hosted_checkout_hash") =>
  apiRequest<{ hash: string; hashName: string }>("/v1/payments/hashes", {
    method: "POST",
    body: JSON.stringify({ transactionId, name }),
  });

export const abandonPaymentOrder = (transactionId: string) =>
  apiRequest(`/v1/payments/orders/${encodeURIComponent(transactionId)}/abandon`, { method: "POST", body: JSON.stringify({}) });

export const acknowledgePayment = (matchId: string, transactionId: string) =>
  apiRequest("/v1/payments/verify", { method: "POST", body: JSON.stringify({ entityId: matchId, transactionId }) });

// Dev-only shortcut (mirrors mobile's __DEV__-gated mock-confirm) so the rest
// of the lifecycle can be exercised on web before a real checkout exists.
export const mockConfirmPayment = (matchId: string, transactionId: string) =>
  apiRequest("/v1/payments/mock-confirm", { method: "POST", body: JSON.stringify({ entityId: matchId, transactionId }) });
