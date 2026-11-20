import { Smartphone } from "lucide-react";
import { appStoreUrl, playStoreUrl } from "@/lib/app-links";

type Tone = "light" | "dark";

const stores = [
  { label: "Google Play", prefix: "Get it on", url: playStoreUrl },
  { label: "App Store", prefix: "Download on the", url: appStoreUrl },
];

// Download buttons for both stores. A store without a listing URL yet shows
// a "coming soon" pill instead of a dead link.
export function StoreButtons({ tone = "dark", className = "" }: { tone?: Tone; className?: string }) {
  const live = tone === "dark"
    ? "bg-[#1b1d1c] text-white hover:bg-[#343735]"
    : "bg-white text-[#183b3a] hover:bg-[#f0ece3]";
  const soon = tone === "dark"
    ? "border border-dashed border-[#bbb6ad] text-[#77766f]"
    : "border border-dashed border-white/40 text-[#c5d4ce]";

  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      {stores.map((store) =>
        store.url ? (
          <a
            key={store.label}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 rounded-xl px-5 py-2.5 transition ${live}`}
          >
            <Smartphone size={22} aria-hidden="true" />
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] opacity-80">{store.prefix}</span>
              <span className="text-base font-semibold">{store.label}</span>
            </span>
          </a>
        ) : (
          <span key={store.label} className={`flex items-center gap-3 rounded-xl px-5 py-2.5 ${soon}`}>
            <Smartphone size={22} aria-hidden="true" />
            <span className="flex flex-col leading-tight">
              <span className="text-[11px]">Coming soon to</span>
              <span className="text-base font-semibold">{store.label}</span>
            </span>
          </span>
        ),
      )}
    </div>
  );
}
