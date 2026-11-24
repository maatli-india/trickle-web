"use client";

import { useEffect, useRef, useState } from "react";
import { AVATAR_CHANGED_EVENT, fetchAvatarUrl, invalidateAvatarCache, presignedExpiry } from "@/services/files";
import { avatarTint, initials } from "@/lib/home-constants";

// setTimeout overflows past 2^31-1 ms (~24.8 days) and would fire immediately.
const MAX_TIMEOUT_MS = 2_147_483_647;

// refreshKey lets a caller force a refetch after an upload/delete without
// this component needing to know why (bump a counter in the caller's state).
// Keyed on userId+refreshKey below so a change fully remounts AvatarImage —
// the React-recommended way to reset state on prop change, instead of an
// effect that calls setState synchronously at its top.
// `fresh` skips the cached URL for this mount (the home page re-pulls the signed-in user's picture).
export function Avatar({
  userId,
  name,
  className = "size-10",
  refreshKey = 0,
  fresh = false,
}: {
  userId?: string;
  name?: string;
  className?: string;
  refreshKey?: number;
  fresh?: boolean;
}) {
  return (
    <AvatarImage
      key={`${userId || ""}:${refreshKey}`}
      userId={userId}
      name={name}
      className={className}
      fresh={fresh || refreshKey > 0}
    />
  );
}

function AvatarImage({ userId, name, className, fresh }: { userId?: string; name?: string; className: string; fresh: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  // One fresh retry per image when it fails (e.g. expired early); after that, show initials.
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    fetchAvatarUrl(userId, { fresh }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, fresh]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const onChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== userId) return;
      retriedRef.current = false;
      fetchAvatarUrl(userId).then((url) => {
        if (!cancelled) setSrc(url);
      });
    };
    window.addEventListener(AVATAR_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(AVATAR_CHANGED_EVENT, onChanged);
    };
  }, [userId]);

  // A mounted avatar outlives its presigned URL on a long-open page; swap in a new URL when it expires.
  useEffect(() => {
    if (!src || !userId) return;
    let cancelled = false;
    const delay = Math.min(Math.max(presignedExpiry(src) - Date.now(), 0), MAX_TIMEOUT_MS);
    const timer = window.setTimeout(() => {
      fetchAvatarUrl(userId, { fresh: true }).then((url) => {
        if (!cancelled) setSrc(url);
      });
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [src, userId]);

  const handleImageError = () => {
    if (!userId) return setSrc(null);
    invalidateAvatarCache(userId);
    if (retriedRef.current) return setSrc(null);
    retriedRef.current = true;
    fetchAvatarUrl(userId, { fresh: true }).then(setSrc);
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL; next/image can't proxy this
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={`${className} shrink-0 rounded-full object-cover`}
        onError={handleImageError}
      />
    );
  }

  const label = name?.trim();
  const tint = label ? avatarTint(label) : { bg: "#e7b65c", fg: "#183b3a" };
  return (
    <span
      className={`grid ${className} shrink-0 place-items-center rounded-full text-sm font-bold`}
      style={{ backgroundColor: tint.bg, color: tint.fg }}
      aria-hidden="true"
    >
      {label ? initials(label) : (
        <svg viewBox="0 0 24 24" className="size-1/2 fill-current" role="presentation">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0H5.5Z" />
        </svg>
      )}
    </span>
  );
}
