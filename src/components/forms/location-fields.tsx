"use client";

import { useEffect, useRef, useState } from "react";

export type LocationForm = { address: string; lat: string; lng: string };

export const emptyLocation = (): LocationForm => ({ address: "", lat: "", lng: "" });

export const inputClass =
  "mt-2 w-full rounded-xl border border-[#d7d2c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#e85b43]";
export const labelClass = "block text-sm font-semibold text-[#183b3a]";

export const getAreaName = (result: {
  address_components?: Array<{ long_name: string; types: string[] }>;
  formatted_address?: string;
}) => {
  const components = result.address_components || [];
  const area =
    components.find((component) => component.types.includes("neighborhood")) ||
    components.find((component) => component.types.includes("sublocality")) ||
    components.find((component) => component.types.includes("locality"));
  const city = components.find((component) => component.types.includes("locality"));
  if (area && city && area.long_name !== city.long_name) return `${area.long_name}, ${city.long_name}`;
  return area?.long_name || result.formatted_address || "Current location";
};

type AddressSuggestion = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
  lat?: string;
  lng?: string;
};

type LocalLocation = { area?: string; city?: string; state?: string; lat?: number; lng?: number };
type LocalLocationsResponse = { items?: LocalLocation[]; data?: LocalLocation[] | { items?: LocalLocation[] } };

const localSuggestions = (locations: LocalLocation[]): AddressSuggestion[] =>
  locations.map((location) => {
    const description = [location.area, location.city, location.state].filter(Boolean).join(", ");
    return {
      place_id: `${location.lat}-${location.lng}-${description}`,
      description,
      structured_formatting: {
        main_text: location.area || location.city || location.state,
        secondary_text: [location.city, location.state].filter(Boolean).join(", "),
      },
      lat: location.lat !== undefined ? String(location.lat) : undefined,
      lng: location.lng !== undefined ? String(location.lng) : undefined,
    };
  });

export function LocationFields({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: LocationForm;
  onChange: (value: LocationForm) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedAddressRef = useRef("");

  useEffect(() => {
    if (value.lat && value.lng) selectedAddressRef.current = value.address;
  }, [value.address, value.lat, value.lng]);

  useEffect(() => {
    if (
      value.address === selectedAddressRef.current ||
      value.address === "Current location" ||
      value.address.trim().length < 2
    )
      return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const localResponse = await fetch(`/api/v1/locations/search?q=${encodeURIComponent(value.address)}&limit=10`, {
          signal: controller.signal,
        });
        if (localResponse.ok) {
          const localData = (await localResponse.json()) as LocalLocationsResponse;
          const locations = localData.items || (Array.isArray(localData.data) ? localData.data : localData.data?.items) || [];
          if (locations.length) {
            setSuggestions(localSuggestions(locations));
            return;
          }
        }
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value.address)}`, {
          signal: controller.signal,
        });
        if (response.ok) setSuggestions((await response.json()).predictions || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value.address]);

  const visibleSuggestions =
    value.address.trim().length >= 2 && value.address !== "Current location" ? suggestions : [];

  const selectSuggestion = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    setSearching(false);
    if (suggestion.lat && suggestion.lng) {
      selectedAddressRef.current = suggestion.description;
      onChange({ address: suggestion.description, lat: suggestion.lat, lng: suggestion.lng });
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
  };

  return (
    <fieldset className="rounded-xl border border-[#ded8ce] bg-[#fbfaf7] p-4">
      <legend className="px-1 text-sm font-semibold text-[#183b3a]">{title}</legend>
      <p className="mb-3 text-xs leading-5 text-[#62645f]">{hint}</p>
      <label className={labelClass}>
        Address
        <div className="relative">
          <input
            required
            value={value.address}
            onChange={(event) => {
              selectedAddressRef.current = "";
              onChange({ address: event.target.value, lat: "", lng: "" });
            }}
            className={inputClass}
            placeholder="Search an area or address"
            autoComplete="off"
          />
          {(searching || visibleSuggestions.length > 0) && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#d7d2c9] bg-white shadow-lg">
              {searching && <p className="px-4 py-3 text-xs text-[#62645f]">Searching areas...</p>}
              {visibleSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.place_id}
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full border-b border-[#eee9e1] px-4 py-3 text-left last:border-0 hover:bg-[#f6f2eb]"
                >
                  <span className="block text-sm font-semibold text-[#183b3a]">
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </span>
                  {suggestion.structured_formatting?.secondary_text && (
                    <span className="mt-1 block text-xs text-[#62645f]">
                      {suggestion.structured_formatting.secondary_text}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </label>
    </fieldset>
  );
}
