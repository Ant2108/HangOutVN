"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import type { Place, Province } from "@/lib/types";
import { getPlaceDirectionsUrl, getPlaceMapUrl } from "@/lib/maps";
import {
  CATEGORY_LABELS,
  cn,
  formatPricePerPerson,
  getPricePerPerson,
  removeVietnameseTones,
} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 30;

interface MapExplorerClientProps {
  places: Place[];
  provinces: Province[];
  regions: string[];
}

export function MapExplorerClient({
  places,
  provinces,
  regions,
}: MapExplorerClientProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleProvinces = useMemo(() => {
    if (selectedRegion === "all") return provinces;
    return provinces.filter((p) => p.region === selectedRegion);
  }, [provinces, selectedRegion]);

  const districtsForProvince = useMemo(() => {
    if (selectedProvince === "all") return [];
    const counts = new Map<string, number>();
    for (const p of places) {
      if (p.province === selectedProvince && p.district) {
        counts.set(p.district, (counts.get(p.district) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [places, selectedProvince]);

  const filteredPlaces = useMemo(() => {
    const q = removeVietnameseTones(query);
    return places.filter((place) => {
      if (selectedRegion !== "all" && place.region !== selectedRegion) return false;
      if (selectedProvince !== "all" && place.province !== selectedProvince) return false;
      if (selectedDistrict !== "all" && place.district !== selectedDistrict) return false;
      if (q) {
        const blob = removeVietnameseTones(
          `${place.name} ${place.address} ${place.district || ""} ${place.province}`
        );
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [places, selectedRegion, selectedProvince, selectedDistrict, query]);

  const slice = useMemo(
    () => filteredPlaces.slice(0, visibleCount),
    [filteredPlaces, visibleCount]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
      {/* Header */}
      <div className="border-b border-[#242424]/10 pb-8">
        <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-[#D84B20]">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Bản đồ &amp; Điều hướng Google Maps
        </span>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-[#242424] sm:text-5xl">
          Tra cứu địa chỉ khắp 34 tỉnh/thành
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-[#5C564F] sm:text-base">
          Chọn vùng miền hoặc tỉnh/thành để xem nhanh địa chỉ chi tiết và mở trực
          tiếp vị trí hoặc chỉ đường trên Google Maps chỉ với một chạm.
        </p>
      </div>

      {/* Region Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedRegion("all");
            setSelectedProvince("all");
            setSelectedDistrict("all");
            setVisibleCount(PAGE_SIZE);
          }}
          className={cn(
            "min-h-[38px] rounded-full border px-4 py-1.5 text-xs font-bold cursor-pointer transition-colors",
            selectedRegion === "all"
              ? "border-[#242424] bg-[#242424] text-[#FFF8ED]"
              : "border-[#242424]/14 bg-white text-[#242424] hover:bg-[#F6EBD8]"
          )}
        >
          Tất cả 6 vùng (34 tỉnh/thành)
        </button>
        {regions.map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => {
              setSelectedRegion(region);
              setSelectedProvince("all");
              setSelectedDistrict("all");
              setVisibleCount(PAGE_SIZE);
            }}
            className={cn(
              "min-h-[38px] rounded-full border px-4 py-1.5 text-xs font-bold cursor-pointer transition-colors",
              selectedRegion === region
                ? "border-[#242424] bg-[#FF7043] text-[#242424]"
                : "border-[#242424]/14 bg-white text-[#242424] hover:bg-[#F6EBD8]"
            )}
          >
            {region}
          </button>
        ))}
      </div>

      {/* 34 Provinces Selector Grid */}
      <div className="mt-5 rounded-[24px] border border-[#242424]/12 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-extrabold text-[#242424]">
            Danh mục tỉnh/thành ({visibleProvinces.length})
          </h2>
          {selectedProvince !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedProvince("all");
                setVisibleCount(PAGE_SIZE);
              }}
              className="text-xs font-bold text-[#D84B20] hover:underline cursor-pointer"
            >
              Xem tất cả tỉnh trong vùng
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleProvinces.map((prov) => {
            const active = selectedProvince === prov.name;
            return (
              <button
                key={prov.slug}
                type="button"
                onClick={() => {
                  setSelectedProvince(active ? "all" : prov.name);
                  setSelectedDistrict("all");
                  setVisibleCount(PAGE_SIZE);
                }}
                title={`Hợp nhất từ: ${prov.mergedFrom}`}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors",
                  active
                    ? "border-[#242424] bg-[#B7E4C7] text-[#242424]"
                    : "border-[#242424]/12 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                )}
              >
                <span>{prov.name}</span>
                <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[#5C564F]">
                  {prov.placeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* District chips when a province with multiple districts is selected */}
        {districtsForProvince.length > 1 && (
          <div className="mt-4 border-t border-[#242424]/10 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                Quận / Huyện / Khu vực — {selectedProvince} ({districtsForProvince.length})
              </h3>
              {selectedDistrict !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrict("all");
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="text-xs font-bold text-[#D84B20] hover:underline cursor-pointer"
                >
                  Tất cả quận
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict("all");
                  setVisibleCount(PAGE_SIZE);
                }}
                className={cn(
                  "min-h-[34px] rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
                  selectedDistrict === "all"
                    ? "border-[#242424] bg-[#242424] text-[#FFF8ED]"
                    : "border-[#242424]/12 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                )}
              >
                Tất cả
              </button>
              {districtsForProvince.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => {
                    setSelectedDistrict(selectedDistrict === d.name ? "all" : d.name);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={cn(
                    "inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors",
                    selectedDistrict === d.name
                      ? "border-[#242424] bg-[#FF7043] text-[#242424]"
                      : "border-[#242424]/12 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
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
      </div>

      {/* Search Address Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C564F]"
          />
          <Input
            type="search"
            aria-label="Tìm theo tên đường, quận hoặc tên quán"
            placeholder="Lọc theo tên đường, quận hoặc tên quán (không cần dấu)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="pl-11"
          />
        </div>
        <p className="text-sm font-semibold text-[#5C564F]">
          Tìm thấy{" "}
          <strong className="font-display text-base font-extrabold text-[#242424]">
            {filteredPlaces.length.toLocaleString("vi-VN")}
          </strong>{" "}
          tọa độ
        </p>
      </div>

      {/* Address-first Location Directory */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slice.map((place) => {
          const mapUrl = getPlaceMapUrl(place);
          const dirUrl = getPlaceDirectionsUrl(place);
          return (
            <article
              key={place.id}
              className="editorial-card flex flex-col justify-between p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#F6EBD8] px-2.5 py-1 text-[11px] font-bold text-[#242424]">
                    <MapPin className="h-3 w-3 text-[#D84B20]" aria-hidden="true" />
                    {place.province}
                    {place.district && place.district !== place.province
                      ? ` · ${place.district}`
                      : ""}
                  </span>
                  <span className="text-[11px] font-bold text-[#5C564F]">
                    {formatPricePerPerson(getPricePerPerson(place))}
                  </span>
                </div>

                <Link href={`/places/${place.id}`} className="mt-3 block group">
                  <h3 className="font-display text-base font-extrabold text-[#242424] group-hover:text-[#D84B20] transition-colors line-clamp-1">
                    {place.name}
                  </h3>
                </Link>

                <p className="mt-1.5 text-xs leading-relaxed text-[#5C564F] line-clamp-2">
                  {place.address}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {place.category.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-[#242424]/10 bg-[#FFF8ED] px-2 py-0.5 text-[10px] font-semibold text-[#5C564F]"
                    >
                      {CATEGORY_LABELS[c]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#242424]/8 pt-3.5">
                <a
                  href={dirUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF7043] px-3 py-1.5 font-display text-xs font-bold text-[#242424] hover:bg-[#ff5f2e] transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Chỉ đường
                </a>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-[#242424]/16 bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] hover:bg-[#FFF8ED]"
                >
                  Maps
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <Link
                  href={`/places/${place.id}`}
                  aria-label={`Chi tiết ${place.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#242424]/16 bg-[#242424] text-[#FFF8ED] hover:bg-[#3a3734]"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount < filteredPlaces.length && (
        <div className="mt-10 flex justify-center">
          <Button
            type="button"
            variant="dark"
            size="lg"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Xem thêm tọa độ (+{Math.min(PAGE_SIZE, filteredPlaces.length - visibleCount)})
          </Button>
        </div>
      )}
    </div>
  );
}
