import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import { getAllPlaces, getPlaceById, getSimilarPlaces } from "@/lib/data";
import { getPlaceMapUrl } from "@/lib/maps";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  cn,
  formatPricePerPerson,
  formatVnd,
  getPricePerPerson,
} from "@/lib/utils";
import { GoogleMapsActions } from "@/components/places/GoogleMapsActions";
import { MenuViewer } from "@/components/places/MenuViewer";
import { PlaceCard } from "@/components/places/PlaceCard";
import { SmartBackLink } from "@/components/places/SmartBackLink";
import { Badge } from "@/components/ui/badge";

export function generateStaticParams() {
  return getAllPlaces().map((place) => ({
    id: place.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const place = getPlaceById(id);
  if (!place) {
    return {
      title: "Không tìm thấy địa điểm",
    };
  }

  return {
    title: `${place.name} — ${place.province}`,
    description:
      place.description ||
      `${place.name} tại ${place.address}, ${place.province}. Chi phí dự kiến ${formatPricePerPerson(getPricePerPerson(place))}.`,
    openGraph: {
      title: `${place.name} | HANGOUT VN`,
      description: place.description || `${place.address}, ${place.province}`,
      images: place.images[0] ? [place.images[0]] : undefined,
    },
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const place = getPlaceById(id);

  if (!place) {
    notFound();
  }

  const similarPlaces = getSimilarPlaces(place, 4);
  const heroImage = place.images[0] || "/images/places/food.jpg";

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
      {/* Breadcrumb & Back */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SmartBackLink fallbackHref="/explore" label="Quay lại danh sách" />

        <div className="flex items-center gap-2 text-xs text-[#5C564F]">
          <Link
            href={`/explore?province=${encodeURIComponent(place.province)}`}
            className="font-semibold text-[#242424] hover:text-[#D84B20] hover:underline"
          >
            {place.province}
          </Link>
          {place.district && place.district !== place.province && (
            <>
              <span>/</span>
              <span>{place.district}</span>
            </>
          )}
        </div>
      </div>

      {/* Hero Split Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Visual Gallery Column */}
        <div className="lg:col-span-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[26px] border border-[#242424]/14 bg-[#F6EBD8] shadow-sm">
            <Image
              src={heroImage}
              alt={`${place.name} tại ${place.province}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {place.budgetTier && (
              <span className="absolute left-4 top-4 rounded-full border border-[#242424]/12 bg-[#FFD166] px-3.5 py-1.5 font-display text-xs font-extrabold text-[#242424]">
                Mức giá: {place.budgetTier}
              </span>
            )}
          </div>

          {place.images.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {place.images.slice(1, 4).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#242424]/12 bg-[#F6EBD8]"
                >
                  <Image
                    src={img}
                    alt={`${place.name} góc chụp ${i + 2}`}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="flex flex-col justify-between lg:col-span-6">
          <div>
            {/* Category Badges */}
            <div className="flex flex-wrap gap-2">
              {place.category.map((cat) => {
                const style = CATEGORY_STYLES[cat];
                return (
                  <Link
                    key={cat}
                    href={`/explore?category=${cat}`}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-bold transition-opacity hover:opacity-85",
                      style.bg,
                      style.text,
                      style.border
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Link>
                );
              })}
              {place.primaryType && (
                <Badge variant="outline">{place.primaryType}</Badge>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-[#242424] sm:text-4xl">
              {place.name}
            </h1>

            {place.subTag && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#D84B20]">
                <Tag className="h-4 w-4" aria-hidden="true" />
                {place.subTag}
              </p>
            )}

            <p className="mt-4 text-base leading-relaxed text-[#5C564F]">
              {place.description ||
                `Tọa độ ${place.primaryType?.toLowerCase() || "ăn uống"} nổi bật tại ${place.province}, phù hợp để tụ tập và khám phá cùng bạn bè hoặc người thương.`}
            </p>

            {/* Key Info Cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#242424]/12 bg-white p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                  <Wallet className="h-3.5 w-3.5 text-[#FF7043]" aria-hidden="true" />
                  Chi phí dự kiến (1 người)
                </span>
                <p className="mt-1.5 font-display text-lg font-extrabold text-[#242424]">
                  {formatPricePerPerson(getPricePerPerson(place))}
                </p>
                <p className="mt-0.5 text-xs text-[#5C564F]">
                  Khoảng giá / người:{" "}
                  {place.priceRangeLabel ||
                    (place.priceMin !== undefined && place.priceMax !== undefined
                      ? `${formatVnd(place.priceMin)} – ${formatVnd(place.priceMax)}`
                      : "Đang cập nhật")}
                </p>
              </div>

              <div className="rounded-2xl border border-[#242424]/12 bg-white p-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                  <Clock className="h-3.5 w-3.5 text-[#FF7043]" aria-hidden="true" />
                  Giờ mở cửa (Google Maps)
                </span>
                {place.openingHours ? (
                  <p className="mt-1.5 font-display text-base font-bold text-[#242424]">
                    {place.openingHours}
                  </p>
                ) : (
                  <a
                    href={getPlaceMapUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-display text-sm font-bold text-[#D84B20] hover:underline"
                  >
                    Xem giờ trực tiếp trên Google Maps
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
                <p className="mt-0.5 text-xs text-[#5C564F]">
                  {place.province}
                  {place.region ? ` · ${place.region}` : ""}
                </p>
              </div>
            </div>

            {/* Full Address */}
            <div className="mt-4 rounded-2xl border border-[#242424]/12 bg-[#F6EBD8]/60 p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                <MapPin className="h-3.5 w-3.5 text-[#D84B20]" aria-hidden="true" />
                Địa chỉ đầy đủ
              </span>
              <p className="mt-1 text-sm font-semibold text-[#242424]">
                {place.address}
                {!place.address.toLowerCase().includes(place.province.toLowerCase())
                  ? `, ${place.province}`
                  : ""}
              </p>
            </div>

            {/* Vibe Tags */}
            <div className="mt-5">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                <Sparkles className="h-3.5 w-3.5 text-[#FF7043]" aria-hidden="true" />
                Vibe &amp; Không khí
              </p>
              <div className="flex flex-wrap gap-2">
                {place.vibe.map((v) => (
                  <Link
                    key={v}
                    href={`/explore?vibe=${encodeURIComponent(v)}`}
                    className="rounded-xl border border-[#242424]/14 bg-white px-3 py-1.5 text-xs font-semibold text-[#242424] transition-colors hover:bg-[#B7E4C7]/60"
                  >
                    #{v}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Google Maps, Menu & Source Actions */}
          <div className="mt-7 border-t border-[#242424]/10 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <GoogleMapsActions place={place} />
              {place.menuUrl && (
                <MenuViewer
                  placeName={place.name}
                  menuUrl={place.menuUrl}
                  variant="button"
                />
              )}
            </div>

            {(place.reviewUrl || place.sourceChannel) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#5C564F]">
                {place.reviewUrl && (
                  <a
                    href={place.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#242424]/15 bg-white px-3.5 py-1.5 font-semibold text-[#242424] hover:bg-[#FFB4C2]/35"
                  >
                    Nguồn: {place.sourceRef || "Review cộng đồng"}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
                {place.sourceChannel && (
                  <span>Kênh gợi ý: {place.sourceChannel}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar Nearby / Relevant Places */}
      {similarPlaces.length > 0 && (
        <section className="mt-20 border-t border-[#242424]/10 pt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#D84B20]">
                Gợi ý tương tự
              </span>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-[#242424] sm:text-3xl">
                Có thể bạn cũng thích gần {place.province}
              </h2>
            </div>
            <Link
              href={`/explore?province=${encodeURIComponent(place.province)}`}
              className="text-xs font-bold text-[#D84B20] hover:underline"
            >
              Xem thêm tại {place.province}
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similarPlaces.map((similar) => (
              <PlaceCard key={similar.id} place={similar} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
