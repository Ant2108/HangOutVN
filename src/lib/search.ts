import type { ExploreFilters, Place } from "./types";
import {
  getPlaceOpenStatus,
  getPricePerPerson,
  matchesBudgetBucket,
  removeVietnameseTones,
} from "./utils";

export interface IndexedPlace {
  place: Place;
  searchBlob: string;
}

export function buildSearchIndex(places: Place[]): IndexedPlace[] {
  return places.map((place) => ({
    place,
    searchBlob: removeVietnameseTones(
      [
        place.name,
        place.address,
        place.province,
        place.district,
        place.subTag,
        place.primaryType,
        place.description,
        ...place.vibe,
      ]
        .filter(Boolean)
        .join(" ")
    ),
  }));
}

export function filterAndSortPlaces(
  indexed: IndexedPlace[],
  filters: ExploreFilters,
  now?: Date
): Place[] {
  const refTime = now ?? new Date();
  const normalizedQuery = removeVietnameseTones(filters.query);
  const tokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  const matched: Place[] = [];

  for (const item of indexed) {
    const { place, searchBlob } = item;

    if (filters.onlyOpenNow && !getPlaceOpenStatus(place.openingHours, refTime).isOpen) {
      continue;
    }

    if (filters.province !== "all" && place.province !== filters.province) {
      continue;
    }

    if (filters.district !== "all" && place.district !== filters.district) {
      continue;
    }

    if (filters.category !== "all" && !place.category.includes(filters.category)) {
      continue;
    }

    if (!matchesBudgetBucket(getPricePerPerson(place), filters.budget)) {
      continue;
    }

    if (filters.vibe !== "all" && !place.vibe.includes(filters.vibe)) {
      continue;
    }

    if (filters.onlyWithMenu && !place.menuUrl) {
      continue;
    }

    if (tokens.length > 0) {
      let allMatch = true;
      for (const token of tokens) {
        if (!searchBlob.includes(token)) {
          allMatch = false;
          break;
        }
      }
      if (!allMatch) continue;
    }

    matched.push(place);
  }

  switch (filters.sort) {
    case "price-asc":
      matched.sort((a, b) => getPricePerPerson(a) - getPricePerPerson(b));
      break;
    case "price-desc":
      matched.sort((a, b) => getPricePerPerson(b) - getPricePerPerson(a));
      break;
    case "name-asc":
      matched.sort((a, b) => a.name.localeCompare(b.name, "vi"));
      break;
    case "name-desc":
      matched.sort((a, b) => b.name.localeCompare(a.name, "vi"));
      break;
    case "featured":
    default:
      matched.sort((a, b) => {
        const openA = getPlaceOpenStatus(a.openingHours, refTime).isOpen ? 1 : 0;
        const openB = getPlaceOpenStatus(b.openingHours, refTime).isOpen ? 1 : 0;
        if (openA !== openB) return openB - openA;
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return (b.description?.length || 0) - (a.description?.length || 0);
      });
      break;
  }

  return matched;
}
