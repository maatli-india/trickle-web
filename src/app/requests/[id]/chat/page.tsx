"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Package, Phone, Send, ShieldCheck, Star } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { extractOneItem, type ParcelMatch } from "@/types/travel";
import { getParcelMatch } from "@/services/parcel-matches";
import { getChatMessages, getChatShortToken, type ChatMessage } from "@/services/chat";
import { apiRequest } from "@/services/api-client";
import { siteConfig } from "@/lib/config";

const sortMessages = (items: ChatMessage[]) =>
  [...items].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

const initials = (name: string) =>
  name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "traveller" ? "traveller" : "sender";
  const isSender = role === "sender";
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [match, setMatch] = useState<ParcelMatch | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return () => { active = false; };
  }, [id]);

  const chatId = match?.chatId ? String(match.chatId) : id;
  useEffect(() => {
    if (!match) return undefined;
    let active = true;
    getChatMessages(chatId)
      .then((response) => {
        if (!active) return;
        setMessages(sortMessages(response.items || response.data?.items || []));
      })
      .catch(() => undefined);

    getChatShortToken()
      .then((response) => {
        const token = response.accessToken || response.token?.accessToken;
        if (!token || !active) return;
        const wsUrl = siteConfig.apiBaseUrl.replace(/^http/, "ws") + `/v1/chats/${encodeURIComponent(chatId)}/ws?access_token=${encodeURIComponent(token)}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        socket.onopen = () => active && setConnected(true);
        socket.onclose = () => active && setConnected(false);
        socket.onerror = () => active && setConnected(false);
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as ChatMessage | { type?: string; data?: ChatMessage };
            const message = "data" in payload && payload.type === "message" ? payload.data : payload as ChatMessage;
            if (!message?.id) return;
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
          } catch { /* Ignore malformed socket events. */ }
        };
      })
      .catch(() => undefined);

    return () => {
      active = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [chatId, match]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const counterpart = useMemo(() => {
    if (!match) return isSender ? "Traveller" : "Sender";
    return (isSender ? match.travelerName : match.senderName) || (isSender ? "Traveller" : "Sender");
  }, [isSender, match]);
  const parcelLabel = match?.parcelDescription || match?.parcelCategory || "Parcel";
  const routeLabel = match?.from?.address && match?.to?.address ? `${match.from.address} -> ${match.to.address}` : "";
  const myBubbleColor = isSender ? "#101828" : "#0F6E56";

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "text", text }));
    setDraft("");
  };

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
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8991A3]">{!isSender && <Star size={10} color="#F5A623" fill="#F5A623" />}{isSender ? "Delivering your package" : "Sender"}</div>
            </div>
            <a href={isSender ? `tel:${match.travelerPhone || ""}` : `tel:${match.senderPhone || ""}`} aria-label={`Call ${counterpart}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-white"><Phone size={16} /></a>
          </div>
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-[#EEF1F6] px-4 py-3 text-sm font-semibold text-[#5A6478] sm:mx-7"><Package size={14} color="#8991A3" /><span className="truncate">{parcelLabel}{routeLabel ? ` · ${routeLabel}` : ""}{!isSender && match.agreedPrice ? ` · You will earn ₹${match.agreedPrice}` : ""}</span></div>
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-3">
              {messages.map((message) => {
                const mine = String(message.senderId) === viewerId;
                return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[min(78%,560px)] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "text-white" : "border border-[#E4E8F0] bg-white text-[#1B2230]"}`} style={mine ? { backgroundColor: myBubbleColor } : undefined}>{message.text}<div className={`mt-1 text-right text-[11px] ${mine ? "text-white/60" : "text-[#B0B7C6]"}`}>{formatTime(message.createdAt)}</div></div></div>;
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t border-[#E4E8F0] bg-white px-5 py-4 sm:px-7">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
              <button type="button" aria-label="Add photo" className="grid size-10 shrink-0 place-items-center rounded-full text-[#8991A3] hover:bg-[#F5F7FA]"><ImageIcon size={18} /></button>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} disabled={!connected} placeholder={`Message ${counterpart.split(" ")[0]}...`} className="min-w-0 flex-1 rounded-xl border border-[#E4E8F0] bg-[#F5F7FA] px-4 py-3 text-sm outline-none focus:border-[#e85b43] disabled:cursor-not-allowed disabled:opacity-60" />
              <button type="button" onClick={sendMessage} disabled={!connected} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F5A623] text-white disabled:opacity-45"><Send size={16} /></button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
