import type { Metadata } from "next";
import { getAllPlaces, getAllProvinces, getRegions } from "@/lib/data";
import { MapExplorerClient } from "@/components/map/MapExplorerClient";

export const metadata: Metadata = {
  title: "Bản đồ Google Maps 34 tỉnh/thành",
  description:
    "Tra cứu nhanh địa chỉ và mở chỉ đường Google Maps cho hơn 1.360 địa điểm ăn uống, cà phê, hẹn hò trên khắp 34 tỉnh/thành Việt Nam.",
};

export default function MapPage() {
  const places = getAllPlaces();
  const provinces = getAllProvinces();
  const regions = getRegions();

  return (
    <MapExplorerClient
      places={places}
      provinces={provinces}
      regions={regions}
    />
  );
}
