"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { listParcelMatches, respondToCounterOffer } from "@/services/parcel-matches";
import { extractListItems, type ParcelMatch } from "@/types/travel";
import { bucketRequestStatus, effectiveStatus, formatMoney, getRequestStatusLabel, relevantMatchDate } from "@/lib/parcel-status";
import { avatarTint, initials } from "@/lib/home-constants";

type Tab = "sent" | "received";

const DECLINE_REASONS = ["Already at capacity", "Route or timing doesn't work", "Other"];

export default function RequestsPage() {
  const [tab, setTab] = useState<Tab>("sent");
  const [sent, setSent] = useState<ParcelMatch[]>([]);
  const [received, setReceived] = useState<ParcelMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      listParcelMatches({ side: "sender", page: 1, limit: 100 }),
      listParcelMatches({ side: "traveler", page: 1, limit: 100 }),
    ]).then(([sentResult, receivedResult]) => {
      if (sentResult.status === "fulfilled") setSent(extractListItems<ParcelMatch>(sentResult.value as never));
      if (receivedResult.status === "fulfilled") setReceived(extractListItems<ParcelMatch>(receivedResult.value as never));
      if (sentResult.status === "rejected" && receivedResult.status === "rejected") setError("We could not load your requests right now.");
      setLoading(false);
    });
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const rows = tab === "sent" ? sent : received;
  const role = tab === "sent" ? "sender" : "traveller";

  const grouped = useMemo(() => {
    const upcoming: ParcelMatch[] = [];
    const past: ParcelMatch[] = [];
    rows.forEach((request) => {
      const status = effectiveStatus(request.status, relevantMatchDate(request));
      const bucket = bucketRequestStatus(status);
      if (["pending", "confirmed", "in_transit"].includes(bucket)) upcoming.push(request);
      else past.push(request);
    });
    return { upcoming, past };
  }, [rows]);

  const needsResponseCount = received.filter((request) => bucketRequestStatus(effectiveStatus(request.status, relevantMatchDate(request))) === "pending" && String(request.status).toLowerCase() === "pending").length;
  const searchingCount = sent.filter((request) => String(request.status).toLowerCase() === "pending" || String(request.status).toLowerCase() === "negotiating").length;

  const accept = async (matchId: string) => {
    setBusyId(matchId);
    try {
      await respondToCounterOffer(matchId, "accept");
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not accept this request.");
    } finally {
      setBusyId(null);
    }
  };

  const decline = async () => {
    if (!declineFor) return;
    setBusyId(declineFor);
    try {
      await respondToCounterOffer(declineFor, "reject", declineReason || undefined);
      setDeclineFor(null);
      setDeclineReason("");
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not decline this request.");
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (request: ParcelMatch) => {
    const status = effectiveStatus(request.status, relevantMatchDate(request));
    const label = status === "expired" ? "Expired" : getRequestStatusLabel(request.status, role);
    const hasCounterOffer = tab === "received" && (request.offerHistory?.length || 0) > 1;
    const canRespond =
      tab === "received" &&
      ["pending", "countered"].includes(String(request.status).toLowerCase());
    const counterpart = tab === "sent" ? request.travelerName || "Traveller" : request.senderName || "Sender";
    return (
      <div key={request.id} className="border border-[#ded8ce] bg-[#fbfaf7] p-4">
        <Link href={`/requests/${request.id}?role=${role}`} className="block">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{ backgroundColor: avatarTint(counterpart).bg, color: avatarTint(counterpart).fg }}
              >
                {initials(counterpart)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#183b3a]">{counterpart}</p>
                <p className="mt-1 truncate text-sm text-[#62645f]">{request.parcelDescription || request.parcelCategory || "Parcel request"}</p>
                <p className="mt-2 truncate text-xs text-[#62645f]">
                  {request.from?.address || "Pickup"} <span className="px-1 text-[#e85b43]">→</span> {request.to?.address || "Destination"}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold text-[#285c59]">{formatMoney(request.agreedPrice || request.baseAmount)}</p>
          </div>
          <span className="mt-3 inline-block rounded-full bg-[#e5f0eb] px-3 py-1 text-xs font-semibold text-[#285c59]">{label}</span>
        </Link>
        {canRespond && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => setDeclineFor(request.id)}
              className="flex-1 rounded-lg border border-[#d7d2c9] py-2 text-sm font-semibold text-[#62645f] disabled:opacity-60"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => {
                if (hasCounterOffer) {
                  window.location.href = `/requests/${request.id}?role=sender`;
                  return;
                }
                accept(request.id);
              }}
              className="flex-1 rounded-lg bg-[#183b3a] py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busyId === request.id ? "Accepting..." : hasCounterOffer ? "Review counter" : "Accept"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f2eb] text-[#1b1d1c]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl flex-1 px-5 pb-32 sm:px-8">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ded8ce] py-12 sm:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e85b43]">Your parcels</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Requests</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#62645f]">Track parcels you&apos;ve sent and requests other senders have made for your trips.</p>
          </div>
          <Link href="/requests/new" className="rounded-full bg-[#e85b43] px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf4935]">
            Send a parcel
          </Link>
        </section>

        <div className="flex gap-2 py-8">
          <button
            onClick={() => setTab("sent")}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === "sent" ? "border-[#183b3a] bg-[#183b3a] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a]"}`}
          >
            Sent{searchingCount > 0 ? ` · ${searchingCount} searching` : ""}
          </button>
          <button
            onClick={() => setTab("received")}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === "received" ? "border-[#183b3a] bg-[#183b3a] text-white" : "border-[#d7d2c9] bg-white text-[#183b3a]"}`}
          >
            Received{needsResponseCount > 0 ? ` · ${needsResponseCount} needs response` : ""}
          </button>
        </div>

        {loading && <p className="text-sm text-[#62645f]">Loading your requests...</p>}
        {error && <p role="alert" className="rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        {!loading && !error && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-[#183b3a]">Upcoming</h2>
              {grouped.upcoming.length ? <div className="space-y-3">{grouped.upcoming.map(renderCard)}</div> : <p className="text-sm text-[#62645f]">Nothing in progress right now.</p>}
            </div>
            {grouped.past.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-[#183b3a]">Past requests</h2>
                <div className="space-y-3">{grouped.past.map(renderCard)}</div>
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmModal
        open={Boolean(declineFor)}
        title="Decline this request?"
        confirmLabel={busyId === declineFor ? "Declining..." : "Decline request"}
        cancelLabel="Go back"
        destructive
        loading={busyId === declineFor}
        onCancel={() => setDeclineFor(null)}
        onConfirm={decline}
      >
        <div className="mt-4 space-y-2">
          {DECLINE_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setDeclineReason(reason)}
              className={`block w-full rounded-lg border px-4 py-2 text-left text-sm ${declineReason === reason ? "border-[#e85b43] bg-[#fff0eb]" : "border-[#d7d2c9]"}`}
            >
              {reason}
            </button>
          ))}
        </div>
      </ConfirmModal>
      <SiteFooter />
    </div>
  );
}
