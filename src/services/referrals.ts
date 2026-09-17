import { apiRequest } from "@/services/api-client";

export type ReferralSummary = { code?: string; referralCode?: string; link?: string; referralLink?: string; totalReferred?: number; totalEarned?: number; rewardAmount?: number };

export const getReferrals = () => apiRequest<ReferralSummary>("/v1/users/me/referrals");
