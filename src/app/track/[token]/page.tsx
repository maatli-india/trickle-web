"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CircleCheck,
  Clock,
  KeyRound,
  Link2Off,
  Phone,
  RefreshCw,
  Smartphone,
  Undo2,
  WifiOff,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreButtons } from "@/components/layout/store-buttons";
import { appStoreUrl, playStoreUrl } from "@/lib/app-links";
import { getParcelTracking, type ParcelTracking } from "@/services/tracking";

// Public parcel-tracking page (trickle-web/.../track/<token>), opened by the
// parcel's recipient from a link the sender shared — usually on a phone, no
// Trickle account, often no app. Shows the parcel's progress and, once the
// traveller has it, the 4-digit delivery code the recipient reads out only
// when the parcel is in their hands. Contract: GET /v1/track/{token}.

const POLL_MS = 20_000;

// Statuses where nothing more will change on its own — stop polling.
// Anything else (including statuses this page doesn't know yet) keeps polling.
const SETTLED_STATUSES = new Set(["delivered", "returning", "returned", "cancelled"]);

const shouldPoll = (data: ParcelTracking) =>
  data.codeStatus === "awaiting_payment" || !SETTLED_STATUSES.has(data.status);

// Loose shape check (real tokens are 43-char base64url) so obviously broken
// links don't hit the API at all.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: ParcelTracking; stale: boolean }
  | { kind: "not_found" }
  | { kind: "error"; rateLimited: boolean };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatClock = (hours: number, minutes: number) =>
  `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "pm" : "am"}`;

// "2026-11-25 18:30:00" → "25 Nov, 6:30 pm". A trip wall-clock time: built
// from its own parts, with no timezone conversion.
const formatWallClock = (value?: string) => {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, , month, day, hours, minutes] = match.map(Number);
  if (month < 1 || month > 12) return null;
  return `${day} ${MONTHS[month - 1]}, ${formatClock(hours, minutes)}`;
};

