import Link from "next/link";
import { Compass, Dices, MapPin } from "lucide-react";
import { HangoutLogo } from "./HangoutLogo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[#242424]/12 bg-[#242424] text-[#FFF8ED]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <HangoutLogo variant="dark" size="lg" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#FFF8ED]/75">
              Discover. Eat. Chill. Repeat. Nền tảng khám phá địa điểm ăn uống,
              cà phê, hẹn hò và trải nghiệm dành cho giới trẻ trên khắp 34
              tỉnh/thành Việt Nam.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-lg border border-[#FFF8ED]/15 bg-[#FFF8ED]/8 px-3 py-1 text-xs font-medium text-[#FFD166]">
                34 Tỉnh/Thành (NQ 202/2025)
              </span>
              <span className="rounded-lg border border-[#FFF8ED]/15 bg-[#FFF8ED]/8 px-3 py-1 text-xs font-medium text-[#B7E4C7]">
                1.532 Địa điểm chọn lọc
              </span>
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FFD166]">
              Khám phá
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[#FFF8ED]/80">
              <li>
                <Link href="/explore" className="inline-flex items-center gap-2 hover:text-[#FF7043] transition-colors">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  Tất cả địa điểm
                </Link>
              </li>
              <li>
                <Link href="/random" className="inline-flex items-center gap-2 hover:text-[#FF7043] transition-colors">
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  Đi đâu hôm nay?
                </Link>
              </li>
              <li>
                <Link href="/map" className="inline-flex items-center gap-2 hover:text-[#FF7043] transition-colors">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Bản đồ Google Maps
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#FFB4C2]">
              Danh mục nổi bật
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: "food", label: "Ăn uống & Ăn vặt" },
                { id: "coffee", label: "Cà phê & Trà sữa" },
                { id: "date", label: "Hẹn hò" },
                { id: "chill", label: "Chill & Sân vườn" },
                { id: "fun", label: "Workshop & Vui chơi" },
                { id: "travel", label: "Ngắm cảnh & Check-in" },
              ].map((cat) => (
                <Link
                  key={cat.id}
                  href={`/explore?category=${cat.id}`}
                  className="rounded-full border border-[#FFF8ED]/18 px-3.5 py-1.5 text-xs font-medium text-[#FFF8ED]/85 transition-colors hover:border-[#FF7043] hover:bg-[#FF7043] hover:text-[#242424]"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#FFF8ED]/12 pt-8 text-xs text-[#FFF8ED]/60 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} HANGOUT VN.</p>
          <p>Dữ liệu tổng hợp từ cộng đồng Threads, TikTok & Google Reviews.</p>
        </div>
      </div>
    </footer>
  );
}
