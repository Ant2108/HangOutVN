import type { Metadata } from "next";
import { getAllPlaces, getAllProvinces, getAllVibes } from "@/lib/data";
import { RandomizerClient } from "@/components/random/RandomizerClient";

export const metadata: Metadata = {
  title: "Đi đâu hôm nay? — Gợi ý ngẫu nhiên",
  description:
    "Không biết ăn gì hay đi đâu chơi? Chọn tỉnh/thành, ngân sách, người đi cùng và vibe để nhận gợi ý chuẩn gu từ dữ liệu thật.",
};

export default function RandomPage() {
  const places = getAllPlaces();
  const provinces = getAllProvinces();
  const vibes = getAllVibes();

  return (
    <RandomizerClient places={places} provinces={provinces} vibes={vibes} />
  );
}
