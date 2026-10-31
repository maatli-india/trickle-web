"use client";

import { useEffect, useState } from "react";
import { fetchAvatarUrl } from "@/services/files";
import { avatarTint, initials } from "@/lib/home-constants";

// refreshKey lets a caller force a refetch after an upload/delete without
// this component needing to know why (bump a counter in the caller's state).
// Keyed on userId+refreshKey below so a change fully remounts AvatarImage —
// the React-recommended way to reset state on prop change, instead of an
// effect that calls setState synchronously at its top.
export function Avatar({
  userId,
  name,
  className = "size-10",
  refreshKey = 0,
}: {
  userId?: string;
  name?: string;
  className?: string;
  refreshKey?: number;
}) {
  return <AvatarImage key={`${userId || ""}:${refreshKey}`} userId={userId} name={name} className={className} />;
}

function AvatarImage({ userId, name, className }: { userId?: string; name?: string; className: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    fetchAvatarUrl(userId).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL; next/image can't proxy this
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={`${className} shrink-0 rounded-full object-cover`}
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
