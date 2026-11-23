"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#242424]/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FFF8ED] border-l border-[#242424]/15 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#242424]/10 px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#242424]">{title}</h2>
                {description && (
                  <p className="mt-1 text-xs text-[#5C564F]">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bộ lọc"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#242424]/15 bg-white text-[#242424] cursor-pointer hover:bg-[#F6EBD8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
