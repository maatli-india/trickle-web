"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { fetchParcelPhotoUrl, uploadParcelImages } from "@/services/parcel-matches";

// Add for bookedBy, sender, or receiver — the traveler is view-only (403
// from the API). No delete: once a photo is on a sent request, it stays —
// there is no UI affordance to remove it. There is no match-status gate:
// this can show up regardless of where the match is in its lifecycle.
export function ParcelPhotoGallery({
  matchId,
  imageIds,
  canManage,
  onChanged,
}: {
  matchId: string;
  imageIds: string[];
  canManage: boolean;
  onChanged?: () => void;
}) {
  const [orderedIds, setOrderedIds] = useState<string[]>(imageIds);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // parcelImageIds is membership, not display order — reconcile instead of
  // re-sorting to whatever order the server array happens to be in. Adjusted
  // during render (React's recommended pattern for this) rather than in an
  // effect, keyed by content so an unrelated parent re-render (a new but
  // equivalent array reference) doesn't touch it.
  const idsKey = imageIds.join(",");
  const [prevIdsKey, setPrevIdsKey] = useState(idsKey);
  if (idsKey !== prevIdsKey) {
    setPrevIdsKey(idsKey);
    setOrderedIds((current) => {
      const known = new Set(current);
      const stillPresent = current.filter((id) => imageIds.includes(id));
      const added = imageIds.filter((id) => !known.has(id));
      return [...stillPresent, ...added];
    });
  }

  useEffect(() => {
    orderedIds.forEach((id) => {
      if (id in urls) return;
      fetchParcelPhotoUrl(matchId, id).then((url) => {
        setUrls((current) => (id in current ? current : { ...current, [id]: url }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedIds, matchId]);

  const pickFiles = () => fileInputRef.current?.click();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList).slice(0, 20);
    setUploading(true);
    setUploadError("");
    try {
      const outcomes = await uploadParcelImages(matchId, files);
      const readyIds: string[] = [];
      let failedCount = 0;
      for (const outcome of outcomes) {
        if ("fileId" in outcome && outcome.status.status === "READY") readyIds.push(outcome.fileId);
        else failedCount += 1;
      }
      if (readyIds.length) setOrderedIds((current) => [...current, ...readyIds.filter((id) => !current.includes(id))]);
      if (failedCount) setUploadError(`${failedCount} of ${files.length} photo${files.length > 1 ? "s" : ""} could not be uploaded.`);
      onChanged?.();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload these photos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!canManage && !orderedIds.length) return null;

  return (
    <section className="mt-6 border border-[#ded8ce] bg-[#fbfaf7] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#183b3a]">Parcel photos</p>
        {canManage && (
          <button
            type="button"
            onClick={pickFiles}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full border border-[#d7d2c9] px-3 py-1.5 text-xs font-semibold text-[#183b3a] hover:border-[#e85b43] disabled:opacity-60"
          >
            <ImagePlus size={14} />
            {uploading ? "Uploading..." : "Add photos"}
          </button>
        )}
      </div>

      {canManage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      )}

      {uploadError && <p role="alert" className="mt-3 text-sm text-[#b33e2c]">{uploadError}</p>}

      {orderedIds.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {orderedIds.map((id) => {
            const url = urls[id];
            return (
              <div key={id} className="relative aspect-square overflow-hidden rounded-xl border border-[#e4ded2] bg-[#f0ece3]">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external, per-request presigned URL; next/image can't proxy this
                  <img src={url} alt="Parcel photo" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-center text-xs text-[#8a8579]">
                    {url === null ? "Unavailable" : "Loading..."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#62645f]">
          {canManage ? "No photos yet — add some to help with pickup and handoff." : "No photos have been added yet."}
        </p>
      )}
    </section>
  );
}
