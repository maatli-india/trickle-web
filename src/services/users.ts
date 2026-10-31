import { apiRequest } from "@/services/api-client";

export type UserProfile = {
  id?: string;
  name?: string;
  verified?: boolean;
  [key: string]: unknown;
};

// GET /v1/users/{id} wraps the profile (profileDetails/user/data) the same
// way requests/new's enrichTravellers already unwraps it inline for the
// same endpoint — kept here as one shared, typed helper instead of
// duplicating that unwrap at every other call site that just needs another
// user's public profile (e.g. to read .verified).
type UserProfileResponse = { profileDetails?: UserProfile; user?: UserProfile; data?: UserProfile };

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await apiRequest<UserProfileResponse>(`/v1/users/${encodeURIComponent(userId)}`);
  return response.profileDetails || response.user || response.data || (response as UserProfile);
};
