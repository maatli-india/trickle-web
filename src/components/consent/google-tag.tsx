"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AD_CONSENT_CHANGED, hasAdConsent } from "@/lib/ad-consent";
import { GA_MEASUREMENT_ID, pixelHostEnabled, pixelPageAllowed } from "@/lib/ad-tags";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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

// Google's documented opt-out flag: while true, the tag sends nothing at all
// (including enhanced-measurement events on client-side navigation).
const DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;
const setDisabled = (disabled: boolean) => {
  (window as unknown as Record<string, boolean>)[DISABLE_KEY] = disabled;
};

function loadGtag() {
  if (window.gtag) return window.gtag;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the real `arguments` object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.gtag("consent", "default", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  // Page views are sent below, only for allowed pages.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  return window.gtag;
}

// Google tag (GA4 web stream "Trickle website"). Same rules as the Meta
// Pixel: after "Allow" only, production host only, marketing pages only.
export function GoogleTag() {
  const pathname = usePathname();
  const granted = useSyncExternalStore(subscribe, hasAdConsent, () => false);
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const allowed = granted && pixelHostEnabled(window.location.hostname) && pixelPageAllowed(pathname);
    if (!allowed) {
      setDisabled(true);
      if (!granted) {
        window.gtag?.("consent", "update", {
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
          analytics_storage: "denied",
        });
      }
      lastTracked.current = null;
      return;
    }
    if (lastTracked.current === pathname) return;
    setDisabled(false);
    const gtag = loadGtag();
    gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
    gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    });
    lastTracked.current = pathname;
  }, [granted, pathname]);

  return null;
}
