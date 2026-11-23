import { z } from "zod";

export const CategoryIdSchema = z.enum([
  "food",
  "coffee",
  "date",
  "chill",
  "fun",
  "travel",
]);

export type CategoryId = z.infer<typeof CategoryIdSchema>;

export const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1),
  region: z.string().optional(),
  district: z.string().optional(),
  address: z.string().min(1),
  category: z.array(CategoryIdSchema).min(1),
  primaryType: z.string().optional(),
  subTag: z.string().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  priceForTwo: z.number().nonnegative().optional(),
  priceRangeLabel: z.string().optional(),
  budgetTier: z.string().optional(),
  openingHours: z.string().optional(),
  vibe: z.array(z.string()).min(1),
  description: z.string().optional(),
  images: z.array(z.string()).min(1),
  googleMapsUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  mapsQuery: z.string().optional(),
  menuUrl: z.string().optional(),
  reviewUrl: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sourceChannel: z.string().optional(),
  sourceRef: z.string().optional(),
  featured: z.boolean().optional(),
});

export type Place = z.infer<typeof PlaceSchema>;

export interface Province {
  code: number;
  slug: string;
  name: string;
  region: string;
  mergedFrom: string;
  placeCount: number;
  avgPricePerPerson: number;
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  englishName: string;
  tagline: string;
  accent: string;
  image: string;
  count: number;
}

export type BudgetBucket =
  | "all"
  | "under-100k"
  | "100k-200k"
  | "200k-300k"
  | "300k-500k"
  | "above-500k";

export type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

export interface ExploreFilters {
  query: string;
  province: string;
  district: string;
  category: CategoryId | "all";
  budget: BudgetBucket;
  vibe: string;
  onlyWithMenu: boolean;
  onlyOpenNow?: boolean;
  sort: SortOption;
}

export type CompanionType = "any" | "lover" | "friends" | "family";
export type ActivityType = "any" | "eating" | "coffee" | "entertainment" | "chill" | "date";

export interface RecommendationInput {
  province: string;
  district: string;
  budget: BudgetBucket;
  companion: CompanionType;
  activity: ActivityType;
  vibe: string;
  onlyOpenNow?: boolean;
}

export interface OpenStatusInfo {
  isOpen: boolean;
  isClosingSoon: boolean;
  label: string;
  detail: string;
}

export interface RecommendationResult {
  place: Place;
  reasons: string[];
  matchCount: number;
}