// RFC3339 instant → the viewer's local time, e.g. "25 Nov, 1:40 pm".
const formatInstant = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${formatClock(date.getHours(), date.getMinutes())}`;
};

const STEPS = ["Picked up", "On the way", "Arriving", "Delivered"] as const;

// Index of the furthest step reached; -1 = not picked up yet; null = no stepper.
const reachedStep = (status: string): number | null => {
  switch (status) {
    case "awaiting_pickup":
      return -1;
    case "on_the_way":
    case "delayed":
      return 1;
    case "arriving":
    case "awaiting_recipient":
      return 2;
    case "delivered":
      return 3;
    default:
      return null;
  }
};

const statusSummary = (data: ParcelTracking) => {
  const traveller = data.travellerFirstName || "The traveller";
  switch (data.status) {
    case "awaiting_pickup":
      return `Waiting for ${traveller} to pick up the parcel.`;
    case "on_the_way":
      return "The parcel is on the way.";
    case "arriving":
      return `${traveller} is heading to the drop-off.`;
    case "delayed":
      return "The traveller reported a delay.";
    case "awaiting_recipient":
      return `${traveller} is at the drop-off.`;
    case "delivered":
      return "The parcel has been delivered.";
    case "returning":
      return "The parcel is going back to the sender.";
    case "returned":
      return "The parcel was returned to the sender.";
    case "cancelled":
      return "This delivery was cancelled.";
    default:
      return "";
  }
};

// One short sentence for screen readers; only re-announced when it changes.
const announcement = (state: LoadState) => {
  if (state.kind === "not_found") return "This tracking link has expired or isn't valid.";
  if (state.kind === "error") return "Couldn't load the parcel's status.";
  if (state.kind !== "ready") return "";
  const { data } = state;
  const code =
    data.codeStatus === "available" && data.otp ? ` Your delivery code is ${data.otp.split("").join(" ")}.` : "";
  return `${statusSummary(data)}${code}`;
};

export default function ParcelTrackingPage() {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const token = rawToken && TOKEN_PATTERN.test(rawToken) ? rawToken : null;

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Bumped by "Try again" to restart the fetch/poll loop.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let hasData = false;
    let keepPolling = true;
    let gone = false; // 404 — terminal

    const schedule = () => {
      clearTimeout(timer);
      if (cancelled || gone || !hasData || !keepPolling || document.hidden) return;
      timer = setTimeout(load, POLL_MS);
    };

    async function load() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await getParcelTracking(token!);
        if (cancelled) return;
        hasData = true;
        keepPolling = shouldPoll(data);
        setState({ kind: "ready", data, stale: false });
      } catch (error) {
        if (cancelled) return;
        const status = (error as { status?: number }).status;
        if (status === 404) {
          gone = true;
          setState({ kind: "not_found" });
          return;
        }
        // Keep the last good data on screen; only show the error page if
        // there's nothing to show yet (polling stops until "Try again").
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, stale: true } : { kind: "error", rateLimited: status === 429 },
        );
      } finally {
        inFlight = false;
        schedule();
      }
    }

    // Pause while the tab is hidden; refresh right away when it comes back
    // (the recipient is often returning from a UPI app with a fresh code).
    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else if (hasData && keepPolling && !gone) {
        clearTimeout(timer);
        void load();
      }
    };

    void load();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, attempt]);

  const view: LoadState = token ? state : { kind: "not_found" };

  const retry = () => {
    setState({ kind: "loading" });
    setAttempt((value) => value + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
        <p className="sr-only" role="status" aria-live="polite">
          {announcement(view)}
        </p>
        {view.kind === "loading" && <LoadingView />}
        {view.kind === "not_found" && (
          <MessageCard
            icon={Link2Off}
            title="Link not available"
            body="This tracking link has expired or isn't valid. Ask the sender for a new one."
          />
        )}
        {view.kind === "error" && (
          <MessageCard
            icon={WifiOff}
            title="Couldn't load this parcel"
            body={
              view.rateLimited
                ? "Too many requests right now. Please wait a moment and try again."
                : "Check your internet connection and try again."
            }
          >
            <button
              type="button"
              onClick={retry}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b3a]"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
          </MessageCard>
        )}
        {view.kind === "ready" && <TrackingView data={view.data} stale={view.stale} />}
        {view.kind !== "loading" && <AppSection token={view.kind === "ready" ? token : null} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadingView() {
  return (
    <div aria-busy="true" className="animate-pulse space-y-4">
      <span className="sr-only">Loading parcel status…</span>
      <div className="h-4 w-28 rounded bg-[#e6e0d5]" />
      <div className="h-9 w-3/4 rounded bg-[#e6e0d5]" />
      <div className="h-5 w-1/2 rounded bg-[#e6e0d5]" />
      <div className="mt-6 h-44 rounded-2xl bg-[#e6e0d5]" />
      <div className="h-24 rounded-2xl bg-[#e6e0d5]" />
    </div>
  );
}

function MessageCard({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#ded8ce] bg-white px-6 py-10 text-center shadow-[0_20px_40px_-28px_rgba(24,59,58,0.2)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff0eb] text-[#e85b43]">
        <Icon size={24} aria-hidden={true} />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-[#183b3a]">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-base leading-7 text-[#62645f]">{body}</p>
      {children}
    </div>
  );
}

function TrackingView({ data, stale }: { data: ParcelTracking; stale: boolean }) {
  const traveller = data.travellerFirstName || "the traveller";
  const sender = data.senderFirstName || "a Trickle sender";
  const plannedArrival = formatWallClock(data.plannedArrival);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Parcel tracking</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
          Parcel from {sender}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-base font-medium text-[#183b3a]">
          <span>{data.fromCity}</span>
          <ArrowRight size={16} aria-hidden="true" />
          <span className="sr-only">to</span>
          <span>{data.toCity}</span>
        </p>
        <p className="mt-1 text-sm text-[#62645f]">
          Carried by {traveller}
          {plannedArrival && data.status !== "delivered" ? ` · Planned arrival: ${plannedArrival}` : ""}
        </p>
      </header>

      {stale && (
        <p className="flex items-center gap-2 rounded-xl bg-[#faeeda] px-4 py-2.5 text-sm text-[#7a5310]">
          <WifiOff size={16} aria-hidden="true" />
          Couldn&apos;t refresh — showing the last update. We&apos;ll keep trying.
        </p>
      )}

      <StatusBanner data={data} traveller={traveller} />
      <CodeCard data={data} traveller={traveller} />
      <Stepper data={data} />
      <Faq />
    </div>
  );
}

function StatusBanner({ data, traveller }: { data: ParcelTracking; traveller: string }) {
  const banner = (() => {
    switch (data.status) {
      case "delayed":
        return {
          icon: AlertTriangle,
          tone: "bg-[#faeeda] text-[#7a5310] border-[#efd9b0]",
          text: "The traveller reported a delay. We'll update this page.",
        };
      case "awaiting_recipient":
        return {
          icon: Phone,
          tone: "bg-[#fff0eb] text-[#a63a26] border-[#f6cfc4]",
          text: `${capitalise(traveller)} is at the drop-off and is trying to reach you.`,
        };
      case "returning":
      case "returned":
        return {
          icon: Undo2,
          tone: "bg-[#faeeda] text-[#7a5310] border-[#efd9b0]",
          text: "This parcel couldn't be delivered and is going back to the sender.",
        };
      case "cancelled":
        return {
          icon: Ban,
          tone: "bg-[#efece6] text-[#4a4c48] border-[#ded8ce]",
          text: "This delivery was cancelled.",
        };
      default:
        return null;
    }
  })();
  if (!banner) return null;
  const Icon = banner.icon;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-base font-medium ${banner.tone}`}>
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{banner.text}</p>
    </div>
  );
}

