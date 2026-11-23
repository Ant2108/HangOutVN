"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Clock, MapPin, Navigation } from "lucide-react";
import type { Place } from "@/lib/types";
import { getPlaceMapUrl } from "@/lib/maps";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  cn,
  formatPricePerPerson,
  getPlaceOpenStatus,
  getPricePerPerson,
} from "@/lib/utils";
import { MenuViewer } from "./MenuViewer";

interface PlaceCardProps {
  place: Place;
  priority?: boolean;
}

const emptySubscribe = () => () => {};

export function PlaceCard({ place, priority = false }: PlaceCardProps) {
  const mapUrl = getPlaceMapUrl(place);
  const coverImage = place.images[0] || "/images/places/food.jpg";
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const openStatus = isMounted
    ? getPlaceOpenStatus(place.openingHours, new Date())
    : null;

  const isClosed = openStatus !== null && !openStatus.isOpen;

  return (
    <article
      className={cn(
        "editorial-card group flex h-full flex-col overflow-hidden transition-all duration-300",
        isClosed &&
          "border-[#242424]/10 bg-[#EFE8DC] opacity-72 hover:opacity-95"
      )}
    >
      {/* Image Header */}
      <Link
        href={`/places/${place.id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#F6EBD8]"
        aria-label={`Xem chi tiết ${place.name}`}
      >
        <Image
          src={coverImage}
          alt={`${place.name} tại ${place.province}`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={cn(
            "object-cover transition-all duration-500 ease-out group-hover:scale-105",
            isClosed && "grayscale-[82%] contrast-90 group-hover:grayscale-[25%]"
          )}
        />
        {/* Price & Menu / Closed tag overlay */}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-1.5">
          <span className="rounded-full border border-[#242424]/12 bg-[#FFF8ED]/95 px-3 py-1 font-display text-xs font-bold text-[#242424] shadow-sm backdrop-blur-sm">
            {formatPricePerPerson(getPricePerPerson(place))}
          </span>
          <div className="flex items-center gap-1.5">
            {openStatus && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[11px] font-extrabold shadow-sm backdrop-blur-sm",
                  !openStatus.isOpen
                    ? "border-[#242424]/20 bg-[#242424]/90 text-[#FFF8ED]"
                    : openStatus.isClosingSoon
                      ? "border-[#242424]/15 bg-[#FFD166] text-[#242424]"
                      : "border-[#1E5631]/25 bg-[#B7E4C7] text-[#1E5631]"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    !openStatus.isOpen
                      ? "bg-[#FF7043]"
                      : openStatus.isClosingSoon
                        ? "bg-[#D84B20]"
                        : "bg-[#1E5631]"
                  )}
                  aria-hidden="true"
                />
                {openStatus.label}
              </span>
            )}
            {place.menuUrl && !isClosed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#242424]/15 bg-[#FFD166] px-2.5 py-1 font-display text-[11px] font-extrabold text-[#242424] shadow-sm">
                <BookOpen className="h-3 w-3" aria-hidden="true" />
                Menu
              </span>
            )}
          </div>
        </div>

        {/* Province badge */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#242424]/85 px-2.5 py-1 text-[11px] font-medium text-[#FFF8ED] backdrop-blur-sm">
            <MapPin className="h-3 w-3 text-[#FFD166]" aria-hidden="true" />
            {place.province}
            {place.district && place.district !== place.province ? ` · ${place.district}` : ""}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {place.category.slice(0, 3).map((cat) => {
            const style = CATEGORY_STYLES[cat];
            return (
              <span
                key={cat}
                className={cn(
                  "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                  style.bg,
                  style.text,
                  style.border
                )}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            );
          })}
          {place.subTag && (
            <span className="truncate max-w-[140px] rounded-lg border border-[#242424]/10 bg-[#FFF8ED] px-2 py-0.5 text-[11px] font-medium text-[#5C564F]">
              {place.subTag}
            </span>
          )}
        </div>

        <Link href={`/places/${place.id}`} className="mt-3 block">
          <h3
            className={cn(
              "font-display text-lg font-bold leading-snug transition-colors group-hover:text-[#D84B20] line-clamp-2",
              isClosed ? "text-[#5C564F]" : "text-[#242424]"
            )}
          >
            {place.name}
          </h3>
        </Link>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5C564F] line-clamp-2">
          {place.description || `${place.address}`}
        </p>

        {place.openingHours && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#5C564F]">
            <Clock
              className={cn(
                "h-3.5 w-3.5",
                isClosed ? "text-[#5C564F]" : "text-[#FF7043]"
              )}
              aria-hidden="true"
            />
            <span className="truncate">{place.openingHours}</span>
            {openStatus && (
              <span
                className={cn(
                  "font-semibold",
                  isClosed ? "text-[#B83B14]" : "text-[#1E5631]"
                )}
              >
                · {openStatus.detail}
              </span>
            )}
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#242424]/8 pt-4">
          <Link
            href={`/places/${place.id}`}
            className={cn(
              "inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 py-2 font-display text-xs font-semibold transition-colors",
              isClosed
                ? "bg-[#5C564F] text-[#FFF8ED] hover:bg-[#242424]"
                : "bg-[#242424] text-[#FFF8ED] hover:bg-[#FF7043] hover:text-[#242424]"
            )}
          >
            Xem chi tiết
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-1.5">
            {place.menuUrl && (
              <MenuViewer
                placeName={place.name}
                menuUrl={place.menuUrl}
                variant="card"
              />
            )}
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Mở Google Maps cho ${place.name}`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#242424]/16 bg-[#FFF8ED] px-3 py-2 text-xs font-semibold text-[#242424] transition-colors hover:border-[#242424]/40 hover:bg-[#FFD166]/40"
            >
              <Navigation className="h-3.5 w-3.5 text-[#D84B20]" aria-hidden="true" />
              Maps
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
