import { ExternalLink, MapPin, Navigation } from "lucide-react";
import {
  getPlaceDirectionsUrl,
  getPlaceMapUrl,
  type PlaceMapInput,
} from "@/lib/maps";
import { cn } from "@/lib/utils";

interface GoogleMapsActionsProps {
  place: PlaceMapInput;
  className?: string;
  size?: "md" | "lg";
}

export function GoogleMapsActions({
  place,
  className,
  size = "lg",
}: GoogleMapsActionsProps) {
  const searchUrl = getPlaceMapUrl(place);
  const directionUrl = getPlaceDirectionsUrl(place);
  const heightCls = size === "lg" ? "h-12 px-6 text-sm" : "h-10 px-4 text-xs";

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <a
        href={directionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border border-[#242424]/15 bg-[#FF7043] font-display font-bold text-[#242424] shadow-[0_8px_22px_-10px_rgba(255,112,67,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#ff5f2e]",
          heightCls
        )}
      >
        <Navigation className="h-4 w-4" aria-hidden="true" />
        Chỉ đường Google Maps
        <ExternalLink className="h-3.5 w-3.5 opacity-75" aria-hidden="true" />
      </a>

      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full border border-[#242424]/20 bg-white font-display font-semibold text-[#242424] transition-all hover:-translate-y-0.5 hover:border-[#242424]/50 hover:bg-[#FFF8ED]",
          heightCls
        )}
      >
        <MapPin className="h-4 w-4 text-[#D84B20]" aria-hidden="true" />
        Xem vị trí trên Maps
      </a>
    </div>
  );
}
