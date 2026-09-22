export type Location = {
  address: string;
  lat: number;
  lng: number;
};

export type TravelMode = "by_road" | "by_train" | "by_flight";

export type TravelPlan = {
  id: string;
  from: Location;
  to: Location;
  departureDate: string;
  arrivalDate: string;
  travelMode: TravelMode;
  status?: "active" | "completed" | "cancelled" | string;
  acceptingNewRequests?: boolean;
  additionalInfo?: string;
  maxWeightKg?: number;
  maxParcelCount?: number;
  pricePerPackage?: number;
  timezone?: string;
  acceptedParcelTypes?: string[];
  acceptedParcelCategories?: string[];
  restrictedParcelTypes?: string[];
  pickupHandover?: string;
  deliveryHandover?: string;
  pickupHandovers?: string[];
  deliveryHandovers?: string[];
  views?: number;
  majorChangeCount?: number;
  majorChangeUsed?: boolean;
  freeMajorChangeUsed?: boolean;
  major_change_used?: boolean;
  free_major_change_used?: boolean;
  majorChange?: { used?: boolean };
  freeMajorChange?: { used?: boolean };
  allowanceUsed?: boolean;
  requesters?: ParcelMatch[];
  requests?: ParcelMatch[];
  [key: string]: unknown;
};

export type OfferHistoryEntry = {
  status?: string;
  proposedBy?: "sender" | "traveler" | string;
  proposedByUserId?: string;
  proposedByUserID?: string;
  baseAmount?: number;
  comment?: string;
  negotiationId?: string;
  createdAt?: string;
};

export type ParcelMatch = {
  id: string;
  senderUserId?: string;
  travelerUserId?: string;
  travelPlanId?: string;
  senderName?: string;
  travelerName?: string;
  status: string;
  baseAmount?: number;
  agreedPrice?: number;
  pricing?: { baseAmount?: number; senderPayableAmount?: number };
  from: Location;
  to: Location;
  targetDeliveryTime?: string;
  departureDate?: string;
  parcelDescription?: string;
  parcelCategory?: string;
  parcelSubcategory?: string;
  estimatedWeightKg?: number;
  weightRange?: string;
  packageCount?: number;
  pickupOption?: string;
  pickupNote?: string;
  deliveryOption?: string;
  deliveryNote?: string;
  note?: string;
  offerHistory?: OfferHistoryEntry[];
  paymentRef?: { status?: string };
  cancellation?: {
    cancelledBy?: string;
    cancelledByName?: string;
    reason?: string;
    refundAmount?: number;
    refundStatus?: "refund_pending" | "refund_processing" | "refund_completed" | "refund_failed";
    refundTransactionId?: string;
    refundInitiatedAt?: string;
    refundCompletedAt?: string;
    refundFailureReason?: string;
  };
  createdAt?: string;
  [key: string]: unknown;
};

export type ListResponse<T> = {
  items?: T[];
  data?: T[] | { items?: T[] };
  matches?: T[];
  total?: number;
};

export const extractListItems = <T,>(response: ListResponse<T> | T[] | null | undefined): T[] => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray((response.data as { items?: T[] }).items)) {
    return (response.data as { items?: T[] }).items || [];
  }
  if (Array.isArray(response.matches)) return response.matches;
  return [];
};

export const extractOneItem = <T,>(response: T | { data?: T } | null | undefined): T | undefined => {
  if (!response) return undefined;
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as { data?: T }).data ?? (response as T);
  }
  return response as T;
};
