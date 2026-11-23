"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Clock,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type {
  BudgetBucket,
  CategoryId,
  CategoryMeta,
  ExploreFilters,
  Place,
  Province,
  SortOption,
} from "@/lib/types";
import { buildSearchIndex, filterAndSortPlaces } from "@/lib/search";
import { BUDGET_OPTIONS, cn, getPlaceOpenStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { PlaceCard } from "@/components/places/PlaceCard";

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: ExploreFilters = {
  query: "",
  province: "all",
  district: "all",
  category: "all",
  budget: "all",
  vibe: "all",
  onlyWithMenu: false,
  onlyOpenNow: false,
  sort: "featured",
};

interface ExploreClientProps {
  places: Place[];
  provinces: Province[];
  categories: CategoryMeta[];
  vibes: string[];
}

export function ExploreClient({
  places,
  provinces,
  categories,
  vibes,
}: ExploreClientProps) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ExploreFilters>(() => {
    const q = searchParams.get("q") || "";
    const prov = searchParams.get("province") || "all";
    const dist = searchParams.get("district") || "all";
    const cat = (searchParams.get("category") as CategoryId | null) || "all";
    const budget = (searchParams.get("budget") as BudgetBucket | null) || "all";
    const vibe = searchParams.get("vibe") || "all";
    const validProv = provinces.some((p) => p.name === prov) ? prov : "all";

    return {
      ...DEFAULT_FILTERS,
      query: q,
      province: validProv,
      district: validProv !== "all" ? dist : "all",
      category: categories.some((c) => c.id === cat) ? cat : "all",
      budget: BUDGET_OPTIONS.some((b) => b.value === budget) ? budget : "all",
      vibe: vibes.includes(vibe) ? vibe : "all",
    };
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const indexed = useMemo(() => buildSearchIndex(places), [places]);

  const results = useMemo(
    () => filterAndSortPlaces(indexed, filters),
    [indexed, filters]
  );

  const visiblePlaces = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  const activeFilterCount = [
    filters.province !== "all",
    filters.district !== "all",
    filters.category !== "all",
    filters.budget !== "all",
    filters.vibe !== "all",
    filters.onlyWithMenu,
    Boolean(filters.onlyOpenNow),
    filters.query.trim().length > 0,
  ].filter(Boolean).length;

  const districtsForProvince = useMemo(() => {
    if (filters.province === "all") return [];
    const counts = new Map<string, number>();
    for (const p of places) {
      if (p.province === filters.province && p.district) {
        counts.set(p.district, (counts.get(p.district) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [places, filters.province]);

  const menuPlaceCount = useMemo(
    () => places.filter((p) => Boolean(p.menuUrl)).length,
    [places]
  );

  const openNowPlaceCount = useMemo(
    () => places.filter((p) => getPlaceOpenStatus(p.openingHours).isOpen).length,
    [places]
  );

  const updateFilter = <K extends keyof ExploreFilters>(
    key: K,
    value: ExploreFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "province" ? { district: "all" } : {}),
    }));
    setVisibleCount(PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  };

  const renderFilterControls = () => (
    <div className="space-y-6">
      {/* Province */}
      <div>
        <label
          htmlFor="filter-province"
          className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
        >
          Tỉnh / Thành phố (34)
        </label>
        <Select
          id="filter-province"
          value={filters.province}
          onChange={(e) => updateFilter("province", e.target.value)}
        >
          <option value="all">Tất cả 34 tỉnh/thành</option>
          {provinces.map((prov) => (
            <option key={prov.slug} value={prov.name}>
              {prov.name} ({prov.placeCount})
            </option>
          ))}
        </Select>
      </div>

      {/* District (shown when a province with multiple districts is selected) */}
      {districtsForProvince.length > 1 && (
        <div>
          <label
            htmlFor="filter-district"
            className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
          >
            Quận / Huyện / Khu vực ({districtsForProvince.length})
          </label>
          <Select
            id="filter-district"
            value={filters.district}
            onChange={(e) => updateFilter("district", e.target.value)}
          >
            <option value="all">Tất cả quận tại {filters.province}</option>
            {districtsForProvince.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.count})
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Open Now & Menu Availability Filters */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => updateFilter("onlyOpenNow", !filters.onlyOpenNow)}
          aria-pressed={Boolean(filters.onlyOpenNow)}
          className={cn(
            "flex min-h-[42px] w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors",
            filters.onlyOpenNow
              ? "border-[#242424] bg-[#B7E4C7] text-[#1E5631]"
              : "border-[#242424]/15 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#1E5631]" aria-hidden="true" />
            Ẩn quán đã đóng cửa
          </span>
          <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-extrabold text-[#1E5631]">
            {openNowPlaceCount} mở
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateFilter("onlyWithMenu", !filters.onlyWithMenu)}
          aria-pressed={filters.onlyWithMenu}
          className={cn(
            "flex min-h-[42px] w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-xs font-bold cursor-pointer transition-colors",
            filters.onlyWithMenu
              ? "border-[#242424] bg-[#FFD166] text-[#242424]"
              : "border-[#242424]/15 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
          )}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#D84B20]" aria-hidden="true" />
            Chỉ hiện quán có Menu
          </span>
          <span className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-extrabold text-[#242424]">
            {menuPlaceCount}
          </span>
        </button>
      </div>

      {/* Category */}
      <div>
        <p className="mb-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
          Danh mục
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateFilter("category", "all")}
            className={cn(
              "min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors",
              filters.category === "all"
                ? "border-[#242424] bg-[#242424] text-[#FFF8ED]"
                : "border-[#242424]/15 bg-white text-[#242424] hover:bg-[#F6EBD8]"
            )}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilter("category", cat.id)}
              className={cn(
                "min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors",
                filters.category === cat.id
                  ? "border-[#242424] bg-[#FF7043] text-[#242424]"
                  : "border-[#242424]/15 bg-white text-[#242424] hover:bg-[#F6EBD8]"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label
          htmlFor="filter-budget"
          className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
        >
          Ngân sách (1 người)
        </label>
        <Select
          id="filter-budget"
          value={filters.budget}
          onChange={(e) => updateFilter("budget", e.target.value as BudgetBucket)}
        >
          {BUDGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Atmosphere / Vibe */}
      <div>
        <p className="mb-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
          Không khí / Vibe
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => updateFilter("vibe", "all")}
            className={cn(
              "min-h-[34px] rounded-xl border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
              filters.vibe === "all"
                ? "border-[#242424] bg-[#242424] text-[#FFF8ED]"
                : "border-[#242424]/14 bg-white text-[#242424] hover:bg-[#F6EBD8]"
            )}
          >
            Mọi vibe
          </button>
          {vibes.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => updateFilter("vibe", v)}
              className={cn(
                "min-h-[34px] rounded-xl border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
                filters.vibe === v
                  ? "border-[#242424] bg-[#B7E4C7] text-[#242424]"
                  : "border-[#242424]/14 bg-white text-[#242424] hover:bg-[#F6EBD8]"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          type="button"
          variant="soft"
          className="w-full"
          onClick={resetFilters}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Xóa tất cả bộ lọc ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 border-b border-[#242424]/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-[#D84B20]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Khám phá toàn quốc
          </span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-[#242424] sm:text-5xl">
            Tìm tọa độ đúng gu
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5C564F] sm:text-base">
            Tìm theo tên quán, địa chỉ, món ăn hoặc quận — hỗ trợ gõ tiếng Việt
            không dấu (ví dụ: &ldquo;banh mi&rdquo;, &ldquo;tra sua&rdquo;, &ldquo;ho tay&rdquo;).
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[#242424]/12 bg-white px-4 py-2.5 text-sm">
          <span className="font-display text-xl font-extrabold text-[#D84B20]">
            {results.length.toLocaleString("vi-VN")}
          </span>
          <span className="text-[#5C564F]">địa điểm phù hợp</span>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C564F]"
          />
          <Input
            type="search"
            aria-label="Tìm kiếm địa điểm theo tên, địa chỉ hoặc món ăn"
            placeholder="Tìm tên quán, địa chỉ, quận, món ngon (hỗ trợ không dấu)..."
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            className="pl-11 pr-10"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => updateFilter("query", "")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5C564F] hover:bg-[#F6EBD8] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mobile filter sheet trigger */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSheetOpen(true)}
            className="h-12 flex-1 sm:flex-none lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF7043] text-[11px] font-bold text-[#242424]">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Select
            aria-label="Sắp xếp kết quả"
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value as SortOption)}
            wrapperClassName="min-w-[180px] flex-1 sm:flex-none"
            className="h-12"
          >
            <option value="featured">Sắp xếp: Nổi bật</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
            <option value="name-asc">Tên: A → Z</option>
            <option value="name-desc">Tên: Z → A</option>
          </Select>
        </div>
      </div>

      {/* Main Layout: Sidebar (Desktop) + Results Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 rounded-[24px] border border-[#242424]/12 bg-white p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#242424]/8 pb-4">
              <h2 className="font-display text-base font-extrabold text-[#242424]">
                Bộ lọc thông minh
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-bold text-[#D84B20] hover:underline cursor-pointer"
                >
                  Đặt lại
                </button>
              )}
            </div>
            {renderFilterControls()}
          </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-9">
          {/* Quick District Filter Bar when a city/province is selected */}
          {districtsForProvince.length > 1 && (
            <div className="mb-5 rounded-[20px] border border-[#242424]/12 bg-white p-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                  Lọc nhanh theo quận — {filters.province}
                </span>
                {filters.district !== "all" && (
                  <button
                    type="button"
                    onClick={() => updateFilter("district", "all")}
                    className="text-xs font-bold text-[#D84B20] hover:underline cursor-pointer"
                  >
                    Tất cả quận
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => updateFilter("district", "all")}
                  className={cn(
                    "min-h-[34px] rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
                    filters.district === "all"
                      ? "border-[#242424] bg-[#242424] text-[#FFF8ED]"
                      : "border-[#242424]/14 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                  )}
                >
                  Tất cả
                </button>
                {districtsForProvince.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => updateFilter("district", d.name)}
                    className={cn(
                      "inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
                      filters.district === d.name
                        ? "border-[#242424] bg-[#FF7043] text-[#242424]"
                        : "border-[#242424]/14 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                    )}
                  >
                    <span>{d.name}</span>
                    <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[#5C564F]">
                      {d.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[26px] border border-[#242424]/12 bg-white px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFD166]/45 text-[#242424]">
                <Search className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-extrabold text-[#242424]">
                Chưa tìm thấy địa điểm nào khớp bộ lọc
              </h3>
              <p className="mt-2 max-w-md text-sm text-[#5C564F]">
                Thử nới lỏng mức ngân sách, đổi tỉnh/thành hoặc xóa bớt từ khóa
                tìm kiếm để xem thêm nhiều tọa độ thú vị khác nhé.
              </p>
              <Button type="button" onClick={resetFilters} className="mt-6">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Xóa tất cả bộ lọc
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visiblePlaces.map((place, idx) => (
                  <PlaceCard key={place.id} place={place} priority={idx < 3} />
                ))}
              </div>

              {/* Load More Pagination */}
              {visibleCount < results.length && (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="text-xs font-medium text-[#5C564F]">
                    Đang hiển thị {visiblePlaces.length.toLocaleString("vi-VN")} /{" "}
                    {results.length.toLocaleString("vi-VN")} địa điểm
                  </p>
                  <Button
                    type="button"
                    variant="dark"
                    size="lg"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  >
                    Tải thêm địa điểm (+{Math.min(PAGE_SIZE, results.length - visibleCount)})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Bộ lọc địa điểm"
        description={`${results.length.toLocaleString("vi-VN")} địa điểm đang khớp lựa chọn của bạn`}
      >
        {renderFilterControls()}
        <div className="mt-6 pt-4 border-t border-[#242424]/10">
          <Button
            type="button"
            variant="dark"
            className="w-full"
            onClick={() => setSheetOpen(false)}
          >
            Xem {results.length.toLocaleString("vi-VN")} kết quả
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
