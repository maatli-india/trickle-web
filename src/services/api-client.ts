import { siteConfig } from "@/lib/config";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = typeof window === "undefined" ? `${siteConfig.apiBaseUrl}${path}` : `/api${path}`;
  const accessToken = typeof window !== "undefined" ? window.localStorage.getItem("trickle.web.accessToken") : null;
  const deviceId = typeof window !== "undefined" ? window.localStorage.getItem("trickle.web.deviceId") : null;
  const response = await fetch(apiUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(deviceId ? { "X-Device-ID": deviceId } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}