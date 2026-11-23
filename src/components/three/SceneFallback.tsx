"use client";

import Image from "next/image";

interface SceneFallbackProps {
  label?: string;
}

export function SceneFallback({ label = "Không gian ẩm thực 3D HANGOUT VN" }: SceneFallbackProps) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#FFF8ED]"
      aria-label={label}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,209,102,0.34),transparent_62%)]" />
      <div className="relative h-full w-full max-w-4xl">
        <Image
          src="/images/hero-poster.svg"
          alt="Minh họa 3D bánh mì, trà sữa trân châu và đồ ăn vặt Việt Nam"
          fill
          priority
          className="object-contain p-6 opacity-90"
        />
      </div>
    </div>
  );
}
