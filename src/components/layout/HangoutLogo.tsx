import Link from "next/link";
import { cn } from "@/lib/utils";

interface HangoutLogoProps {
  variant?: "light" | "dark" | "mark";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export function HangoutMarkSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="14"
        fill="#FF7043"
        stroke="#242424"
        strokeWidth="2.5"
      />
      <path
        d="M24 8.5C16.82 8.5 11 14.12 11 21.05C11 29.15 21.45 38.12 23.08 39.46C23.62 39.9 24.38 39.9 24.92 39.46C26.55 38.12 37 29.15 37 21.05C37 14.12 31.18 8.5 24 8.5Z"
        fill="#FFF8ED"
        stroke="#242424"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 20.5H31.5C31.5 24.64 28.14 28 24 28C19.86 28 16.5 24.64 16.5 20.5Z"
        fill="#FF7043"
        stroke="#242424"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 17.5L32.5 13.5"
        stroke="#242424"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20.5 20L33.5 17"
        stroke="#242424"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M36.5 8L37.4 10.6L40 11.5L37.4 12.4L36.5 15L35.6 12.4L33 11.5L35.6 10.6L36.5 8Z"
        fill="#FFD166"
        stroke="#242424"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Official HANGOUT VN Brand Logo designed in Figma
 * (Pin + Vietnamese Street-Food Bowl & Chopsticks + Sparkle Star + Be Vietnam Pro Wordmark)
 */
export function HangoutLogo({
  variant = "light",
  size = "md",
  href = "/",
  className,
}: HangoutLogoProps) {
  const markSize =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const textSize =
    size === "sm"
      ? "text-base"
      : size === "lg"
        ? "text-2xl"
        : "text-lg";

  const inner = (
    <span
      className={cn(
        "group inline-flex items-center gap-2.5 font-display font-extrabold tracking-tight select-none",
        variant === "dark" ? "text-[#FFF8ED]" : "text-[#242424]",
        textSize,
        className
      )}
    >
      <HangoutMarkSvg
        className={cn(
          markSize,
          "transition-transform duration-200 group-hover:rotate-6 group-hover:scale-105"
        )}
      />
      {variant !== "mark" && (
        <span className="flex items-center gap-1.5">
          <span>HANGOUT</span>
          <span className="rounded-lg border-[1.5px] border-[#242424] bg-[#FFD166] px-1.5 py-0.5 text-xs font-extrabold leading-none text-[#242424] shadow-[0_2px_0_#242424]">
            VN
          </span>
        </span>
      )}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label="HANGOUT VN — Trang chủ">
      {inner}
    </Link>
  );
}
