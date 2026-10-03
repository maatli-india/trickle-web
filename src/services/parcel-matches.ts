import { apiRequest } from "@/services/api-client";
import { pollFileStatus, uploadFileBytes, type FileStatus, type UploadUrlResult } from "@/services/files";
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
  // What the sender is offering to pay in total — the backend derives the
  // shared internal base amount from it; this app never computes or sees
  // that conversion.
  amount: number;
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

// Counter-offer negotiation is disabled backend-side (see transitorder's
// routers/parcel_match.go) — accept/reject is now the whole flow.
export const respondToCounterOffer = (matchId: string, action: "accept" | "reject", comment?: string) =>
  apiRequest<ParcelMatch | { data?: ParcelMatch }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/respond-offer`, {
    method: "POST",
    body: JSON.stringify({ action, ...(comment ? { comment } : {}) }),
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

// Parcel-match photos — bulk upload, gallery, delete. Only bookedBy, sender,
// or receiver may add/delete (403 for the traveler); anyone on the match may
// view. There is no match-status gate. Batches are capped at 20 files.
const MAX_PARCEL_PHOTO_BATCH = 20;

export const requestParcelImageUploadUrls = (matchId: string, files: { fileContentType: string }[]) =>
  apiRequest<{ results: UploadUrlResult[] }>("/v1/file/upload-urls", {
    method: "POST",
    body: JSON.stringify({
      groupId: matchId,
      files: files.map((file) => ({ fileType: "parcel_image", fileContentType: file.fileContentType })),
    }),
  });

export type ParcelImageUploadOutcome =
  | { file: File; fileId: string; status: FileStatus }
  | { file: File; error: string };

// Mints upload URLs (chunked into batches of 20), PUTs each file's bytes,
// and polls each to READY/FAILED. An item failing to mint or upload doesn't
// stop the rest — every file gets its own outcome.
export const uploadParcelImages = async (matchId: string, files: File[]): Promise<ParcelImageUploadOutcome[]> => {
  const outcomes: ParcelImageUploadOutcome[] = [];
  for (let offset = 0; offset < files.length; offset += MAX_PARCEL_PHOTO_BATCH) {
    const batch = files.slice(offset, offset + MAX_PARCEL_PHOTO_BATCH);
    const { results } = await requestParcelImageUploadUrls(matchId, batch.map((file) => ({ fileContentType: file.type })));
    await Promise.all(
      batch.map(async (file, index) => {
        const result = results[index];
        if (result?.error || !result?.uploadUrl) {
          outcomes.push({ file, error: result?.error || "Could not prepare this photo for upload." });
          return;
        }
        let target = result.uploadUrl;
        try {
          try {
            await uploadFileBytes(target, file);
          } catch {
            const retry = await requestParcelImageUploadUrls(matchId, [{ fileContentType: file.type }]);
            const retryTarget = retry.results[0]?.uploadUrl;
            if (!retryTarget) throw new Error("Could not prepare this photo for upload.");
            target = retryTarget;
            await uploadFileBytes(target, file);
          }
          const status = await pollFileStatus(target.fileId);
          outcomes.push({ file, fileId: target.fileId, status });
        } catch (uploadError) {
          outcomes.push({ file, error: uploadError instanceof Error ? uploadError.message : "Upload failed." });
        }
      }),
    );
  }
  return outcomes;
};

// GET .../files/{fileId}/download-url is authenticated and redirects to the
// real image — same "can't send headers on <img>, can't read Location from
// fetch()" problem as the profile picture, resolved the same way via a
// server-side route that forwards the caller's Authorization + X-Device-ID.
export const fetchParcelPhotoUrl = async (matchId: string, fileId: string): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  try {
    const result = await apiRequest<{ url?: string }>(`/parcel-photo/${encodeURIComponent(matchId)}/${encodeURIComponent(fileId)}`);
    return result?.url || null;
  } catch {
    return null;
  }
};

export const deleteParcelMatchFile = (matchId: string, fileId: string) =>
  apiRequest<{ message?: string }>(`/v1/parcel-matches/${encodeURIComponent(matchId)}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
