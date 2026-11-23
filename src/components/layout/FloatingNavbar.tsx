"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Dices, MapPin, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HangoutLogo } from "./HangoutLogo";

const NAV_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/explore", label: "Khám phá", icon: Compass },
  { href: "/random", label: "Đi đâu hôm nay?", icon: Dices },
  { href: "/map", label: "Bản đồ", icon: MapPin },
];

export function FloatingNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-3 z-40 px-4 sm:top-4 sm:px-6">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[#242424]/14 bg-[#FFF8ED]/90 px-4 py-2.5 shadow-[0_12px_32px_-16px_rgba(36,36,36,0.22)] backdrop-blur-md sm:px-6"
      >
        <HangoutLogo variant="light" size="md" />

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[#242424] text-[#FFF8ED]"
                      : "text-[#242424]/80 hover:bg-[#242424]/7 hover:text-[#242424]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/random"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#242424]/15 bg-[#FF7043] px-4 font-display text-xs font-bold text-[#242424] transition-all hover:bg-[#ff5f2e] hover:-translate-y-0.5"
          >
            <Dices className="h-3.5 w-3.5" aria-hidden="true" />
            Gợi ý nhanh
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#242424]/15 bg-white text-[#242424] cursor-pointer md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-[24px] border border-[#242424]/15 bg-[#FFF8ED] p-3 shadow-xl md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-[44px] items-center justify-between rounded-2xl px-4 py-3 font-display text-sm font-semibold transition-colors",
                        active
                          ? "bg-[#242424] text-[#FFF8ED]"
                          : "text-[#242424] hover:bg-[#F6EBD8]"
                      )}
                    >
                      <span>{item.label}</span>
                      {active && (
                        <span className="h-2 w-2 rounded-full bg-[#FFD166]" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
