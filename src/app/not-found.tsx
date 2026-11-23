import Link from "next/link";
import { Compass, Dices, Home } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[75vh] max-w-2xl flex-col items-center justify-center px-4 pt-28 text-center">
      <span className="rounded-full border border-[#242424]/15 bg-[#FFD166] px-4 py-1.5 font-display text-xs font-extrabold uppercase tracking-widest text-[#242424]">
        404 · Lạc đường rồi
      </span>
      <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-[#242424] sm:text-5xl">
        Không tìm thấy tọa độ này
      </h1>
      <p className="mt-4 text-base text-[#5C564F]">
        Địa điểm hoặc trang bạn đang tìm có thể đã đổi đường dẫn. Đừng lo, vẫn
        còn hơn 1.360 góc ăn chơi cực chất đang chờ bạn khám phá!
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#242424] px-6 font-display text-sm font-bold text-[#FFF8ED] hover:bg-[#FF7043] hover:text-[#242424] transition-colors"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Về trang chủ
        </Link>
        <Link
          href="/explore"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-[#242424]/20 bg-white px-6 font-display text-sm font-bold text-[#242424] hover:bg-[#F6EBD8] transition-colors"
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
          Khám phá địa điểm
        </Link>
        <Link
          href="/random"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-[#242424]/15 bg-[#FF7043] px-6 font-display text-sm font-bold text-[#242424] hover:bg-[#ff5f2e] transition-colors"
        >
          <Dices className="h-4 w-4" aria-hidden="true" />
          Gợi ý ngẫu nhiên
        </Link>
      </div>
    </section>
  );
}
