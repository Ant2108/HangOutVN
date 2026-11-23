import locationsRaw from "@/data/locations.json";
import provincesRaw from "@/data/provinces.json";
import categoriesRaw from "@/data/categories.json";
import type { CategoryMeta, Place, Province } from "./types";

const locations = locationsRaw as Place[];
const provinces = provincesRaw as Province[];
const categories = categoriesRaw as CategoryMeta[];

const placeByIdMap = new Map<string, Place>(locations.map((p) => [p.id, p]));

export function getAllPlaces(): Place[] {
  return locations;
}

export function getAllProvinces(): Province[] {
  return provinces;
}

export function getAllCategories(): CategoryMeta[] {
  return categories;
}

export function getPlaceById(id: string): Place | undefined {
  return placeByIdMap.get(id.toLowerCase());
}

export function getFeaturedPlaces(limit = 8): Place[] {
  const featured = locations.filter((p) => p.featured);
  // Pick a geographically diverse set so users see Vietnam-wide coverage
  const seenProvinces = new Set<string>();
  const diverse: Place[] = [];
  for (const p of featured) {
    if (!seenProvinces.has(p.province)) {
      diverse.push(p);
      seenProvinces.add(p.province);
      if (diverse.length >= limit) break;
    }
  }
  if (diverse.length < limit) {
    for (const p of featured) {
      if (!diverse.includes(p)) {
        diverse.push(p);
        if (diverse.length >= limit) break;
      }
    }
  }
  return diverse;
}

export function getAllVibes(): string[] {
  const counts = new Map<string, number>();
  for (const place of locations) {
    for (const v of place.vibe) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([vibe]) => vibe);
}

export function getSimilarPlaces(place: Place, limit = 4): Place[] {
  const scored = locations
    .filter((candidate) => candidate.id !== place.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.province === place.province) score += 5;
      if (candidate.district && place.district && candidate.district === place.district) score += 3;
      const sharedCats = candidate.category.filter((c) => place.category.includes(c)).length;
      score += sharedCats * 2;
      const sharedVibes = candidate.vibe.filter((v) => place.vibe.includes(v)).length;
      score += sharedVibes;
      if (candidate.featured) score += 1;
      return { candidate, score };
    })
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.candidate);
}

export function getRegions(): string[] {
  const seen = new Set<string>();
  for (const p of provinces) {
    if (p.region) seen.add(p.region);
  }
  return Array.from(seen);
}
