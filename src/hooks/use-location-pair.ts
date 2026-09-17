"use client";

import { useState } from "react";
import { emptyLocation, type LocationForm } from "@/components/forms/location-fields";

type LocationRecord = { area?: string; city?: string; state?: string };
type LocationResponse = { items?: LocationRecord[]; data?: LocationRecord[] | { items?: LocationRecord[] } };

const locationLabel = (location: LocationRecord) =>
  [location.area, location.city, location.state].filter(Boolean).join(", ");

const responseItems = (response: LocationResponse | null) =>
  response?.items || (Array.isArray(response?.data) ? response.data : response?.data?.items) || [];

export function useLocationPair() {
  const [from, setFrom] = useState<LocationForm>(emptyLocation);
  const [to, setTo] = useState<LocationForm>(emptyLocation);
  const [currentLocation, setCurrentLocation] = useState<LocationForm>(emptyLocation);
  const [locating, setLocating] = useState<"from" | "to" | null>(null);
  const [locationError, setLocationError] = useState("");

  const requestCurrentLocation = (target: "from" | "to") => {
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser. Enter the coordinates manually.");
      return;
    }
    setLocationError("");
    setLocating(target);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { address: "", lat: String(coords.latitude), lng: String(coords.longitude) };
        fetch(`/api/v1/locations/nearby?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}&radiusKm=25&limit=1`)
          .then((response) => (response.ok ? response.json() as Promise<LocationResponse> : null))
          .then((response) => {
            const nearby = responseItems(response);
            const address = nearby[0] ? locationLabel(nearby[0]) : "";
            const resolvedLocation = { ...location, address: address || "Current location" };
            setCurrentLocation(resolvedLocation);
            if (target === "from") setFrom(resolvedLocation);
            else setTo(resolvedLocation);
          })
          .catch(() => {
            setCurrentLocation({ ...location, address: "Current location" });
            if (target === "from") setFrom({ ...location, address: "Current location" });
            else setTo({ ...location, address: "Current location" });
          })
          .finally(() => setLocating(null));
      },
      (locationError) => {
        setLocating(null);
        setLocationError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. You can allow it in Chrome site settings or enter coordinates manually."
            : "Could not determine your location. Enter the coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return { from, setFrom, to, setTo, currentLocation, locating, requestCurrentLocation, locationError, setLocationError };
}
