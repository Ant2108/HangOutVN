import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BudgetBucket, CategoryId } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function removeVietnameseTones(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function formatVnd(amount?: number): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "Đang cập nhật";
  }
  if (amount === 0) return "Miễn phí";
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

export function getPricePerPerson(place: {
  priceMin?: number;
  priceMax?: number;
  priceForTwo?: number;
}): number {
  if (place.priceMin !== undefined && place.priceMax !== undefined) {
    return Math.round((place.priceMin + place.priceMax) / 2);
  }
  if (place.priceForTwo !== undefined && place.priceForTwo !== null) {
    return Math.round(place.priceForTwo / 2);
  }
  return 0;
}

export function formatPricePerPerson(pricePerPerson?: number): string {
  if (pricePerPerson === undefined || pricePerPerson === null) return "Đang cập nhật";
  if (pricePerPerson === 0) return "Miễn phí (0đ)";
  return `~${Math.round(pricePerPerson / 1000)}k / người`;
}

export function formatPriceForTwo(priceForTwo?: number): string {
  if (priceForTwo === undefined || priceForTwo === null) return "Đang cập nhật";
  return formatPricePerPerson(Math.round(priceForTwo / 2));
}

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  food: "Ăn uống",
  coffee: "Cà phê",
  date: "Hẹn hò",
  chill: "Chill",
  fun: "Vui chơi",
  travel: "Khám phá",
};

export const CATEGORY_STYLES: Record<
  CategoryId,
  { bg: string; text: string; border: string }
> = {
  food: { bg: "bg-[#FF7043]/15", text: "text-[#B83B14]", border: "border-[#FF7043]/30" },
  coffee: { bg: "bg-[#FFD166]/35", text: "text-[#7A5200]", border: "border-[#FFD166]/60" },
  date: { bg: "bg-[#FFB4C2]/35", text: "text-[#8F243B]", border: "border-[#FFB4C2]/60" },
  chill: { bg: "bg-[#B7E4C7]/45", text: "text-[#1E5631]", border: "border-[#B7E4C7]/70" },
  fun: { bg: "bg-[#FFD166]/30", text: "text-[#6E4900]", border: "border-[#242424]/15" },
  travel: { bg: "bg-[#B7E4C7]/35", text: "text-[#1E5631]", border: "border-[#242424]/15" },
};

export const BUDGET_OPTIONS: { value: BudgetBucket; label: string; shortLabel: string }[] = [
  { value: "all", label: "Tất cả ngân sách", shortLabel: "Tất cả" },
  { value: "under-100k", label: "Dưới 50k / người", shortLabel: "< 50k" },
  { value: "100k-200k", label: "50k – 100k / người", shortLabel: "50k–100k" },
  { value: "200k-300k", label: "100k – 150k / người", shortLabel: "100k–150k" },
  { value: "300k-500k", label: "150k – 250k / người", shortLabel: "150k–250k" },
  { value: "above-500k", label: "Trên 250k / người", shortLabel: "> 250k" },
];

export function matchesBudgetBucket(pricePerPerson: number | undefined, bucket: BudgetBucket): boolean {
  if (bucket === "all") return true;
  const price = pricePerPerson ?? 0;
  switch (bucket) {
    case "under-100k":
      return price <= 50000;
    case "100k-200k":
      return price > 50000 && price <= 100000;
    case "200k-300k":
      return price > 100000 && price <= 150000;
    case "300k-500k":
      return price > 150000 && price <= 250000;
    case "above-500k":
      return price > 250000;
    default:
      return true;
  }
}
