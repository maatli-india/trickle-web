"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getWebProfile, hasAccessToken, logoutWebSession } from "@/services/auth";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const subscribe = () => () => {};

function DefaultAvatar({ className = "size-10" }: { className?: string }) {
  return (
    <span className={`grid ${className} shrink-0 place-items-center rounded-full bg-[#e7b65c] text-[#183b3a]`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-6 fill-current" role="presentation">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0H5.5Z" />
      </svg>
    </span>
  );
}

const getDisplayName = (profileValue: string | null) => {
  if (!profileValue) return "User";
  try {
    const profile = JSON.parse(profileValue) as { name?: string };
    return profile.name?.trim() || "User";
  } catch {
    return "User";
  }
};

const primaryNavItems = [
  { label: "Home", href: "/" },
  { label: "Requests", href: "/requests" },
  { label: "Plans", href: "/plans" },
  { label: "Settings", href: "/settings" },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useSyncExternalStore(subscribe, hasAccessToken, () => false);
  const profileValue = useSyncExternalStore(subscribe, getWebProfile, () => null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = getDisplayName(profileValue);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await logoutWebSession();
    } catch {
      // Clear the local session and redirect even if the server is unavailable.
    } finally {
      router.replace("/register");
    }
  };

  return (
    <header className="border-b border-[#ded8ce] bg-[#fbfaf7]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Trickle home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e85b43] text-lg font-bold text-white">T</span>
          <span className="text-xl font-semibold tracking-[-0.03em]">trickle</span>
        </Link>
        {!authenticated && (
          <nav className="flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#62645f] sm:gap-x-5 sm:text-sm" aria-label="Primary navigation">
            {[
                ["Home", "/"],
                ["About us", "/about"],
                ["Blog", "/blog"],
                ["Support", "/support"],
                ["Contact us", "mailto:support@trickle.org.in"],
                ["Privacy policy", "/privacy"],
                ["Terms", "/terms"],
                ["FAQs", "/faqs"],
            ].map(([label, href]) => href.startsWith("mailto:") ? (
              <a key={label} className="transition hover:text-[#e85b43]" href={href}>{label}</a>
            ) : (
              <Link key={label} className={`transition ${pathname === href ? "font-semibold text-[#e85b43] underline decoration-2 underline-offset-4" : "hover:text-[#e85b43]"}`} href={href}>{label}</Link>
            ))}
          </nav>
        )}
        {authenticated && (
          <nav className="order-3 flex basis-full items-center gap-1 overflow-x-auto rounded-full bg-[#f0ece3] p-1 sm:order-none sm:basis-auto sm:justify-start" aria-label="Primary navigation">
            {primaryNavItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                    active ? "bg-[#e85b43] text-white" : "text-[#183b3a] hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
        {authenticated ? (
          <button type="button" onClick={() => setMenuOpen(true)} className="flex items-center gap-3 rounded-full border border-[#ded8ce] bg-[#fbfaf7] py-1.5 pl-1.5 pr-4 text-left transition hover:border-[#e85b43]" aria-label="Open account menu">
            <DefaultAvatar className="size-9" />
            <span className="hidden max-w-32 truncate text-sm font-semibold text-[#183b3a] sm:block">{displayName}</span>
            <span className="text-xs text-[#e85b43]" aria-hidden="true">▼</span>
          </button>
        ) : (
          <a href="/register" className="rounded-full bg-[#1b1d1c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#343735]">Sign in</a>
        )}
      </div>
      {authenticated && menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#1b1d1c]/30" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto flex min-h-full w-full max-w-sm flex-col bg-[#fbfaf7] shadow-2xl" role="dialog" aria-label="Account menu" onClick={(event) => event.stopPropagation()}>
            <div className="bg-[#183b3a] px-7 pb-7 pt-5 text-white">
              <button type="button" onClick={() => setMenuOpen(false)} className="ml-auto block text-xl text-[#e7b65c]" aria-label="Close menu">X</button>
              <DefaultAvatar className="mt-4 size-16" />
              <p className="mt-4 text-lg font-semibold">{displayName}</p>
              <p className="mt-1 text-sm text-[#c5d4ce]">User Account</p>
            </div>
            <div className="flex-1 bg-[#f6f2eb]" />
            <button type="button" onClick={() => setLogoutConfirmOpen(true)} disabled={loggingOut} className="border-t border-[#ded8ce] bg-[#fbfaf7] px-7 py-5 text-left text-sm font-semibold text-[#e85b43] disabled:opacity-60">{loggingOut ? "Logging out..." : "Logout"}</button>
          </aside>
        </div>
      )}
      <ConfirmModal
        open={logoutConfirmOpen}
        title="Log out of Trickle?"
        message="You'll need to verify your phone number again to sign back in."
        confirmLabel={loggingOut ? "Logging out..." : "Log out"}
        destructive
        loading={loggingOut}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
        }}
      />
    </header>
  );
}