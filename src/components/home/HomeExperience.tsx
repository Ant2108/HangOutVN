"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowDown,
  ArrowRight,
  Compass,
  Dices,
  MapPin,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { CategoryMeta, Place, Province } from "@/lib/types";
import { PlaceCard } from "@/components/places/PlaceCard";
import { SceneFallback } from "@/components/three/SceneFallback";
import { TextReveal } from "@/components/motion/TextReveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const FoodCanvas = dynamic(
  () => import("@/components/three/FoodCanvas").then((mod) => mod.FoodCanvas),
  {
    ssr: false,
    loading: () => <SceneFallback />,
  }
);

interface HomeExperienceProps {
  featuredPlaces: Place[];
  categories: CategoryMeta[];
  provinces: Province[];
  totalPlaces: number;
}

const SCENES = [
  {
    code: "01",
    label: "Welcome",
    title: "Vũ trụ ẩm thực & góc chill của Gen Z Việt Nam",
    body: "Bánh mì giòn rụm, trà sữa full topping, bánh tráng trộn hốc hẻm hay rooftop đón hoàng hôn — mọi cuộc vui đều bắt đầu từ một điểm hẹn đúng gu.",
    chip: "34 tỉnh/thành · 100% dữ liệu thực",
    accent: "bg-[#FFD166]",
  },
  {
    code: "02",
    label: "Taste the city",
    title: "Mỗi con phố, một hương vị đáng thử",
    body: "Từ những quán ăn vặt núp hẻm bình dân dưới 50k ở TP.HCM, phố ăn đêm Hà Nội, đến cao lầu Hội An và tiệm cà phê săn mây giữa mây ngàn Tây Bắc.",
    chip: "Tìm không dấu siêu nhanh · Giá rõ ràng",
    accent: "bg-[#FF7043]",
  },
  {
    code: "03",
    label: "Find your vibe",
    title: "Chọn đúng mood — Ăn ngon, Cà phê, Hẹn hò hay Workshop?",
    body: "Dù bạn muốn ngồi yên tĩnh chạy deadline, đi hẹn hò cuối tuần, làm gốm cùng người thương hay tụ tập hội bạn thâu đêm, HANGOUT VN đều có sẵn gợi ý.",
    chip: "6 phong cách · 12+ vibe đặc trưng",
    accent: "bg-[#B7E4C7]",
  },
];

