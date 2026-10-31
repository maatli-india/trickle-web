"use client";

import { useEffect, useState } from "react";
import { fetchDeclineEvidenceUrl } from "@/services/parcel-matches";

// Read-only — the traveler already submitted these while declining at
// inspection; the sender can only view them here, not manage them.
// Separate from ParcelPhotoGallery (upload-capable, different Kosh download
// endpoint) rather than retrofitting it.
export function DeclineEvidenceGallery({ matchId, imageIds }: { matchId: string; imageIds: string[] }) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    imageIds.forEach((id) => {
      if (id in urls) return;
      fetchDeclineEvidenceUrl(matchId, id).then((url) => {
        setUrls((current) => (id in current ? current : { ...current, [id]: url }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds.join(","), matchId]);

  if (!imageIds.length) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-[#183b3a]">Photos of what was handed over</p>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {imageIds.map((id) => {
          const url = urls[id];
          return (
            <div key={id} className="relative aspect-square overflow-hidden rounded-xl border border-[#e4ded2] bg-[#f0ece3]">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL; next/image can't proxy this
                <img src={url} alt="Decline evidence photo" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-center text-xs text-[#8a8579]">
                  {url === null ? "Unavailable" : "Loading..."}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
