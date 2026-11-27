"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AD_CONSENT_CHANGED, AD_CONSENT_OPEN, getAdConsent, setAdConsent, type AdConsent } from "@/lib/ad-consent";

// The stored choice, read from the browser ("pending" during server render,
// so nothing flashes before the real value is known).
const subscribe = (onChange: () => void) => {
  window.addEventListener(AD_CONSENT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AD_CONSENT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const readChoice = () => getAdConsent() ?? "unset";
const serverChoice = () => "pending";

// Asks once whether Google and Meta may set advertising and measurement
// cookies. Nothing is loaded for ads until the visitor chooses "Allow".
// "Ad preferences" in the footer opens it again.
export function AdConsentBanner() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, readChoice, serverChoice);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(AD_CONSENT_OPEN, reopen);
    return () => window.removeEventListener(AD_CONSENT_OPEN, reopen);
  }, []);

  const open = choice === "unset" || reopened;
  if (!open || choice === "pending" || pathname?.startsWith("/admin")) return null;

  const choose = (value: AdConsent) => {
    setAdConsent(value);
    setReopened(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="ad-consent-title"
      aria-describedby="ad-consent-body"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-[#ded8ce] bg-[#fbfaf7] p-4 shadow-lg sm:inset-x-auto sm:left-6"
    >
      <p id="ad-consent-title" className="text-sm font-semibold text-[#1b1d1c]">Ads and measurement</p>
      <p id="ad-consent-body" className="mt-1 text-sm leading-6 text-[#62645f]">
        With your OK, Google and Meta may set cookies so we can see which of our ads bring people to Trickle.
        We never share your messages, addresses or ID with them.{" "}
        <Link href="/privacy#advertising" className="font-semibold text-[#183b3a] underline">Learn more</Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("granted")}
          className="rounded-full bg-[#183b3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#285c59]"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-full border border-[#ded8ce] px-4 py-2 text-sm font-semibold text-[#183b3a] transition hover:border-[#183b3a]"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

export function AdPreferencesLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(AD_CONSENT_OPEN))}
      className="transition hover:text-[#e85b43]"
    >
      Ad preferences
    </button>
  );
}