export function HomeExperience({
  featuredPlaces,
  categories,
  provinces,
  totalPlaces,
}: HomeExperienceProps) {
  const storyRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef(0);
  const [activeScene, setActiveScene] = useState(0);

  useGSAP(
    () => {
      const container = storyRef.current;
      if (!container) return;

      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          const idx = self.progress < 0.34 ? 0 : self.progress < 0.68 ? 1 : 2;
          setActiveScene(idx);
        },
      });

      const chapters = container.querySelectorAll<HTMLElement>("[data-chapter-card]");
      chapters.forEach((chapter) => {
        gsap.fromTo(
          chapter,
          { opacity: 0.25, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: chapter,
              start: "top 80%",
              end: "top 45%",
              scrub: 0.4,
            },
          }
        );
      });
    },
    { scope: storyRef }
  );

  const topProvinces = [...provinces]
    .sort((a, b) => b.placeCount - a.placeCount)
    .slice(0, 10);

  return (
    <div className="relative">
      {/* =========================================================
          3D IMMERSIVE HERO + 4-SCENE GSAP SCROLL STORYTELLING
         ========================================================= */}
      <div ref={storyRef} className="relative">
        {/* Sticky Full-Screen 3D Canvas Backdrop */}
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <FoodCanvas scrollProgressRef={scrollProgressRef} />

          {/* Subtle radial readability vignette behind typography */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,248,237,0.72)_0%,rgba(255,248,237,0.18)_52%,rgba(255,248,237,0.45)_100%)]"
            aria-hidden="true"
          />

          {/* Scene progress indicator (desktop) */}
          <div className="pointer-events-none fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2 lg:flex">
            {SCENES.map((s, idx) => (
              <div
                key={s.code}
                className="flex items-center gap-2 text-[11px] font-display font-bold tracking-wider uppercase"
              >
                <span
                  className={
                    activeScene === idx
                      ? "text-[#242424] opacity-100 transition-opacity"
                      : "text-[#5C564F] opacity-40 transition-opacity"
                  }
                >
                  {s.code}
                </span>
                <span
                  className={
                    activeScene === idx
                      ? "h-2.5 w-8 rounded-full bg-[#FF7043] transition-all"
                      : "h-2 w-2 rounded-full bg-[#242424]/25 transition-all"
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overlay Foreground: Scene 01 Hero Copy */}
        <section className="relative z-10 -mt-[100svh] flex min-h-[100svh] flex-col items-center justify-center px-4 pb-16 pt-28 text-center sm:px-6">
          <TextReveal immediate>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#242424]/15 bg-[#FFF8ED]/90 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#242424] shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#FF7043]" aria-hidden="true" />
              Discover. Eat. Chill. Repeat. · 34 Tỉnh/Thành
            </span>
          </TextReveal>

          <TextReveal immediate delay={0.08}>
            <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(3rem,8vw,6.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-[#242424]">
              Đi đâu{" "}
              <span className="relative inline-block">
                <span className="relative z-10">hôm nay?</span>
                <span
                  className="absolute -bottom-1 left-0 right-0 -z-0 h-4 rounded-full bg-[#FFD166]/85 sm:h-6"
                  aria-hidden="true"
                />
              </span>
            </h1>
          </TextReveal>

          <TextReveal immediate delay={0.16}>
            <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-relaxed text-[#242424]/80 sm:text-lg">
              Khám phá những góc thú vị, món ngon và cuộc vui đang chờ bạn.
            </p>
          </TextReveal>

          <TextReveal immediate delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/explore"
                className="inline-flex h-13 items-center gap-2.5 rounded-full border border-[#242424]/15 bg-[#FF7043] px-7 font-display text-sm font-bold text-[#242424] shadow-[0_12px_28px_-10px_rgba(255,112,67,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[#ff5f2e] sm:text-base"
              >
                <Compass className="h-4 w-4" aria-hidden="true" />
                Khám phá ngay
              </Link>
              <Link
                href="/random"
                className="inline-flex h-13 items-center gap-2.5 rounded-full border border-[#242424]/20 bg-[#242424] px-7 font-display text-sm font-bold text-[#FFF8ED] transition-all hover:-translate-y-0.5 hover:bg-[#3a3734] sm:text-base"
              >
                <Dices className="h-4 w-4 text-[#FFD166]" aria-hidden="true" />
                Gợi ý cho tôi
              </Link>
            </div>
          </TextReveal>

          {/* Compact stats bar */}
          <TextReveal immediate delay={0.32}>
            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-[#242424]/12 bg-[#FFF8ED]/88 px-6 py-3 text-xs font-semibold text-[#242424] backdrop-blur-md sm:text-sm">
              <span>
                <strong className="font-display text-base font-extrabold text-[#D84B20]">
                  {totalPlaces.toLocaleString("vi-VN")}
                </strong>{" "}
                địa điểm thực tế
              </span>
              <span className="hidden h-4 w-px bg-[#242424]/15 sm:inline-block" aria-hidden="true" />
              <span>
                <strong className="font-display text-base font-extrabold text-[#242424]">34</strong>{" "}
                tỉnh/thành Việt Nam
              </span>
              <span className="hidden h-4 w-px bg-[#242424]/15 sm:inline-block" aria-hidden="true" />
              <span>
                <strong className="font-display text-base font-extrabold text-[#1E5631]">89%</strong>{" "}
                miễn phí &amp; bình dân
              </span>
            </div>
          </TextReveal>

          <a
            href="#story-chapters"
            aria-label="Cuộn xuống để khám phá câu chuyện"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#242424]/15 bg-white/80 px-4 py-2 text-xs font-semibold text-[#242424]/80 backdrop-blur-sm transition-colors hover:bg-white"
          >
            Cuộn để khám phá
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" aria-hidden="true" />
          </a>
        </section>

        {/* Scroll Storytelling Chapters (Scenes 01 -> 03) */}
        <div
          id="story-chapters"
          className="relative z-10 mx-auto max-w-6xl space-y-24 px-4 py-16 sm:space-y-32 sm:px-6 sm:py-24"
        >
          {SCENES.map((scene, idx) => (
            <div
              key={scene.code}
              data-chapter-card
              className={`flex ${idx % 2 === 1 ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-lg rounded-[26px] border border-[#242424]/15 bg-[#FFF8ED]/92 p-7 shadow-[0_24px_55px_-30px_rgba(36,36,36,0.3)] backdrop-blur-md sm:p-9">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-extrabold text-[#242424] ${scene.accent}`}
                  >
                    {scene.code}
                  </span>
                  <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#5C564F]">
                    Scene {scene.code} — {scene.label}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-[#242424] sm:text-3xl">
                  {scene.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5C564F] sm:text-base">
                  {scene.body}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#242424]/10 pt-4">
                  <span className="text-xs font-semibold text-[#242424]/80">{scene.chip}</span>
                  <Link
                    href={idx === 2 ? "/random" : "/explore"}
                    className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#D84B20] hover:underline"
                  >
                    {idx === 2 ? "Thử chọn vibe" : "Xem danh sách"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          SCENE 04 — FIND YOUR VIBE (6 CATEGORIES) & EXPLORE
         ========================================================= */}
      <section className="relative z-20 border-t border-[#242424]/10 bg-[#FFF8ED] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-[#D84B20]">
                Scene 04 — Explore by Vibe
              </span>
              <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.4rem)] font-extrabold leading-[1.06] tracking-tight text-[#242424]">
                Hôm nay bạn muốn đi kiểu gì?
              </h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full border border-[#242424]/18 bg-white px-5 py-2.5 font-display text-sm font-bold text-[#242424] transition-colors hover:bg-[#242424] hover:text-[#FFF8ED]"
            >
              Xem tất cả {totalPlaces.toLocaleString("vi-VN")} địa điểm
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* 6 Editorial Category Cards */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/explore?category=${cat.id}`}
                className="editorial-card group relative flex flex-col overflow-hidden"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F6EBD8]">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className="absolute right-3 top-3 rounded-full border border-[#242424]/12 px-3 py-1 font-display text-xs font-bold text-[#242424]"
                    style={{ backgroundColor: cat.accent }}
                  >
                    {cat.count.toLocaleString("vi-VN")} tọa độ
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-extrabold text-[#242424] group-hover:text-[#D84B20] transition-colors">
                        {cat.name}
                      </h3>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                        {cat.englishName}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#5C564F]">{cat.tagline}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-display text-xs font-bold text-[#242424]">
                    Khám phá ngay
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CURATED FEATURED PLACES ACROSS VIETNAM
         ========================================================= */}
      <section className="relative z-20 bg-[#F6EBD8]/55 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-[#D84B20]">
                <Utensils className="h-3.5 w-3.5" aria-hidden="true" />
                Tuyển chọn nổi bật
              </span>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#242424] sm:text-4xl">
                Những điểm hẹn đang được giới trẻ rủ nhau đi
              </h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-[#D84B20] hover:underline"
            >
              Mở bộ lọc đầy đủ
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredPlaces.map((place, index) => (
              <PlaceCard key={place.id} place={place} priority={index < 2} />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          34 PROVINCES QUICK EXPLORER & RANDOMIZER CTA
         ========================================================= */}
      <section className="relative z-20 bg-[#FFF8ED] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* 34 Provinces highlight */}
            <div className="rounded-[26px] border border-[#242424]/14 bg-white p-7 sm:p-9 lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-[#1E5631]">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Phủ sóng 34 tỉnh/thành mới
              </span>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-[#242424] sm:text-3xl">
                Chọn nhanh thành phố của bạn
              </h2>
              <p className="mt-2 text-sm text-[#5C564F]">
                Cập nhật theo phân loại 34 đơn vị hành chính cấp tỉnh (Nghị quyết
                202/2025/QH15), giữ nguyên quận &amp; khu vực cũ để bạn tìm quen tay.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {topProvinces.map((prov) => (
                  <Link
                    key={prov.slug}
                    href={`/explore?province=${encodeURIComponent(prov.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#242424]/15 bg-[#FFF8ED] px-4 py-2 text-xs font-semibold text-[#242424] transition-colors hover:border-[#FF7043] hover:bg-[#FF7043] hover:text-[#242424]"
                  >
                    <span>{prov.name}</span>
                    <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[#5C564F]">
                      {prov.placeCount}
                    </span>
                  </Link>
                ))}
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-4 py-2 text-xs font-bold text-[#FFF8ED] hover:bg-[#FF7043] hover:text-[#242424] transition-colors"
                >
                  Xem đủ 34 tỉnh/thành
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Random Recommendation Banner */}
            <div className="flex flex-col justify-between rounded-[26px] border border-[#242424]/14 bg-[#242424] p-7 text-[#FFF8ED] sm:p-9 lg:col-span-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD166] px-3 py-1 font-display text-xs font-extrabold text-[#242424]">
                  <Dices className="h-3.5 w-3.5" aria-hidden="true" />
                  Đỡ phải nghĩ &ldquo;Ăn gì giờ?&rdquo;
                </span>
                <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                  Để HANGOUT VN chọn giùm bạn một kèo chuẩn gu!
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#FFF8ED]/75">
                  Chọn tỉnh/thành, ngân sách, đi cùng ai và vibe mong muốn — thuật
                  toán lọc đúng dữ liệu thật và chốt kèo trong 1 giây.
                </p>
              </div>
              <div className="mt-8">
                <Link
                  href="/random"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FF7043] px-6 font-display text-sm font-bold text-[#242424] transition-all hover:bg-[#ff5f2e] sm:w-auto"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  Chốt kèo ngay
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
