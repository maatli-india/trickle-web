"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ImagePlus,
  MapPin,
  Navigation,
  Package,
  Phone,
  Reply,
  Send,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { extractOneItem, type ParcelMatch } from "@/types/travel";
import { getParcelMatch } from "@/services/parcel-matches";
import { fetchChatFileUrl, uploadChatImage } from "@/services/files";
import { apiRequest } from "@/services/api-client";
import {
  connectChatWebSocket,
  fetchOlderMessages,
  sendFileMessage,
  sendLocationMessage,
  sendTextMessage,
  sendTypingStatus,
  type ChatLocation,
  type ChatMessage,
} from "@/services/chat";

// Chat supports text, a single photo per message, sharing the sender's
// current location, and replying to a specific earlier message — mirroring
// the mobile app's Chat screen exactly (src/screens/Chat/index.js in
// trickle). No video/multi-file attachments, no in-chat camera, no map-pin
// picker — same deliberate scope as mobile.

const TYPING_INDICATOR_TIMEOUT_MS = 4000;
const TYPING_STOP_DEBOUNCE_MS = 2500;
const HISTORY_PAGE_SIZE = 20;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 8000];

type PendingUpload = {
  pending: true;
  localId: string;
  localUrl: string;
  senderId: string;
  createdAt: string;
  uploading: boolean;
  error: string | null;
  fileId?: string;
  replyToId?: string;
};

type DisplayItem = ChatMessage | PendingUpload;

const isPending = (item: DisplayItem): item is PendingUpload => "pending" in item && item.pending === true;

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const known = new Set(current.map((item) => item.id));
  const added = incoming.filter((item) => item?.id && !known.has(item.id));
  if (!added.length) return current;
  return [...current, ...added].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

const openInMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank", "noopener,noreferrer");
};

// useSearchParams() opts the page out of static rendering unless it's
// wrapped in its own Suspense boundary — next build's prerender step fails
// outright without this.
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F7FA]" />}>
      <ChatPageContent id={id} />
    </Suspense>
  );
}

function ChatPageContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "traveller" ? "traveller" : "sender";
  const isSender = role === "sender";

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);
  const hasOpenedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const counterpartTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oldestMessageIdRef = useRef<string | null>(null);
  // A plain incrementing counter, not Date.now()/Math.random() — this only
  // needs to be unique within one mounted session (it keys a transient
  // pending-upload bubble, never sent to the server), and a ref mutation is
  // the sanctioned "impure but fine in an event handler" primitive here,
  // unlike calling an impure global during what the linter can't prove is
  // strictly event-handler-only code.
  const pendingUploadCounterRef = useRef(0);

  const [match, setMatch] = useState<ParcelMatch | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string | null>>({});
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [error, setError] = useState("");
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationConfirmOpen, setLocationConfirmOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getParcelMatch(id),
      apiRequest<Record<string, unknown> | { data?: Record<string, unknown> }>("/v1/users/me"),
    ])
      .then(([matchResponse, userResponse]) => {
        if (!active) return;
        const nextMatch = extractOneItem<ParcelMatch>(matchResponse) || null;
        const user = ((userResponse && "data" in userResponse ? userResponse.data : userResponse) || {}) as {
          id?: string;
          userId?: string;
          _id?: string;
        };
        setMatch(nextMatch);
        setViewerId(String(user.id || user.userId || user._id || ""));
        if (!nextMatch) setError("This conversation could not be found.");
      })
      .catch(() => active && setError("We could not load this conversation."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const chatId = match?.chatId ? String(match.chatId) : id;
  const counterpartId = String((isSender ? match?.travelerUserId : match?.senderUserId) || "");
  const counterpart = useMemo(() => {
    if (!match) return isSender ? "Traveller" : "Sender";
    return (isSender ? match.travelerName : match.senderName) || (isSender ? "Traveller" : "Sender");
  }, [isSender, match]);
  const parcelLabel = match?.parcelDescription || match?.parcelCategory || "Parcel";
  const routeLabel = match?.from?.address && match?.to?.address ? `${match.from.address} -> ${match.to.address}` : "";
  const myBubbleColor = isSender ? "#101828" : "#0F6E56";

  const clearCounterpartTypingTimer = () => {
    if (counterpartTypingTimerRef.current) {
      clearTimeout(counterpartTypingTimerRef.current);
      counterpartTypingTimerRef.current = null;
    }
  };

  // Read by the reconnect timer below instead of calling `connect` by name
  // from inside its own definition — keeps the self-referencing reconnect
  // loop (a close after a real open schedules another connect() attempt)
  // without a direct recursive reference to the not-yet-fully-defined
  // binding.
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }
    hasOpenedRef.current = false;
    connectChatWebSocket(chatId, {
      onOpen: () => {
        if (!mountedRef.current) return;
        hasOpenedRef.current = true;
        setConnected(true);
        setFatalError("");
        reconnectAttemptRef.current = 0;
      },
      onHistory: (items) => {
        if (!mountedRef.current) return;
        setMessages((current) => mergeMessages(current, items));
        if (items.length) oldestMessageIdRef.current = items[0].id;
        setCanLoadMore(items.length >= HISTORY_PAGE_SIZE);
        setLoading(false);
        setLoadingOlder(false);
      },
      onMessage: (message) => {
        if (!mountedRef.current) return;
        setMessages((current) => mergeMessages(current, [message]));
        if (message.type === "file" && message.fileId) {
          setPendingUploads((current) => current.filter((item) => item.fileId !== message.fileId));
        }
        if (String(message.senderId) !== viewerId) {
          clearCounterpartTypingTimer();
          setCounterpartTyping(false);
        }
      },
      onTyping: (isTyping, userId) => {
        if (!mountedRef.current) return;
        if (String(userId) !== counterpartId) return;
        clearCounterpartTypingTimer();
        setCounterpartTyping(isTyping);
        if (isTyping) {
          counterpartTypingTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setCounterpartTyping(false);
          }, TYPING_INDICATOR_TIMEOUT_MS);
        }
      },
      onServerError: (message) => {
        if (!mountedRef.current) return;
        setLoading(false);
        setLoadingOlder(false);
        console.warn("[Chat] server error", { chatId, message });
      },
      onClose: () => {
        if (!mountedRef.current) return;
        setConnected(false);
        socketRef.current = null;
        // A close that happens before this attempt ever opened means the
        // server refused the upgrade outright (not a member, chat isn't
        // open for this match's status, or the chatWebsocket feature flag
        // is off) — the same rejection will happen again instantly, so
        // retrying just spams /auth/short-token for several seconds before
        // failing anyway. Fail immediately instead.
        if (!hasOpenedRef.current) {
          setFatalError("Chat isn't available for this request right now.");
          setLoading(false);
          return;
        }
        if (reconnectAttemptRef.current >= RECONNECT_DELAYS_MS.length) {
          setFatalError("Lost connection to chat.");
          setLoading(false);
          return;
        }
        const delay = RECONNECT_DELAYS_MS[reconnectAttemptRef.current];
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connectRef.current();
        }, delay);
      },
      onError: () => {
        if (!mountedRef.current) return;
        setConnected(false);
      },
    })
      .then((socket) => {
        if (!mountedRef.current) {
          socket.close();
          return;
        }
        socketRef.current = socket;
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        console.warn("[Chat] connect failed", { chatId, message: err instanceof Error ? err.message : err });
        setLoading(false);
        setFatalError(err instanceof Error ? err.message : "Could not connect to chat. Please try again.");
      });
  }, [chatId, counterpartId, viewerId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const retryConnect = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setFatalError("");
    setLoading(true);
    connect();
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The chat socket should only be open while this tab is genuinely what
  // the viewer is looking at. The server treats "connected to this chat's
  // room" as "currently viewing it" and uses that to decide whether a new
  // message still needs a push to the OTHER device (see
  // HandleMessage/isUserInRoom in transitorder's chat orchestrator) — the
  // same user could easily have the mobile app installed too, so a socket
  // left open on a backgrounded/hidden browser tab would wrongly suppress
  // a push they should have gotten there. Tear the socket down whenever the
  // tab is hidden, and reconnect once it's visible again.
  const teardownSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    typingSentRef.current = false;
    clearCounterpartTypingTimer();
    socketRef.current?.close();
    socketRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!chatId) return undefined;
    const reconcile = () => {
      if (!mountedRef.current) return;
      const visible = typeof document === "undefined" || document.visibilityState === "visible";
      if (visible) {
        if (!socketRef.current) {
          reconnectAttemptRef.current = 0;
          setLoading(true);
          connect();
        }
      } else {
        teardownSocket();
      }
    };

    reconcile();
    document.addEventListener("visibilitychange", reconcile);
    return () => {
      document.removeEventListener("visibilitychange", reconcile);
      teardownSocket();
    };
  }, [chatId, connect, teardownSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingUploads.length]);

  useEffect(() => {
    let active = true;
    const missing = messages.filter((item) => item.type === "file" && item.fileId && !(item.fileId in fileUrls));
    if (!missing.length) return undefined;
    missing.forEach((item) => {
      fetchChatFileUrl(chatId, item.fileId as string).then((url) => {
        if (!active) return;
        setFileUrls((current) => (item.fileId && item.fileId in current ? current : { ...current, [item.fileId as string]: url }));
      });
    });
    return () => {
      active = false;
    };
  }, [messages, chatId, fileUrls]);

  const stopTyping = () => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (typingSentRef.current) {
      sendTypingStatus(socketRef.current, false);
      typingSentRef.current = false;
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!connected) return;
    if (value.trim()) {
      if (!typingSentRef.current) {
        sendTypingStatus(socketRef.current, true);
        typingSentRef.current = true;
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(stopTyping, TYPING_STOP_DEBOUNCE_MS);
    } else {
      stopTyping();
    }
  };

  const loadOlderMessages = () => {
    if (loadingOlder || !connected || !canLoadMore || !oldestMessageIdRef.current) return;
    setLoadingOlder(true);
    if (!fetchOlderMessages(socketRef.current, oldestMessageIdRef.current)) setLoadingOlder(false);
  };

  const sendMessage = () => {
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;
    stopTyping();
    sendTextMessage(socket, text, replyingTo?.id);
    setDraft("");
    setReplyingTo(null);
  };

  const uploadAndSend = async (localId: string, file: File, replyToId?: string) => {
    try {
      const status = await uploadChatImage(chatId, file);
      if (!mountedRef.current) return;
      if (status.status !== "READY") throw new Error("This photo could not be uploaded.");
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Chat isn't connected right now.");
      setPendingUploads((current) =>
        current.map((item) => (item.localId === localId ? { ...item, fileId: status.fileId, uploading: false } : item)),
      );
      sendFileMessage(socket, status.fileId, replyToId);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Upload failed.";
      console.warn("[Chat] photo upload failed", { chatId, message });
      setPendingUploads((current) =>
        current.map((item) => (item.localId === localId ? { ...item, uploading: false, error: message } : item)),
      );
    }
  };

  const pickAndSendImage = () => fileInputRef.current?.click();

  const handleFileSelected = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const replyToId = replyingTo?.id;
    pendingUploadCounterRef.current += 1;
    const localId = `pending-${pendingUploadCounterRef.current}`;
    setPendingUploads((current) => [
      ...current,
      {
        pending: true,
        localId,
        localUrl: URL.createObjectURL(file),
        senderId: viewerId,
        createdAt: new Date().toISOString(),
        uploading: true,
        error: null,
        replyToId,
      },
    ]);
    setReplyingTo(null);
    uploadAndSend(localId, file, replyToId);
  };

  const retryPendingUpload = (item: PendingUpload) => {
    setPendingUploads((current) =>
      current.map((entry) => (entry.localId === item.localId ? { ...entry, uploading: true, error: null } : entry)),
    );
    void fetch(item.localUrl)
      .then((response) => response.blob())
      .then((blob) => uploadAndSend(item.localId, new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }), item.replyToId));
  };

  const dismissPendingUpload = (localId: string) => {
    setPendingUploads((current) => current.filter((item) => item.localId !== localId));
  };

  const resolveAddressForCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`/api/places/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (!response.ok) return "";
      const data = (await response.json()) as { results?: Array<{ formatted_address?: string }> };
      return data.results?.[0]?.formatted_address || "";
    } catch {
      return "";
    }
  };

  const shareCurrentLocation = () => {
    if (sharingLocation || !connected) return;
    setLocationConfirmOpen(true);
  };

  const doShareCurrentLocation = () => {
    setLocationConfirmOpen(false);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location sharing isn't supported in this browser.");
      return;
    }
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!mountedRef.current) return;
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const address = await resolveAddressForCoords(lat, lng);
        if (!mountedRef.current) return;
        const socket = socketRef.current;
        setSharingLocation(false);
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const location: ChatLocation = { lat, lng, address: address || undefined };
        sendLocationMessage(socket, location, replyToId);
      },
      () => {
        if (!mountedRef.current) return;
        setSharingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
    );
  };

  const scrollToMessage = (messageId?: string) => {
    if (!messageId) return;
    document.getElementById(`chat-message-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const replyPreviewText = (message?: ChatMessage) => {
    if (!message) return "Original message";
    if (message.type === "file") return "Photo";
    if (message.type === "location") return "Location";
    return message.text || "";
  };

  const replySenderLabel = (message?: ChatMessage) => (String(message?.senderId) === viewerId ? "You" : counterpart);

  const messagesById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    messages.forEach((item) => {
      if (item.id) map[item.id] = item;
    });
    return map;
  }, [messages]);

  const displayItems: DisplayItem[] = pendingUploads.length ? [...messages, ...pendingUploads] : messages;

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#EDEFF3] text-sm text-[#5A6478]">Loading conversation...</main>;
  if (error || !match) return <main className="grid min-h-screen place-items-center bg-[#EDEFF3] text-sm text-[#5A6478]">{error || "Conversation unavailable."}</main>;

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
        <Link href={`/requests/${id}?role=${role}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#e85b43]">
          <ArrowLeft size={16} /> Back to request
        </Link>
        <section className="mt-6 flex min-h-[min(720px,calc(100vh-190px))] flex-1 flex-col overflow-hidden border border-[#ded8ce] bg-[#F5F7FA] shadow-[0_18px_50px_rgba(20,30,50,0.12)]">
          <div className="flex items-center gap-3 border-b border-[#E4E8F0] bg-white px-5 py-4 sm:px-7">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#171E3A] text-xs font-bold text-[#F5A623]">{initials(counterpart)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><h1 className="truncate font-[Sora,sans-serif] text-lg font-bold text-[#1B2230]">{counterpart}</h1><ShieldCheck size={14} color="#0F6E56" /></div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8991A3]">
                {counterpartTyping ? (
                  <span className="font-semibold text-[#0F6E56]">typing...</span>
                ) : (
                  <>{!isSender && <Star size={10} color="#F5A623" fill="#F5A623" />}{isSender ? "Delivering your package" : "Sender"}</>
                )}
              </div>
            </div>
            <a href={isSender ? `tel:${match.travelerPhone || ""}` : `tel:${match.senderPhone || ""}`} aria-label={`Call ${counterpart}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-white"><Phone size={16} /></a>
          </div>

          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-[#EEF1F6] px-4 py-3 text-sm font-semibold text-[#5A6478] sm:mx-7"><Package size={14} color="#8991A3" /><span className="truncate">{parcelLabel}{routeLabel ? ` · ${routeLabel}` : ""}{!isSender && match.travelerPayoutAmount ? ` · You will earn ₹${match.travelerPayoutAmount}` : ""}</span></div>

          {fatalError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-sm text-sm text-[#8991A3]">{fatalError}</p>
              <button type="button" onClick={retryConnect} className="rounded-full bg-[#F5A623] px-6 py-2.5 text-sm font-bold text-[#181405]">Retry</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-3">
                {canLoadMore && messages.length >= HISTORY_PAGE_SIZE && (
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="mx-auto mb-2 rounded-full border border-[#E4E8F0] bg-white px-4 py-1.5 text-xs font-semibold text-[#8991A3] disabled:opacity-60"
                  >
                    {loadingOlder ? "Loading..." : "Load earlier messages"}
                  </button>
                )}
                {!displayItems.length && <p className="my-auto text-center text-sm text-[#8991A3]">Start the conversation</p>}
                {displayItems.map((item, index) => {
                  const mine = String(item.senderId) === viewerId;
                  const key = isPending(item) ? item.localId : item.id || String(index);
                  const replyToId = item.replyToId;
                  const original = replyToId ? messagesById[replyToId] : undefined;
                  return (
                    <div key={key} id={!isPending(item) ? `chat-message-${item.id}` : undefined} className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && (
                        <span className="grid size-7 shrink-0 place-items-center self-end rounded-full bg-[#171E3A] text-[9px] font-bold text-[#F5A623]">{initials(counterpart)}</span>
                      )}
                      {mine && !isPending(item) && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(item)}
                          aria-label="Reply to this message"
                          className="hidden size-7 shrink-0 place-items-center self-end rounded-full text-[#8991A3] hover:bg-white group-hover:grid"
                        >
                          <Reply size={14} />
                        </button>
                      )}
                      <div
                        className={`max-w-[min(78%,560px)] rounded-2xl text-sm leading-6 ${
                          isPending(item) || item.type === "file" || item.type === "location" ? "p-1.5" : "px-4 py-3"
                        } ${mine ? "text-white" : "border border-[#E4E8F0] bg-white text-[#1B2230]"}`}
                        style={mine ? { backgroundColor: myBubbleColor } : undefined}
                      >
                        {replyToId && (
                          <button
                            type="button"
                            onClick={() => scrollToMessage(replyToId)}
                            className={`mb-1 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs ${
                              mine ? "border-[#F5A623] bg-white/10" : "border-[#0F6E56] bg-[#0F6E56]/10"
                            }`}
                          >
                            <span className={`block font-bold ${mine ? "text-[#F5A623]" : "text-[#0F6E56]"}`}>{replySenderLabel(original)}</span>
                            <span className={`block truncate ${mine ? "text-white/75" : "text-[#657086]"}`}>{replyPreviewText(original)}</span>
                          </button>
                        )}

                        {isPending(item) ? (
                          <div>
                            <div className="relative size-[190px] overflow-hidden rounded-xl bg-[#EEF1F6]">
                              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                              <img src={item.localUrl} alt="Sending" className="size-full object-cover" />
                              {(item.uploading || item.error) && (
                                <div className="absolute inset-0 grid place-items-center bg-black/35">
                                  {item.uploading ? (
                                    <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <AlertTriangle size={20} color="#FFFFFF" />
                                  )}
                                </div>
                              )}
                            </div>
                            {item.error && (
                              <div className="flex gap-4 px-1.5 pt-1.5">
                                <button type="button" onClick={() => retryPendingUpload(item)} className="text-xs font-bold text-[#B42318]">Retry</button>
                                <button type="button" onClick={() => dismissPendingUpload(item.localId)} className="text-xs font-bold text-[#B42318]">Remove</button>
                              </div>
                            )}
                          </div>
                        ) : item.type === "file" ? (
                          (() => {
                            const url = item.fileId ? fileUrls[item.fileId] : undefined;
                            return (
                              <button
                                type="button"
                                onClick={() => url && setViewerUrl(url)}
                                disabled={!url}
                                className="block size-[190px] overflow-hidden rounded-xl bg-[#EEF1F6]"
                                aria-label="View photo"
                              >
                                {url ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL
                                  <img src={url} alt="Shared photo" className="size-full object-cover" />
                                ) : (
                                  <span className="grid size-full place-items-center text-xs text-[#8991A3]">
                                    {url === null ? <AlertTriangle size={18} /> : "Loading..."}
                                  </span>
                                )}
                              </button>
                            );
                          })()
                        ) : item.type === "location" ? (
                          <button
                            type="button"
                            onClick={() => item.location && openInMaps(item.location.lat, item.location.lng)}
                            className="flex max-w-[220px] items-center gap-2.5 px-1.5 py-0.5 text-left"
                          >
                            <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-[#E7F3EC]"><MapPin size={15} color="#0F6E56" /></span>
                            <span className="min-w-0">
                              <span className={`block truncate text-xs font-semibold ${mine ? "text-white" : "text-[#1B2230]"}`}>{item.location?.address || "Shared location"}</span>
                              <span className={`block text-[10.5px] font-bold ${mine ? "text-[#F5A623]" : "text-[#0F6E56]"}`}>Open in Maps</span>
                            </span>
                          </button>
                        ) : (
                          <span className={!mine ? "px-2.5" : "px-2.5 text-white"}>{item.type && item.type !== "text" ? "Unsupported message type" : item.text}</span>
                        )}

                        {!isPending(item) && (
                          <div className={`px-2.5 pb-1 pt-1 text-right text-[11px] ${mine ? "text-white/60" : "text-[#B0B7C6]"}`}>{formatTime(item.createdAt)}</div>
                        )}
                      </div>
                      {!mine && !isPending(item) && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(item)}
                          aria-label="Reply to this message"
                          className="hidden size-7 shrink-0 place-items-center self-end rounded-full text-[#8991A3] hover:bg-white group-hover:grid"
                        >
                          <Reply size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {!fatalError && replyingTo && (
            <div className="mx-5 mt-2 flex items-center gap-2 rounded-xl border-l-4 border-[#0F6E56] bg-[#EEF1F6] px-4 py-2.5 sm:mx-7">
              <Reply size={14} color="#5A6478" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#0F6E56]">Replying to {replySenderLabel(replyingTo)}</p>
                <p className="truncate text-xs text-[#5A6478]">{replyPreviewText(replyingTo)}</p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply" className="grid size-6 shrink-0 place-items-center rounded-full text-[#5A6478] hover:bg-white">
                <X size={15} />
              </button>
            </div>
          )}

          {!fatalError && (
            <div className="border-t border-[#E4E8F0] bg-white px-5 py-4 sm:px-7">
              <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFileSelected(event.target.files)} />
                <button type="button" onClick={pickAndSendImage} disabled={!connected} aria-label="Send a photo" className="grid size-10 shrink-0 place-items-center rounded-full text-[#5A6478] hover:bg-[#F5F7FA] disabled:opacity-40">
                  <ImagePlus size={17} />
                </button>
                <button type="button" onClick={shareCurrentLocation} disabled={!connected || sharingLocation} aria-label="Share your location" className="grid size-10 shrink-0 place-items-center rounded-full text-[#5A6478] hover:bg-[#F5F7FA] disabled:opacity-40">
                  {sharingLocation ? <span className="size-4 animate-spin rounded-full border-2 border-[#5A6478] border-t-transparent" /> : <Navigation size={16} />}
                </button>
                <input
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onBlur={stopTyping}
                  onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                  disabled={!connected}
                  placeholder={`Message ${counterpart.split(" ")[0]}...`}
                  className="min-w-0 flex-1 rounded-xl border border-[#E4E8F0] bg-[#F5F7FA] px-4 py-3 text-sm outline-none focus:border-[#e85b43] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button type="button" onClick={sendMessage} disabled={!connected || !draft.trim()} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F5A623] text-white disabled:opacity-45">
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />

      {viewerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={() => setViewerUrl(null)} role="presentation">
          <button type="button" onClick={() => setViewerUrl(null)} aria-label="Close photo" className="absolute right-6 top-6 grid size-10 place-items-center rounded-full bg-white/15 text-white">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL */}
          <img src={viewerUrl} alt="Shared photo" className="max-h-[85vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      <ConfirmModal
        open={locationConfirmOpen}
        title="Share your current location?"
        message={`${counterpart} will see where you are right now.`}
        confirmLabel="Share"
        onConfirm={doShareCurrentLocation}
        onCancel={() => setLocationConfirmOpen(false)}
      />
    </div>
  );
}
