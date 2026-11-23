"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuViewerProps {
  placeName: string;
  menuUrl: string;
  variant?: "card" | "button";
  className?: string;
}

function getEmbedInfo(rawUrl: string): {
  canEmbed: boolean;
  embedUrl: string;
  sourceLabel: string;
} {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();

    // Google Drive file link -> official /preview embed URL
    if (host.includes("drive.google.com")) {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return {
          canEmbed: true,
          embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
          sourceLabel: "Google Drive Menu",
        };
      }
    }

    // Direct image URLs
    if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(u.pathname)) {
      return {
        canEmbed: true,
        embedUrl: rawUrl,
        sourceLabel: "Ảnh Menu",
      };
    }

    // Known embeddable web menus (e.g. restaurant websites)
    if (!host.includes("tiktok.com") && !host.includes("facebook.com") && !host.includes("shopeefood.vn")) {
      return {
        canEmbed: true,
        embedUrl: rawUrl,
        sourceLabel: host.replace(/^www\./, ""),
      };
    }

    return {
      canEmbed: false,
      embedUrl: rawUrl,
      sourceLabel: host.replace(/^www\./, ""),
    };
  } catch {
    return { canEmbed: false, embedUrl: rawUrl, sourceLabel: "Menu" };
  }
}

export function MenuViewer({
  placeName,
  menuUrl,
  variant = "button",
  className,
}: MenuViewerProps) {
  const [open, setOpen] = React.useState(false);
  const embed = React.useMemo(() => getEmbedInfo(menuUrl), [menuUrl]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Menu của ${placeName}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-[#242424]/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-[#242424]/18 bg-[#FFF8ED] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[#242424]/10 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D84B20]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  {embed.sourceLabel}
                </span>
                <h3 className="truncate font-display text-base font-extrabold text-[#242424] sm:text-lg">
                  Menu — {placeName}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#242424]/16 bg-[#FFF8ED] px-4 font-display text-xs font-bold text-[#242424] hover:bg-[#FFD166]/60 transition-colors"
                >
                  Mở tab mới
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng Menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#242424]/15 bg-white text-[#242424] cursor-pointer hover:bg-[#F6EBD8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="relative flex-1 bg-[#F6EBD8]">
              {embed.canEmbed ? (
                <iframe
                  src={embed.embedUrl}
                  title={`Menu của ${placeName}`}
                  className="h-full w-full border-0"
                  allow="autoplay"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD166] text-[#242424]">
                    <BookOpen className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h4 className="mt-4 font-display text-xl font-extrabold text-[#242424]">
                    Xem Menu trực tiếp trên {embed.sourceLabel}
                  </h4>
                  <p className="mt-2 max-w-md text-sm text-[#5C564F]">
                    Trang nguồn ({embed.sourceLabel}) không cho phép nhúng trực tiếp.
                    Nhấn nút bên dưới để mở Menu đầy đủ trong tab mới.
                  </p>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#FF7043] px-6 font-display text-sm font-bold text-[#242424] hover:bg-[#ff5f2e] transition-colors"
                  >
                    Mở Menu ngay
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          variant === "card"
            ? "inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#242424]/15 bg-[#FFD166]/65 px-3.5 py-2 font-display text-xs font-bold text-[#242424] cursor-pointer transition-colors hover:bg-[#FFD166]"
            : "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#242424]/15 bg-[#FFD166] px-6 font-display text-sm font-bold text-[#242424] cursor-pointer transition-all hover:-translate-y-0.5 hover:bg-[#f7c348]",
          className
        )}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Xem Menu
      </button>

      {typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
    </>
  );
}
