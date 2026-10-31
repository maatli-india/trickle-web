"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountPage } from "@/components/account/account-page";
import { createReport } from "@/services/reports";

const CATEGORIES = [
  { value: "safety", label: "Safety concern" },
  { value: "fraud", label: "Fraud or scam" },
  { value: "payment", label: "Payment issue" },
  { value: "delivery", label: "Delivery problem" },
  { value: "behaviour", label: "User behaviour" },
  { value: "demanded_money_outside_app", label: "Asked for money outside the app" },
  { value: "traveler_cancelled_after_confirm", label: "Traveler cancelled after confirming" },
  { value: "other", label: "Something else" },
];

// useSearchParams() opts the page out of static rendering unless it's
// wrapped in its own Suspense boundary — next build's prerender step fails
// outright without this.
export default function ReportProblemPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f2eb]" />}>
      <ReportProblemContent />
    </Suspense>
  );
}

function ReportProblemContent() {
  const searchParams = useSearchParams();
  // Deep-link prefill (e.g. requests/[id]'s "Report this") — read once as
  // each field's initial state so the category/description stay fully
  // editable afterward, without needing an effect to set them post-mount.
  const [category, setCategory] = useState(() => {
    const queryCategory = searchParams.get("category");
    return queryCategory && CATEGORIES.some((item) => item.value === queryCategory) ? queryCategory : CATEGORIES[0].value;
  });
  const [description, setDescription] = useState(() => searchParams.get("description") || "");
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Carried through from the same deep link so the submitted report is
  // tied back to the request/trip/user it was filed from — never shown as
  // its own field, just forwarded on submit.
  const [reportedType] = useState(() => searchParams.get("reportedType") || "");
  const [reportedId] = useState(() => searchParams.get("reportedId") || "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      await createReport({
        category,
        description,
        urgent,
        ...(reportedType ? { reportedType } : {}),
        ...(reportedId ? { reportedId } : {}),
      });
      setMessage("Your report has been sent to our support team. We will follow up if we need more details.");
      setDescription("");
      setUrgent(false);
    } catch {
      setError("We could not submit your report. Please try again, or email support@trickle.org.in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountPage title="Report a problem" description="Tell us about a safety concern, fraud, a payment issue, or anything else that went wrong.">
      <form onSubmit={submit} className="max-w-2xl overflow-hidden rounded-2xl border border-[#e4ded2] bg-white shadow-[0_20px_40px_-28px_rgba(24,59,58,0.25)]">
        <div className="h-[3px] bg-[#e85b43]" />
        <div className="space-y-5 p-6 sm:p-10">
          <label className="block text-sm font-semibold text-[#183b3a]">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-[#183b3a]">
            What happened?
            <textarea
              required
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Include the relevant request or trip details, what happened, and when."
              className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e4ded2] bg-[#fbfaf7] px-4 py-3.5 text-sm font-medium text-[#183b3a]">
            This needs urgent attention
            <input type="checkbox" className="size-4 accent-[#183b3a]" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
          </label>
          <div className="flex items-center gap-4 border-t border-[#eee9e1] pt-6">
            <button disabled={submitting} className="rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59] disabled:opacity-60">{submitting ? "Submitting..." : "Submit report"}</button>
            {message && <p role="status" className="text-sm font-medium text-[#285c59]">{message}</p>}
          </div>
          {error && <p role="alert" className="text-sm text-[#b33e2c]">{error}</p>}
        </div>
      </form>
    </AccountPage>
  );
}
