"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuViewerProps {
  placeName: string;
  menuUrl: string;
  variant?: "card" | "button";
  className?: string;
}

function getMenuDisplayInfo(rawUrl: string): {
  mode: "image" | "iframe" | "external";
  src: string;
  sourceLabel: string;
} {
  if (!rawUrl) {
    return { mode: "external", src: "", sourceLabel: "Menu" };
  }

  // Local static menu images (/images/menus/...) -> instant image mode!
  if (
    rawUrl.startsWith("/") ||
    /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(rawUrl)
  ) {
    return {
      mode: "image",
      src: rawUrl,
      sourceLabel: "Thực đơn & Bảng giá",
    };
  }

  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();

    if (host.includes("drive.google.com")) {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return {
          mode: "iframe",
          src: `https://drive.google.com/file/d/${match[1]}/preview`,
          sourceLabel: "Google Drive Menu",
        };
      }
    }

    if (
      !host.includes("tiktok.com") &&
      !host.includes("facebook.com") &&
      !host.includes("shopeefood.vn")
    ) {
      return {
        mode: "iframe",
        src: rawUrl,
        sourceLabel: host.replace(/^www\./, ""),
      };
    }

    return {
      mode: "external",
      src: rawUrl,
      sourceLabel: host.replace(/^www\./, ""),
    };
  } catch {
    return { mode: "external", src: rawUrl, sourceLabel: "Menu" };
  }
}

export function MenuViewer({
  placeName,
  menuUrl,
  variant = "button",
  className,
}: MenuViewerProps) {
  const [open, setOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const info = React.useMemo(() => getMenuDisplayInfo(menuUrl), [menuUrl]);

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
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Menu của ${placeName}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-[#242424]/70 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-[#242424]/18 bg-[#FFF8ED] shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242424]/10 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#D84B20]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  {info.sourceLabel}
                </span>
                <h3 className="truncate font-display text-base font-extrabold text-[#242424] sm:text-lg">
                  Menu — {placeName}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {info.mode === "image" && (
                  <div className="hidden sm:flex items-center gap-1 rounded-full border border-[#242424]/14 bg-[#FFF8ED] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                      aria-label="Thu nhỏ ảnh menu"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#242424] hover:bg-[#F6EBD8] cursor-pointer"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[44px] text-center font-display text-xs font-bold text-[#242424]">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.25, +(z + 0.25).toFixed(2)))}
                      aria-label="Phóng to ảnh menu"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#242424] hover:bg-[#F6EBD8] cursor-pointer"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    {zoom !== 1 && (
                      <button
                        type="button"
                        onClick={() => setZoom(1)}
                        aria-label="Đặt lại kích thước"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#5C564F] hover:bg-[#F6EBD8] cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-full border border-[#242424]/16 bg-[#FFF8ED] px-3.5 sm:px-4 font-display text-xs font-bold text-[#242424] hover:bg-[#FFD166]/60 transition-colors"
                >
                  Mở ảnh gốc
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng Menu"
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#242424]/15 bg-white text-[#242424] cursor-pointer hover:bg-[#F6EBD8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Instant Image or Embed Body */}
            <div className="relative flex-1 overflow-auto bg-[#242424]/95 p-3 sm:p-6">
              {info.mode === "image" ? (
                <div className="flex min-h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={info.src}
                    alt={`Thực đơn của ${placeName}`}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "top center",
                    }}
                    className="max-h-[75vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-xl transition-transform duration-150"
                  />
                </div>
              ) : info.mode === "iframe" ? (
                <iframe
                  src={info.src}
                  title={`Menu của ${placeName}`}
                  className="h-full w-full rounded-xl border-0 bg-white"
                  allow="autoplay"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#FFF8ED]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFD166] text-[#242424]">
                    <BookOpen className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h4 className="mt-4 font-display text-xl font-extrabold">
                    Xem Menu trực tiếp trên {info.sourceLabel}
                  </h4>
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
          setZoom(1);
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
