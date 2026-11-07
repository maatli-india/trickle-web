"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";

// Registers the PWA service worker (public/sw.js) and shows a small,
// dismissible "Install Trickle" banner:
//   - Chrome/Edge/Android: a real Install button (beforeinstallprompt).
//   - iPhone/iPad Safari: no install API exists, so a one-line hint to use
//     Share → Add to Home Screen instead.
// Hidden once installed (standalone display mode), for 30 days after
// "Not now", and on admin/payment pages where it would only get in the way.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "trickle:pwa-install-dismissed-at";
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Only Safari can add to the home screen on older iOS; skip in-app browsers.
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line\//.test(ua);
};

const recentlyDismissed = () => {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
};

// "hidden" when installed or recently dismissed, "ios" for the Share hint,
// "prompt" to wait for the browser's own install event. Read once on the
// client; the server snapshot is "hidden" so nothing renders during SSR.
type InstallMode = "hidden" | "ios" | "prompt";
const subscribeNever = () => () => {};
const readInstallMode = (): InstallMode => {
  if (isStandalone() || recentlyDismissed()) return "hidden";
  return isIosSafari() ? "ios" : "prompt";
};
const serverInstallMode = (): InstallMode => "hidden";

export function PwaSetup() {
  const pathname = usePathname();
  const mode = useSyncExternalStore(subscribeNever, readInstallMode, serverInstallMode);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // Dev builds aren't content-hashed, so caching them would serve stale code.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
        console.warn("[pwa] service worker registration failed:", error);
      });
    }

    if (readInstallMode() !== "prompt") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setClosed(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode etc. — just hide for this visit.
    }
    setClosed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setClosed(true);
    else dismiss();
  };

  const blockedRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/payment");
  if (closed || mode === "hidden" || blockedRoute || (mode === "prompt" && !installEvent)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className="relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-[#ded8ce] bg-white p-3 pr-2 shadow-xl"
        role="dialog"
        aria-label="Install Trickle"
      >
        <span className="absolute inset-x-0 top-0 h-1 bg-[#e7b65c]" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no optimisation needed */}
        <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#183b3a]">Get the Trickle app</p>
          {installEvent ? (
            <p className="text-xs leading-5 text-[#62645f]">Install it on your device — opens full screen, loads faster.</p>
          ) : (
            <p className="text-xs leading-5 text-[#62645f]">
              Tap <Share className="inline h-3.5 w-3.5 -translate-y-px" aria-label="Share" /> then{" "}
              <span className="font-semibold text-[#183b3a]">Add to Home Screen</span>.
            </p>
          )}
        </div>
        {installEvent && (
          <button
            type="button"
            onClick={install}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#183b3a] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#285c59]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-2 text-[#62645f] transition hover:bg-[#f0ece3] hover:text-[#183b3a]"
          aria-label="Not now"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
