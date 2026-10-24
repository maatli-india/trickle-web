"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { formatSavedPlaceAddress, listSavedPlaces, type SavedPlace } from "@/services/saved-places";

// Lightweight inline convenience picker — not a full address book UI. Fetches
// the signed-in user's saved places and lets them prefill a free-text note
// (e.g. pickupNote/deliveryNote on the parcel request form) from one.
export function SavedAddressPicker({ onSelect }: { onSelect: (formattedAddress: string) => void }) {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listSavedPlaces()
      .then(setPlaces)
      .catch(() => setError("We could not load your saved addresses."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mt-2 rounded-xl border border-[#d7d2c9] bg-white p-2 shadow-[0_8px_20px_-16px_rgba(24,59,58,0.3)]">
      {loading && <p className="px-2 py-2 text-xs text-[#62645f]">Loading saved addresses...</p>}
      {!loading && error && <p className="px-2 py-2 text-xs text-[#b33e2c]">{error}</p>}
      {!loading && !error && places.length === 0 && (
        <p className="px-2 py-2 text-xs text-[#62645f]">You have no saved addresses yet.</p>
      )}
      {!loading && !error && places.length > 0 && (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {places.map((place) => {
            const formatted = formatSavedPlaceAddress(place);
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => onSelect(formatted)}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#f6f2eb]"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#285c59]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#183b3a]">{place.label}</span>
                  <span className="block truncate text-xs text-[#62645f]">{formatted}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
