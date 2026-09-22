import { siteConfig } from "@/lib/config";

const ACCESS_TOKEN_KEY = "trickle.web.accessToken";
const REFRESH_TOKEN_KEY = "trickle.web.refreshToken";
const DEVICE_ID_KEY = "trickle.web.deviceId";

let refreshPromise: Promise<boolean> | null = null;

const refreshWebSession = async () => {
  if (typeof window === "undefined") return false;
  if (refreshPromise) return refreshPromise;

  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  const deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!refreshToken || !deviceId) return false;

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": deviceId,
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;

      const data = (await response.json()) as {
        token?: { accessToken?: string; refreshToken?: string };
        accessToken?: string;
        refreshToken?: string;
      };
      const accessToken = data.token?.accessToken ?? data.accessToken;
      const nextRefreshToken = data.token?.refreshToken ?? data.refreshToken;
      if (!accessToken) return false;

      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (nextRefreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
      return true;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const parseApiError = async (response: Response) => {
  const responseText = await response.text();
  let details: { message?: string; error?: string } | undefined;
  try {
    details = responseText ? (JSON.parse(responseText) as { message?: string; error?: string }) : undefined;
  } catch {
    details = undefined;
  }
  const error = new Error(
    details?.message || details?.error || `API request failed with status ${response.status}`,
  ) as Error & { status?: number; data?: unknown };
  error.status = response.status;
  error.data = details;
  throw error;
};

export async function apiRequest<T>(path: string, init?: RequestInit, canRefresh = true): Promise<T> {
  const apiUrl = typeof window === "undefined" ? `${siteConfig.apiBaseUrl}${path}` : `/api${path}`;
  const accessToken = typeof window !== "undefined" ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const deviceId = typeof window !== "undefined" ? window.localStorage.getItem(DEVICE_ID_KEY) : null;
  const method = init?.method || "GET";
  console.log(`[HTTP] ${method} ${path}`);
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(deviceId ? { "X-Device-ID": deviceId } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    console.error(`[HTTP] ${method} ${path} — network request failed`, error);
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401 && canRefresh && typeof window !== "undefined" && path !== "/v1/auth/refresh") {
      const refreshed = await refreshWebSession();
      if (refreshed) return apiRequest<T>(path, init, false);
    }
    // Logout is idempotent from the browser's perspective. An expired or
    // already-revoked token means there is nothing left for the server to revoke.
    if (response.status === 401 && path === "/v1/auth/logout") return null as T;
    console.error(`[HTTP] ${method} ${path} — failed, status: ${response.status}`);
    await parseApiError(response);
  }

  console.log(`[HTTP] ${method} ${path} — ${response.status}`);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}