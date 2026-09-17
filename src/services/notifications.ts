import { apiRequest } from "@/services/api-client";

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const pairs = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!pairs.length) return "";
  return "?" + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
};

export type Notification = {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  body?: string;
  readAt?: string | null;
  read?: boolean;
  createdAt?: string;
  entityType?: string;
  entityId?: string;
};

export const listNotifications = (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) =>
  apiRequest<{ items?: Notification[]; data?: Notification[] }>(`/v1/notifications${buildQuery(params)}`);

export const getUnreadNotificationCount = () => apiRequest<{ count?: number }>("/v1/notifications/unread-count");

export const markNotificationRead = (notificationId: string) =>
  apiRequest(`/v1/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PUT" });
