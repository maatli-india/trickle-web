import { apiRequest } from "@/services/api-client";
import { siteConfig } from "@/lib/config";

// Chat speaks transitorder's actual socket wire protocol (JSON-over-WebSocket
// via github.com/dibyaranjan-pradhan/go-socket, documented in
// docs/chat-socket-hld.md and docs/WIRE_PROTOCOL.md in that repo). Not
// socket.io — every frame is `{ event, payload }`, nothing more. The
// previous version of this file assumed a `{ type, data }` shape and sent
// payloads with no `event` envelope at all, so nothing sent ever reached the
// server (dispatch() drops any frame with no event) and nothing received
// ever parsed correctly — fixed here to match the real protocol, mirroring
// the mobile app's src/api/chat.js.

export type ChatLocation = { lat: number; lng: number; address?: string };

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: "text" | "file" | "location";
  text?: string;
  fileId?: string;
  location?: ChatLocation;
  replyToId?: string;
  createdAt: string;
  isRead?: boolean;
};

export type ChatHistory = {
  items?: ChatMessage[];
  data?: { items?: ChatMessage[] };
};

export const getChatMessages = (chatId: string) =>
  apiRequest<ChatHistory>(`/v1/chats/${encodeURIComponent(chatId)}/messages?latest=true&limit=20`);

export const getChatShortToken = () =>
  apiRequest<{ accessToken?: string; token?: { accessToken?: string } }>("/v1/auth/short-token", {
    method: "POST",
    body: JSON.stringify({}),
  });

type ServerWireMessage =
  | { event: "history"; payload: ChatMessage[] }
  | { event: "message"; payload: ChatMessage }
  | { event: "typing"; payload: { isTyping?: boolean; userID?: string } }
  | { event: "connected"; payload: { message?: string } }
  | { event: "error"; payload: { message?: string } };

export type ChatSocketHandlers = {
  onOpen?: () => void;
  onHistory?: (items: ChatMessage[]) => void;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (isTyping: boolean, userId: string) => void;
  onConnected?: () => void;
  onServerError?: (message: string) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
};

// The /ws route is mounted exclusively on RequireShortToken (see
// transitorder's internal/routers/chat.go) — it rejects a normal long-lived
// access token outright. A short token must be minted via POST
// /v1/auth/short-token (normal access-token auth) immediately before every
// connection attempt. Unlike React Native's WebSocket, a browser's
// WebSocket constructor cannot set custom headers, so there's no X-Device-ID
// here — the server falls back to the deviceId embedded in the short token's
// own JWT claims for WS-upgrade requests specifically (see
// deviceIDForShortTokenBinding in the backend), which is already correct
// for whichever device/session minted this token.
export const connectChatWebSocket = async (chatId: string, handlers: ChatSocketHandlers = {}): Promise<WebSocket> => {
  const { onOpen, onHistory, onMessage, onTyping, onConnected, onServerError, onClose, onError } = handlers;

  const tokenResponse = await getChatShortToken();
  const shortToken = tokenResponse.accessToken || tokenResponse.token?.accessToken;
  if (!shortToken) throw new Error("Could not start a chat session — please try again.");

  const wsBase = siteConfig.apiBaseUrl.replace(/^http/, "ws");
  const url = `${wsBase}/v1/chats/${encodeURIComponent(chatId)}/ws?access_token=${encodeURIComponent(shortToken)}`;
  const socket = new WebSocket(url);

  socket.onopen = () => onOpen?.();
  socket.onclose = (event) => onClose?.(event);
  socket.onerror = (event) => onError?.(event);
  socket.onmessage = (event) => {
    let frame: ServerWireMessage;
    try {
      frame = JSON.parse(event.data as string) as ServerWireMessage;
    } catch {
      return;
    }
    switch (frame?.event) {
      case "history":
        if (Array.isArray(frame.payload)) onHistory?.(frame.payload);
        break;
      case "message":
        if (frame.payload?.id) onMessage?.(frame.payload);
        break;
      case "typing":
        onTyping?.(Boolean(frame.payload?.isTyping), frame.payload?.userID || "");
        break;
      case "connected":
        onConnected?.();
        break;
      case "error":
        onServerError?.(frame.payload?.message || "Something went wrong with this chat.");
        break;
      default:
        break;
    }
  };

  return socket;
};

const sendSocketEvent = (socket: WebSocket | null, event: string, payload: unknown): boolean => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ event, payload }));
  return true;
};

export const sendTextMessage = (socket: WebSocket | null, text: string, replyToId?: string) =>
  sendSocketEvent(socket, "message", { type: "text", text, ...(replyToId ? { replyToId } : {}) });

export const sendFileMessage = (socket: WebSocket | null, fileId: string, replyToId?: string) =>
  sendSocketEvent(socket, "message", { type: "file", fileId, ...(replyToId ? { replyToId } : {}) });

export const sendLocationMessage = (socket: WebSocket | null, location: ChatLocation, replyToId?: string) =>
  sendSocketEvent(socket, "message", { type: "location", location, ...(replyToId ? { replyToId } : {}) });

export const sendTypingStatus = (socket: WebSocket | null, isTyping: boolean) =>
  sendSocketEvent(socket, "typing", { isTyping });

export const fetchOlderMessages = (socket: WebSocket | null, beforeMessageId: string) =>
  sendSocketEvent(socket, "fetch_history", { beforeMessageId });
