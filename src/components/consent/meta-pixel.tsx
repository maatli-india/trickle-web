"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AD_CONSENT_CHANGED, hasAdConsent } from "@/lib/ad-consent";
import { META_PIXEL_ID, pixelHostEnabled, pixelPageAllowed } from "@/lib/ad-tags";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(AD_CONSENT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AD_CONSENT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};

// Meta's standard loader, written out so nothing runs before consent.
function loadPixel(): Fbq {
  if (window.fbq) return window.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // No automatic PageView on client-side navigation: we send PageView
  // ourselves, only on allowed pages.
  fbq.disablePushState = true;
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  // No automatic button-click / page-metadata events either.
  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
  return fbq;
}

// Sends a PageView for each allowed page the visitor opens, once they've
// allowed ads. On any other page (or after consent is withdrawn) the pixel
// is put on hold with fbq("consent", "revoke"), so nothing is sent from there.
export function MetaPixel() {
  const pathname = usePathname();
  const granted = useSyncExternalStore(subscribe, hasAdConsent, () => false);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const allowed = granted && pixelHostEnabled(window.location.hostname) && pixelPageAllowed(pathname);
    if (!allowed) {
      window.fbq?.("consent", "revoke");
      lastTracked.current = null;
      return;
    }
    if (lastTracked.current === pathname) return;
    const fbq = loadPixel();
    fbq("consent", "grant");
    fbq("track", "PageView");
    lastTracked.current = pathname;
  }, [granted, pathname]);

  return null;
}
