"use client";

import { FormEvent, useState } from "react";
import { AccountPage } from "@/components/account/account-page";
import { createReport } from "@/services/reports";

const CATEGORIES = [
  { value: "safety", label: "Safety concern" },
  { value: "fraud", label: "Fraud or scam" },
  { value: "payment", label: "Payment issue" },
  { value: "delivery", label: "Delivery problem" },
  { value: "behaviour", label: "User behaviour" },
  { value: "other", label: "Something else" },
];

export default function ReportProblemPage() {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      await createReport({ category, description, urgent });
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
      <form onSubmit={submit} className="max-w-2xl space-y-5 border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
        <label className="block text-sm font-semibold text-[#183b3a]">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]">
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
            className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-[#62645f]">
          <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
          This needs urgent attention
        </label>
        <button disabled={submitting} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59] disabled:opacity-60">{submitting ? "Submitting..." : "Submit report"}</button>
        {message && <p role="status" className="text-sm text-[#285c59]">{message}</p>}
        {error && <p role="alert" className="text-sm text-[#b33e2c]">{error}</p>}
      </form>
    </AccountPage>
  );
}
