// Keep in sync with transitorder's cancellation reason-code enum
// (internal/models/parcel_match.go, ParcelMatchCancellationModel.ReasonCode)
// and the mobile app's src/constants/cancelReasons.js — same codes, same
// labels, both apps.
//
// "unresponsive" and "changed_mind" are valid for either role but read
// differently depending on who cancelled — hence two lists instead of one
// flat map, and why cancelReasonLabel below needs the canceller's role, not
// just the code.
export const SENDER_CANCEL_REASONS: { code: string; label: string }[] = [
  { code: "found_alternative", label: "Found another traveller" },
  { code: "price_disagreement", label: "Price didn't work out" },
  { code: "details_mismatch", label: "Pickup/delivery details changed" },
  { code: "unresponsive", label: "Traveller was unresponsive" },
  { code: "changed_mind", label: "Changed my mind" },
  { code: "other", label: "Other" },
];

export const TRAVELER_CANCEL_REASONS: { code: string; label: string }[] = [
  { code: "schedule_conflict", label: "Schedule conflict" },
  { code: "cant_carry_item", label: "Can't carry this item" },
  { code: "unresponsive", label: "Sender was unresponsive" },
  { code: "changed_mind", label: "My plans changed" },
  { code: "other", label: "Other" },
];

// cancelledBy is "sender" or "traveler" (CancellationOutcome.cancelledBy) —
// picks which list's wording applies, since the same code reads differently
// depending on who cancelled.
export const cancelReasonLabel = (code?: string, cancelledBy?: string): string | null => {
  const list = cancelledBy === "traveler" ? TRAVELER_CANCEL_REASONS : SENDER_CANCEL_REASONS;
  return list.find((reason) => reason.code === code)?.label || null;
};
