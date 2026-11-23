import type { Place } from "./types";

/**
 * Official Google Maps Search URL pattern (no API key required).
 */
export function getGoogleMapsSearchUrl(address: string, placeName?: string): string {
  const query = [placeName, address].filter(Boolean).join(", ").trim();
  const params = new URLSearchParams({
    api: "1",
    query: query || "Vietnam",
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Official Google Maps Directions URL pattern (no API key required).
 */
export function getGoogleMapsDirectionUrl(address: string, placeName?: string): string {
  const destination = [placeName, address].filter(Boolean).join(", ").trim();
  const params = new URLSearchParams({
    api: "1",
    destination: destination || "Vietnam",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Resolve the best Google Maps search URL for a place:
 * uses the verified URL from the source spreadsheet if available,
 * otherwise constructs a clean official Google Maps Search URL.
 */
export function getPlaceMapUrl(place: Pick<Place, "name" | "address" | "province" | "googleMapsUrl">): string {
  if (place.googleMapsUrl && place.googleMapsUrl.startsWith("https://www.google.com/maps")) {
    return place.googleMapsUrl;
  }
  const fullAddress = place.address.toLowerCase().includes(place.province.toLowerCase())
    ? place.address
    : `${place.address}, ${place.province}`;
  return getGoogleMapsSearchUrl(fullAddress, place.name);
}

export function getPlaceDirectionsUrl(place: Pick<Place, "name" | "address" | "province">): string {
  const fullAddress = place.address.toLowerCase().includes(place.province.toLowerCase())
    ? place.address
    : `${place.address}, ${place.province}`;
  return getGoogleMapsDirectionUrl(fullAddress, place.name);
}
