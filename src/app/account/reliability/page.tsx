"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Award, CheckCircle2, Clock, PackageCheck, ShieldCheck, XCircle } from "lucide-react";
import { AccountPage } from "@/components/account/account-page";
import { getMyReliability, type ReliabilityDetail } from "@/services/reliability";

type EventTone = "good" | "bad" | "neutral";
const EVENT_META: Record<string, { label: string; icon: typeof ShieldCheck; tone: EventTone }> = {
  trip_completed: { label: "Trip completed", icon: PackageCheck, tone: "good" },
  request_completed: { label: "Request completed", icon: CheckCircle2, tone: "good" },
  late_cancellation: { label: "Late cancellation", icon: Clock, tone: "bad" },
  trip_cancelled_with_requests: { label: "Trip cancelled with active requests", icon: XCircle, tone: "bad" },
  unverified_emergency_cancellation: { label: "Emergency cancellation", icon: AlertTriangle, tone: "bad" },
  sender_no_show: { label: "Sender no-show", icon: XCircle, tone: "bad" },
};
const toneClass: Record<EventTone, { bg: string; fg: string }> = {
  good: { bg: "#e1f5ee", fg: "#0f6e56" },
  bad: { bg: "#faece7", fg: "#b33a2e" },
  neutral: { bg: "#eef1f6", fg: "#5a6478" },
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ReliabilityPage() {
  const [detail, setDetail] = useState<ReliabilityDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyReliability()
      .then(setDetail)
      .catch(() => setError("Could not load your reliability score."))
      .finally(() => setLoading(false));
  }, []);

  const isNew = detail?.tier === "new";
  const isHighlyReliable = Boolean(detail?.badge?.highlyReliable);
  const tripsRemaining = Math.max(0, (detail?.minTripsRequired || 0) - (detail?.completedCount || 0));
  const scoreGap = Math.max(0, (detail?.scoreThreshold || 0) - (detail?.score || 0));

  const heroTitle = isHighlyReliable ? "Highly Reliable" : isNew ? "You're just getting started" : "Building your reliability";
  const heroSubtitle = isHighlyReliable
    ? "Senders and travelers can see you consistently follow through."
    : isNew
      ? `Complete ${tripsRemaining} more trip${tripsRemaining === 1 ? "" : "s"} to unlock a reliability score other people can see.`
      : scoreGap > 0
        ? `Keep completing trips and requests on time — you're ${Math.ceil(scoreGap)} points from the Highly Reliable badge.`
        : "Keep it up — completing trips and requests on time keeps this score high.";

  return (
    <AccountPage title="Reliability score" description="How senders and travelers see you based on completed trips, on-time handoffs, and ratings.">
      <div className="max-w-2xl">
        {loading && <p className="text-sm text-[#62645f]">Loading your reliability score...</p>}
        {!loading && error && <p role="alert" className="rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}

        {!loading && !error && detail && (
          <>
            <div className="flex flex-col items-center rounded-[22px] bg-[#171e3a] px-6 py-8 text-center">
              {isHighlyReliable ? (
                <span className="grid size-[92px] place-items-center rounded-full bg-[#f5a623]"><Award size={30} className="text-[#3b2400]" /></span>
              ) : (
                <span className="flex size-[92px] items-center justify-center rounded-full border-[3px] border-[#f5a623]">
                  <span className="text-3xl font-semibold text-[#f4f6fb]">{Math.round(detail.score || 0)}</span>
                  <span className="mt-2.5 ml-0.5 text-xs text-[#8b96b8]">/100</span>
                </span>
              )}
              <h2 className="mt-4 text-lg font-semibold text-[#f4f6fb]">{heroTitle}</h2>
              <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#9aa6c4]">{heroSubtitle}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-[#e4e8f0] bg-white py-4 text-center">
                <p className="text-lg font-semibold text-[#1b2230]">{detail.completedCount ?? "--"}</p>
                <p className="mt-1 text-[10.5px] text-[#8991a3]">Completed</p>
              </div>
              <div className="rounded-2xl border border-[#e4e8f0] bg-white py-4 text-center">
                <p className="text-lg font-semibold text-[#1b2230]">{detail.sampleSize ?? "--"}</p>
                <p className="mt-1 text-[10.5px] text-[#8991a3]">Recent activity</p>
              </div>
              <div className="rounded-2xl border border-[#e4e8f0] bg-white py-4 text-center">
                <p className="text-lg font-semibold text-[#1b2230]">{detail.minTripsRequired ?? "--"}</p>
                <p className="mt-1 text-[10.5px] text-[#8991a3]">Trips needed</p>
              </div>
            </div>

            {detail.breakdown && detail.breakdown.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[12.5px] font-semibold text-[#5a6478]">What&apos;s counted right now</p>
                <div className="overflow-hidden rounded-2xl border border-[#e4e8f0] bg-white">
                  {detail.breakdown.map((item) => {
                    const meta = EVENT_META[item.type] || { label: item.type, icon: ShieldCheck, tone: "neutral" as EventTone };
                    const Icon = meta.icon;
                    const tone = toneClass[meta.tone];
                    return (
                      <div key={item.type} className="flex items-center gap-2.5 border-b border-[#eef1f6] px-3.5 py-3 last:border-0">
                        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg" style={{ backgroundColor: tone.bg, color: tone.fg }}><Icon size={13} /></span>
                        <span className="flex-1 text-[12.5px] text-[#1b2230]">{meta.label}</span>
                        <span className="text-[12.5px] font-semibold text-[#5a6478]">×{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detail.recentEvents && detail.recentEvents.length > 0 ? (
              <div className="mt-6">
                <p className="mb-2 text-[12.5px] font-semibold text-[#5a6478]">Recent history</p>
                <div className="space-y-2">
                  {detail.recentEvents.map((event) => {
                    const meta = EVENT_META[event.type] || { label: event.type, icon: ShieldCheck, tone: "neutral" as EventTone };
                    const Icon = meta.icon;
                    const tone = toneClass[meta.tone];
                    return (
                      <div key={event.id} className="flex items-center gap-2.5 rounded-2xl border border-[#e4e8f0] bg-white px-3.5 py-3">
                        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg" style={{ backgroundColor: tone.bg, color: tone.fg }}><Icon size={13} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold text-[#1b2230]">{meta.label}</p>
                          <p className="mt-0.5 text-[10.5px] text-[#9aa3b5]">{formatDate(event.createdAt)}</p>
                        </div>
                        {event.verifiedOverride && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#e1f5ee] px-2 py-1 text-[9.5px] font-semibold text-[#085041]"><ShieldCheck size={10} />Verified by support</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#e4e8f0] bg-white p-[18px]">
                <p className="text-[15px] font-semibold text-[#1b2230]">No activity yet</p>
                <p className="mt-1.5 text-xs leading-5 text-[#5a6478]">Complete a trip or request to start building your reliability score.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AccountPage>
  );
}
