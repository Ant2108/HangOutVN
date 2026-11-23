import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getAllCategories,
  getAllPlaces,
  getAllProvinces,
  getAllVibes,
} from "@/lib/data";
import { ExploreClient } from "@/components/explore/ExploreClient";

export const metadata: Metadata = {
  title: "Khám phá địa điểm",
  description:
    "Tìm kiếm và lọc hơn 1.360 địa điểm ăn uống, cà phê, hẹn hò, chill và workshop trên khắp 34 tỉnh/thành Việt Nam.",
};

export default function ExplorePage() {
  const places = getAllPlaces();
  const provinces = getAllProvinces();
  const categories = getAllCategories();
  const vibes = getAllVibes();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-32 text-sm text-[#5C564F]">
          Đang tải danh sách địa điểm...
        </div>
      }
    >
      <ExploreClient
        places={places}
        provinces={provinces}
        categories={categories}
        vibes={vibes}
      />
    </Suspense>
  );
}
