"use client";

import { FormEvent, useState } from "react";
import { AccountPage } from "@/components/account/account-page";
import { submitLead } from "@/services/leads";

const CATEGORIES = [
  { value: "business_opportunity", label: "Business opportunity" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "collaboration", label: "Collaboration" },
  { value: "other", label: "Something else" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [message, setMessage] = useState("");
  // Honeypot — never shown to a real visitor. A bot that fills every input
  // on the page will fill this one too.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setError("");
    if (!email.trim() && !phone.trim()) {
      setError("Please share an email or a phone number so we can get back to you.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLead({
        name,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        category,
        message,
        website,
      });
      setStatus("Thanks for reaching out. Our team will get back to you shortly.");
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setCategory(CATEGORIES[0].value);
      setMessage("");
    } catch {
      setError("We could not submit your message. Please try again, or email support@trickle.org.in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountPage
      eyebrow="Get in touch"
      title="Contact us"
      description="Have a business opportunity, lead, deal, or collaboration in mind? Tell us about it and our team will reach out."
    >
      <form onSubmit={submit} className="max-w-2xl overflow-hidden rounded-2xl border border-[#e4ded2] bg-white shadow-[0_20px_40px_-28px_rgba(24,59,58,0.25)]">
        <div className="h-[3px] bg-[#e85b43]" />
        <div className="space-y-5 p-6 sm:p-10">
          <label className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true" tabIndex={-1}>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-[#183b3a]">
            Name
            <input
              required
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#183b3a]">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
              />
            </label>
            <label className="block text-sm font-semibold text-[#183b3a]">
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="10-digit mobile number"
                className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
              />
            </label>
          </div>
          <p className="text-xs text-[#8a8579]">Share at least one of email or phone.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#183b3a]">
              Company
              <input
                type="text"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Optional"
                className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
              />
            </label>
            <label className="block text-sm font-semibold text-[#183b3a]">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]">
                {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-[#183b3a]">
            What would you like to discuss?
            <textarea
              required
              rows={5}
              minLength={10}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us a bit about the opportunity, lead, deal, or collaboration you have in mind."
              className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#e85b43]"
            />
          </label>
          <div className="flex items-center gap-4 border-t border-[#eee9e1] pt-6">
            <button disabled={submitting} className="rounded-xl bg-[#183b3a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#285c59] disabled:opacity-60">{submitting ? "Submitting..." : "Submit"}</button>
            {status && <p role="status" className="text-sm font-medium text-[#285c59]">{status}</p>}
          </div>
          {error && <p role="alert" className="text-sm text-[#b33e2c]">{error}</p>}
        </div>
      </form>
    </AccountPage>
  );
}
