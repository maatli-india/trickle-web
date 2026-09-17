"use client";

import { useEffect, useState } from "react";
import { Briefcase, Home, MapPin, Trash2 } from "lucide-react";
import { AccountPage, EmptyState } from "@/components/account/account-page";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { LocationFields, emptyLocation } from "@/components/forms/location-fields";
import { createSavedPlace, deleteSavedPlace, listSavedPlaces, type SavedPlace } from "@/services/saved-places";

const iconFor = (label: string) => {
  const value = label.trim().toLowerCase();
  if (value === "home") return Home;
  if (value === "work") return Briefcase;
  return MapPin;
};

export default function SavedPlacesPage() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SavedPlace | null>(null);
  const [place, setPlace] = useState(emptyLocation);

  const load = () => {
    listSavedPlaces()
      .then(setPlaces)
      .catch(() => setError("We could not load your saved addresses right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startAdding = () => {
    setLabel("");
    setPlace(emptyLocation());
    setAdding(true);
  };

  const save = async () => {
    if (!label.trim() || !place.address.trim() || !place.lat || !place.lng) return;
    setSaving(true);
    try {
      await createSavedPlace({
        label: label.trim(),
        place: { address: place.address, lat: Number(place.lat), lng: Number(place.lng) },
      });
      setAdding(false);
      load();
    } catch {
      setError("We could not save this address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSavedPlace(confirmDelete.id);
      setPlaces((current) => current.filter((item) => item.id !== confirmDelete.id));
    } catch {
      setError("We could not remove this address. Please try again.");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <AccountPage title="Saved addresses" description="Keep your home, work, and other frequent pickup or delivery points ready for the next request.">
      {loading && <p className="text-sm text-[#62645f]">Loading your saved addresses...</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-[#e85b43]/30 bg-[#fff0eb] px-4 py-3 text-sm text-[#b33e2c]">{error}</p>}
      {!loading && (
        <div className="max-w-2xl space-y-5">
          {places.length === 0 && !adding && <EmptyState title="No saved addresses yet" description="Add a home, work, or other frequent address to reuse it when sending a parcel or posting a trip." />}
          {places.length > 0 && (
            <div className="divide-y divide-[#ded8ce] border-t border-[#ded8ce]">
              {places.map((item) => {
                const Icon = iconFor(item.label);
                const address = item.place?.address || item.address;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e5f0eb] text-[#285c59]"><Icon size={16} /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#183b3a]">{item.label}</p>
                        <p className="truncate text-xs text-[#a7a297]">{address}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setConfirmDelete(item)} aria-label="Remove address" className="shrink-0 text-[#a7a297] hover:text-[#e85b43]"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
          {!adding ? (
            <button type="button" onClick={startAdding} className="rounded-full bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59]">Add an address</button>
          ) : (
            <div className="space-y-4 border-t-2 border-[#e85b43] bg-[#fbfaf7] p-6 sm:p-8">
              <label className="block text-sm font-semibold text-[#183b3a]">
                Label
                <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Home, Work, ..." className="mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]" />
              </label>
              <LocationFields title="Address" hint="Search for the address you want to save." value={place} onChange={setPlace} />
              <div className="flex gap-3">
                <button type="button" disabled={saving || !label.trim() || !place.lat} onClick={save} className="rounded-xl bg-[#183b3a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285c59] disabled:opacity-60">{saving ? "Saving..." : "Save address"}</button>
                <button type="button" onClick={() => setAdding(false)} className="rounded-xl border border-[#d7d2c9] px-5 py-3 text-sm font-semibold text-[#183b3a] hover:border-[#e85b43]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={Boolean(confirmDelete)}
        title="Remove this address?"
        message={`${confirmDelete?.label || "This address"} will no longer be suggested when you search for a route.`}
        destructive
        confirmLabel="Remove"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmRemove}
      />
    </AccountPage>
  );
}
