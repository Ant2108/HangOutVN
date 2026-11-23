import type { Place } from "./types";

export type PlaceMapInput = Pick<
  Place,
  | "name"
  | "address"
  | "district"
  | "province"
  | "googleMapsUrl"
  | "googlePlaceId"
  | "mapsQuery"
  | "latitude"
  | "longitude"
>;

function cleanAddressForMaps(address: string): string {
  return address
    .replace(/,\s*nhiều\s+(cơ sở|cơ sỏ|chi nhánh).*$/i, "")
    .replace(/\/\s*nhiều\s+(cơ sở|cơ sỏ|chi nhánh).*$/i, "")
    .replace(/\bnhiều\s+(cơ sở|cơ sỏ|chi nhánh)\b/gi, "")
    .replace(/\s*\([^)]*cũ[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,\s/-]+|[,\s/-]+$/g, "")
    .trim();
}

/**
 * Build a clean, unambiguous query string for Google Maps that never
 * duplicates the province name or includes vague multi-branch phrases.
 */
export function buildCleanMapsQuery(
  place: Pick<Place, "name" | "address" | "district" | "province" | "mapsQuery">
): string {
  if (place.mapsQuery && place.mapsQuery.trim()) {
    return place.mapsQuery.trim();
  }

  const cleanedAddress = cleanAddressForMaps(place.address || "");
  const lowerAddr = cleanedAddress.toLowerCase();
  const bareProv = place.province.replace(/^TP\.\s*/i, "").toLowerCase();

  const parts: string[] = [];
  if (place.name?.trim()) {
    parts.push(place.name.trim());
  }
  if (cleanedAddress && lowerAddr !== place.province.toLowerCase()) {
    parts.push(cleanedAddress);
  }
  if (
    place.district &&
    place.district !== place.province &&
    !lowerAddr.includes(place.district.toLowerCase())
  ) {
    parts.push(place.district);
  }
  if (
    !lowerAddr.includes(bareProv) &&
    !lowerAddr.includes(place.province.toLowerCase())
  ) {
    parts.push(place.province);
  }

  return parts.join(", ").trim() || "Vietnam";
}

/**
 * Official Google Maps Search URL pattern (no API key required).
 */
export function getGoogleMapsSearchUrl(
  address: string,
  placeName?: string,
  placeId?: string
): string {
  const query = [placeName, address].filter(Boolean).join(", ").trim();
  const params = new URLSearchParams({
    api: "1",
    query: query || "Vietnam",
  });
  if (placeId) {
    params.set("query_place_id", placeId);
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Official Google Maps Directions URL pattern (no API key required).
 */
export function getGoogleMapsDirectionUrl(
  destination: string,
  placeName?: string,
  placeId?: string
): string {
  const dest = [placeName, destination].filter(Boolean).join(", ").trim();
  const params = new URLSearchParams({
    api: "1",
    destination: dest || "Vietnam",
  });
  if (placeId) {
    params.set("destination_place_id", placeId);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Resolve the most accurate Google Maps Pin URL for a place:
 * 1. Exact Google Place ID (`query_place_id=ChIJ...`) — pins the exact Google Maps business entity.
 * 2. Verified direct `/maps/place/...` or `maps.app.goo.gl/...` pin URL.
 * 3. Exact verified GPS coordinates (`latitude,longitude`).
 * 4. Clean normalized `name, address, district, province` search URL.
 */
export function getPlaceMapUrl(place: PlaceMapInput): string {
  const cleanQuery = buildCleanMapsQuery(place);

  if (place.googlePlaceId) {
    const params = new URLSearchParams({
      api: "1",
      query: cleanQuery,
      query_place_id: place.googlePlaceId,
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  if (
    place.googleMapsUrl &&
    (place.googleMapsUrl.startsWith("https://www.google.com/maps/place/") ||
      place.googleMapsUrl.startsWith("https://maps.app.goo.gl/"))
  ) {
    return place.googleMapsUrl;
  }

  if (
    typeof place.latitude === "number" &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ) {
    const params = new URLSearchParams({
      api: "1",
      query: `${place.latitude},${place.longitude}`,
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    api: "1",
    query: cleanQuery,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Resolve the most accurate Google Maps Directions URL for a place:
 * 1. Exact Google Place ID (`destination_place_id=ChIJ...`).
 * 2. Exact verified GPS coordinates (`destination=lat,lng`).
 * 3. Clean normalized `name, address, district, province` destination.
 */
export function getPlaceDirectionsUrl(place: PlaceMapInput): string {
  const cleanQuery = buildCleanMapsQuery(place);

  if (place.googlePlaceId) {
    const params = new URLSearchParams({
      api: "1",
      destination: cleanQuery,
      destination_place_id: place.googlePlaceId,
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  if (
    typeof place.latitude === "number" &&
    typeof place.longitude === "number" &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ) {
    const params = new URLSearchParams({
      api: "1",
      destination: `${place.latitude},${place.longitude}`,
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  const params = new URLSearchParams({
    api: "1",
    destination: cleanQuery,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
