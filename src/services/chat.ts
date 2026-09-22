import { apiRequest } from "@/services/api-client";

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: "text" | "location";
  text?: string;
  createdAt: string;
  isRead?: boolean;
};

export type ChatHistory = {
  items?: ChatMessage[];
  data?: { items?: ChatMessage[] };
};

export const getChatMessages = (chatId: string) =>
  apiRequest<ChatHistory>(`/v1/chats/${encodeURIComponent(chatId)}/messages?latest=true&limit=50`);

export const getChatShortToken = () =>
  apiRequest<{ accessToken?: string; token?: { accessToken?: string } }>("/v1/auth/short-token", {
    method: "POST",
    body: JSON.stringify({}),
  });
