// Keep in sync with transitorder's validDeclineReasonCodes
// (internal/models/parcel_match.go) and the mobile app's
// src/constants/declineReasons.js — same codes, same labels, both apps.
export const DECLINE_REASONS: { code: string; label: string }[] = [
  { code: "mismatch", label: "Doesn't match the description" },
  { code: "weight_or_size", label: "Weight or size is different" },
  { code: "damaged_or_tampered", label: "Package looks damaged or tampered" },
  { code: "prohibited_items", label: "Suspect prohibited items inside" },
  { code: "suspicious_sender", label: "Sender seems suspicious" },
  { code: "other", label: "Something else" },
];

export const declineReasonLabel = (code?: string): string =>
  DECLINE_REASONS.find((reason) => reason.code === code)?.label || "Not specified";
