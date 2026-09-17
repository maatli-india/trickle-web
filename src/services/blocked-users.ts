import { apiRequest } from "@/services/api-client";

export type BlockedUser = { id: string; userId?: string; name?: string; phone?: string; blockedAt?: string };
type BlockedUsersResponse = { items?: BlockedUser[]; data?: BlockedUser[] };

export const listBlockedUsers = async () => {
  const response = await apiRequest<BlockedUsersResponse | BlockedUser[]>("/v1/users/me/blocked");
  return Array.isArray(response) ? response : response.items || response.data || [];
};

export const unblockUser = (userId: string) => apiRequest(`/v1/users/me/blocked/${encodeURIComponent(userId)}`, { method: "DELETE" });
