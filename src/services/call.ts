import { apiRequest } from "@/services/api-client";

type MaskedCallResponse = { phone: string };

/**
 * POST /v1/call-masking/parcel-match/{matchId}
 * Returns the Exotel virtual number the caller should dial.
 */
export const initiateMaskedCall = (matchId: string) =>
  apiRequest<MaskedCallResponse>(
    `/v1/call-masking/parcel-match/${encodeURIComponent(matchId)}`,
    { method: "POST", body: JSON.stringify({}) },
  );