function CodeCard({ data, traveller }: { data: ParcelTracking; traveller: string }) {
  const Traveller = capitalise(traveller);
  const settled = data.status === "returning" || data.status === "returned" || data.status === "cancelled";

  if (data.codeStatus === "available" && data.otp) {
    const digits = data.otp.split("");
    return (
      <section
        aria-labelledby="code-heading"
        className="overflow-hidden rounded-2xl bg-[#183b3a] text-white shadow-[0_24px_48px_-28px_rgba(24,59,58,0.6)]"
      >
        <div className="px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
          <h2 id="code-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#c5d4ce]">
            <KeyRound size={16} aria-hidden="true" />
            Delivery code
          </h2>
          <p className="mt-4 flex justify-center gap-2.5 sm:gap-4">
            <span className="sr-only">Delivery code: {digits.join(" ")}</span>
            {digits.map((digit, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="grid h-20 w-16 place-items-center rounded-xl bg-white/10 font-mono text-5xl font-semibold tabular-nums ring-1 ring-white/20 sm:h-24 sm:w-20 sm:text-6xl"
              >
                {digit}
              </span>
            ))}
          </p>
        </div>
        <p className="bg-[#e85b43] px-5 py-3.5 text-center text-base font-semibold leading-6 sm:px-8">
          Tell {Traveller} this code only when the parcel is in your hands.
        </p>
      </section>
    );
  }

  const message = (() => {
    switch (data.codeStatus) {
      case "not_yet":
        return { icon: Clock, text: `Your code will appear here once ${Traveller} picks up the parcel.` };
      case "awaiting_payment":
        return {
          icon: Smartphone,
          text: `Pay ${Traveller}'s UPI QR at delivery — your code appears here as soon as the payment goes through.`,
        };
      case "used":
        return { icon: CircleCheck, text: "Delivered — the code has been used." };
      default:
        // "none" (or unknown): nothing to show unless the delivery has ended,
        // where the banner above already explains — still note the code is gone.
        return settled ? { icon: KeyRound, text: "No delivery code is needed for this parcel any more." } : null;
    }
  })();
  if (!message) return null;
  const Icon = message.icon;
  const used = data.codeStatus === "used";
  return (
    <section
      aria-labelledby="code-heading"
      className="rounded-2xl border border-[#ded8ce] bg-white px-5 py-5 sm:px-8 sm:py-6"
    >
      <h2 id="code-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#62645f]">
        <KeyRound size={16} aria-hidden="true" />
        Delivery code
      </h2>
      <div className="mt-4 flex items-start gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${used ? "bg-[#e3efe9] text-[#285c59]" : "bg-[#fff0eb] text-[#e85b43]"}`}
        >
          <Icon size={22} aria-hidden="true" />
        </span>
        <p className="text-base leading-7 text-[#1b1d1c]">{message.text}</p>
      </div>
      {!used && !settled && (
        <p className="mt-4 flex justify-center gap-2.5" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="grid h-14 w-12 place-items-center rounded-xl border border-dashed border-[#d3ccc0] font-mono text-2xl text-[#bbb6ad]"
            >
              •
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

function Stepper({ data }: { data: ParcelTracking }) {
  const reached = reachedStep(data.status);
  if (reached === null) return null;
  const times: Partial<Record<(typeof STEPS)[number], string | null>> = {
    "Picked up": formatInstant(data.pickedUpAt),
    Delivered: formatInstant(data.deliveredAt),
  };
  const problem = data.status === "delayed" || data.status === "awaiting_recipient";

  return (
    <section aria-labelledby="progress-heading" className="rounded-2xl border border-[#ded8ce] bg-white px-5 py-5 sm:px-8 sm:py-6">
      <h2 id="progress-heading" className="text-sm font-semibold uppercase tracking-[0.16em] text-[#62645f]">
        Progress
      </h2>
      <p className="mt-2 text-base font-medium text-[#183b3a]">{statusSummary(data)}</p>
      <ol className="mt-5 space-y-0">
        {STEPS.map((label, index) => {
          const done = index < reached || (index === reached && label === "Delivered");
          const current = index === reached && label !== "Delivered";
          const isLast = index === STEPS.length - 1;
          const time = times[label];
          return (
            <li key={label} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${index < reached ? "bg-[#183b3a]" : "bg-[#ded8ce]"}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-[#183b3a] text-white"
                    : current
                      ? problem
                        ? "bg-[#e85b43] text-white ring-4 ring-[#fff0eb]"
                        : "bg-[#183b3a] text-white ring-4 ring-[#dfe9e5]"
                      : "border-2 border-[#ded8ce] bg-white text-[#9a978f]"
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-base ${done || current ? "font-semibold text-[#1b1d1c]" : "text-[#77766f]"}`}>
                  {label}
                  <span className="sr-only">{done ? " (done)" : current ? " (current)" : " (not yet)"}</span>
                </p>
                {time && (done || current) && <p className="text-sm text-[#62645f]">{time}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "What is the delivery code?",
    a: <>A 4-digit code that confirms you received the parcel.</>,
  },
  {
    q: "How do I use it?",
    a: (
      <>
        When the traveller hands you the parcel, check it, then tell them the code. They enter it in the app to complete
        the delivery.
      </>
    ),
  },
  {
    q: "What if there's a problem?",
    a: (
      <>
        Never share the code before you have the parcel. If something&apos;s wrong, don&apos;t give the code and{" "}
        <Link href="/support" className="font-semibold text-[#183b3a] underline underline-offset-2 hover:text-[#285c59]">
          contact Trickle support
        </Link>
        .
      </>
    ),
  },
];

function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="pt-4">
      <h2 id="faq-heading" className="text-xl font-semibold tracking-[-0.02em] text-[#183b3a]">
        What is this code?
      </h2>
      <dl className="mt-4 divide-y divide-[#ded8ce] border-y border-[#ded8ce]">
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="py-4">
            <dt className="text-base font-semibold text-[#1b1d1c]">{item.q}</dt>
            <dd className="mt-1 text-base leading-7 text-[#62645f]">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AppSection({ token }: { token: string | null }) {
  const storesLive = Boolean(appStoreUrl || playStoreUrl);
  return (
    <section aria-labelledby="app-heading" className="mt-10 rounded-2xl bg-[#ebe5da] px-5 py-6 sm:px-8">
      <h2 id="app-heading" className="text-lg font-semibold text-[#183b3a]">
        {token ? "Have the Trickle app?" : "Get the Trickle app"}
      </h2>
      {token && (
        // A tap, never an automatic redirect: the page must work for people
        // without the app, and in-app browsers block scripted scheme jumps.
        <a
          href={`trickle://track/${encodeURIComponent(token)}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#183b3a] px-5 py-3.5 text-base font-semibold text-white hover:bg-[#285c59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183b3a] sm:w-auto sm:inline-flex"
        >
          <Smartphone size={18} aria-hidden="true" />
          Open in the Trickle app
        </a>
      )}
      {storesLive ? (
        <>
          <p className="mt-5 text-sm text-[#62645f]">Don&apos;t have it yet? Send parcels with travellers already heading your way.</p>
          <StoreButtons className="mt-3" />
        </>
      ) : (
        <p className="mt-4 text-sm text-[#62645f]">
          The Trickle app is coming soon to the App Store and Google Play.
        </p>
      )}
    </section>
  );
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
