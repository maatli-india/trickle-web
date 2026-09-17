import { apiRequest } from "@/services/api-client";

export type ReliabilityEvent = { id: string; type: string; createdAt?: string; verifiedOverride?: boolean };
export type ReliabilityBreakdownItem = { type: string; count: number };

export type ReliabilityDetail = {
  score?: number;
  tier?: string;
  badge?: { highlyReliable?: boolean };
  completedCount?: number;
  sampleSize?: number;
  minTripsRequired?: number;
  scoreThreshold?: number;
  breakdown?: ReliabilityBreakdownItem[];
  recentEvents?: ReliabilityEvent[];
};

type ReliabilityResponse = ReliabilityDetail & { data?: ReliabilityDetail };

export const getMyReliability = async () => {
  const response = await apiRequest<ReliabilityResponse>("/v1/users/me/reliability");
  return response?.data || response;
};
