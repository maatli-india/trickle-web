import { apiRequest } from "@/services/api-client";

const DEVICE_ID_KEY = "trickle.web.deviceId";
const ACCESS_TOKEN_KEY = "trickle.web.accessToken";
const REFRESH_TOKEN_KEY = "trickle.web.refreshToken";
const PROFILE_KEY = "trickle.web.profile";

const createDeviceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildDeviceDetails = () => ({
  appVersion: "1.0.0",
  token: "web",
  os: "web",
  osVersion: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
  model: "Web Browser",
  country: "India",
});

export const getDeviceId = () => {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const deviceId = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
};

const saveTokens = (token?: TokenPair) => {
  if (typeof window === "undefined" || !token?.accessToken) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token.accessToken);
  if (token.refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken);
};

export const hasAccessToken = () =>
  typeof window !== "undefined" && Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY));

export const getWebProfile = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PROFILE_KEY);
};

export const clearWebSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
};

export const logoutWebSession = async () => {
  try {
    await apiRequest("/v1/auth/logout", { method: "POST" });
  } finally {
    clearWebSession();
  }
};

export const generateDeleteAccountOtp = () => apiRequest("/v1/auth/delete-account/otp", { method: "POST" });

export const deleteAccount = (otp: string) => apiRequest("/v1/users/me", { method: "DELETE", body: JSON.stringify({ otp }) });

type TokenPair = { accessToken: string; refreshToken?: string };

type AuthResponse = {
  isNewUser?: boolean;
  token?: { accessToken?: string; refreshToken?: string };
  accessToken?: string;
  refreshToken?: string;
  userDetails?: { name?: string; profilePicUrl?: string };
  profileDetails?: { name?: string; profilePicUrl?: string };
  user?: { name?: string; profilePicUrl?: string };
  data?: { name?: string; profilePicUrl?: string; userDetails?: { name?: string }; profileDetails?: { name?: string } };
  message?: string;
};

const saveProfile = (response: AuthResponse, fallback?: { name?: string }) => {
  if (typeof window === "undefined") return;
  const profile = response.userDetails
    ?? response.profileDetails
    ?? response.user
    ?? response.data?.userDetails
    ?? response.data?.profileDetails
    ?? response.data
    ?? fallback;
  if (profile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

const extractTokenPair = (response: AuthResponse): TokenPair | undefined => {
  const accessToken = response.token?.accessToken ?? response.accessToken;
  if (!accessToken) return undefined;
  return {
    accessToken,
    refreshToken: response.token?.refreshToken ?? response.refreshToken,
  };
};

export const generateOtp = (phone: string) =>
  apiRequest<AuthResponse>("/v1/auth/generate_otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const validateOtp = async (phone: string, otp: string) => {
  const response = await apiRequest<AuthResponse>("/v1/auth/validate_otp", {
    method: "POST",
    headers: { "X-Device-ID": getDeviceId() },
    body: JSON.stringify({ phone, otp, ...buildDeviceDetails() }),
  });
  if (!response.isNewUser) {
    const token = extractTokenPair(response);
    if (!token) throw new Error("Login succeeded but the server did not return an access token.");
    saveTokens(token);
    saveProfile(response);
  }
  return response;
};

export type RegistrationProfile = {
  name: string;
  email: string;
  phone: string;
  phoneExt: string;
  gender: "male" | "female" | "other";
  dob: string;
};

export const createUser = async (profile: RegistrationProfile) => {
  const response = await apiRequest<AuthResponse>("/v1/users", {
    method: "POST",
    headers: { "X-Device-ID": getDeviceId() },
    body: JSON.stringify({ ...profile, ...buildDeviceDetails() }),
  });
  const token = extractTokenPair(response);
  if (!token) throw new Error("Registration succeeded but the server did not return an access token.");
  saveTokens(token);
  saveProfile(response, profile);
  return response;
};