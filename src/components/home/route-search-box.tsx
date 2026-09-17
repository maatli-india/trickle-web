"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, MapPin, X } from "lucide-react";
import type { LocationForm } from "@/components/forms/location-fields";

type AddressSuggestion = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
  lat?: string;
  lng?: string;
};

function RouteField({
  label,
  placeholder,
  value,
  onChange,
  accent,
}: {
  label: string;
  placeholder: string;
  value: LocationForm;
  onChange: (value: LocationForm) => void;
  accent: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const selectedAddressRef = useRef("");

  useEffect(() => {
    if (value.lat && value.lng) selectedAddressRef.current = value.address;
  }, [value.address, value.lat, value.lng]);

  useEffect(() => {
    if (value.address === selectedAddressRef.current || value.address.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const localResponse = await fetch(`/api/v1/locations/search?q=${encodeURIComponent(value.address)}&limit=10`, { signal: controller.signal });
        if (localResponse.ok) {
          const localData = await localResponse.json();
          const locations = localData.items || (Array.isArray(localData.data) ? localData.data : localData.data?.items) || [];
          if (locations.length) {
            setSuggestions(locations.map((location: { area?: string; city?: string; state?: string; lat?: number; lng?: number }) => {
              const description = [location.area, location.city, location.state].filter(Boolean).join(", ");
              return {
                place_id: `${location.lat}-${location.lng}-${description}`,
                description,
                structured_formatting: { main_text: location.area || location.city || location.state, secondary_text: [location.city, location.state].filter(Boolean).join(", ") },
                lat: String(location.lat),
                lng: String(location.lng),
              };
            }));
            return;
          }
        }
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value.address)}`, { signal: controller.signal });
        if (response.ok) setSuggestions((await response.json()).predictions || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value.address]);

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    if (suggestion.lat && suggestion.lng) {
      selectedAddressRef.current = suggestion.description;
      onChange({ address: suggestion.description, lat: suggestion.lat, lng: suggestion.lng });
      setFocused(false);
      return;
    }
    const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(suggestion.place_id)}`);
    if (!response.ok) return;
    const result = await response.json();
    const location = result.result?.geometry?.location;
    if (location) {
      const address = result.result.formatted_address || suggestion.description;
      selectedAddressRef.current = address;
      onChange({ address, lat: String(location.lat), lng: String(location.lng) });
    }
    setFocused(false);
  };

  return (
    <div className="relative flex items-center gap-3 py-3">
      <MapPin size={16} className="shrink-0" style={{ color: accent }} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a7a297]">{label}</p>
        <input
          value={value.address}
          onChange={(event) => {
            selectedAddressRef.current = "";
            onChange({ address: event.target.value, lat: "", lng: "" });
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full truncate bg-transparent text-sm font-semibold text-[#183b3a] outline-none placeholder:font-normal placeholder:text-[#a7a297]"
        />
      </div>
      {value.address && (
        <button
          type="button"
          onClick={() => {
            selectedAddressRef.current = "";
            setSuggestions([]);
            onChange({ address: "", lat: "", lng: "" });
          }}
          aria-label={`Clear ${label.toLowerCase()} location`}
          title={`Clear ${label.toLowerCase()} location`}
          className="grid size-7 shrink-0 place-items-center rounded-full text-[#8991a3] hover:bg-[#f6f2eb] hover:text-[#183b3a]"
        >
          <X size={14} />
        </button>
      )}
      {focused && (searching || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#d7d2c9] bg-white shadow-lg">
          {searching && <p className="px-4 py-3 text-xs text-[#62645f]">Searching areas...</p>}
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.place_id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className="block w-full border-b border-[#eee9e1] px-4 py-3 text-left last:border-0 hover:bg-[#f6f2eb]"
            >
              <span className="block text-sm font-semibold text-[#183b3a]">{suggestion.structured_formatting?.main_text || suggestion.description}</span>
              {suggestion.structured_formatting?.secondary_text && <span className="mt-0.5 block text-xs text-[#62645f]">{suggestion.structured_formatting.secondary_text}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RouteSearchBox({
  from,
  to,
  onFromChange,
  onToChange,
  onSwap,
}: {
  from: LocationForm;
  to: LocationForm;
  onFromChange: (value: LocationForm) => void;
  onToChange: (value: LocationForm) => void;
  onSwap: () => void;
}) {
  return (
    <div className="relative divide-y divide-[#eee9e1] rounded-2xl border border-[#ded8ce] bg-white px-4 shadow-sm">
      <RouteField label="Send from" placeholder="Pickup address" value={from} onChange={onFromChange} accent="#e85b43" />
      <RouteField label="Deliver to" placeholder="Delivery address" value={to} onChange={onToChange} accent="#285c59" />
      <button
        type="button"
        onClick={onSwap}
        aria-label="Swap send-from and delivery locations"
        className="absolute -right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[#ded8ce] bg-[#fbfaf7] text-[#183b3a] shadow hover:border-[#e85b43]"
      >
        <ArrowUpDown size={15} />
      </button>
    </div>
  );
}
