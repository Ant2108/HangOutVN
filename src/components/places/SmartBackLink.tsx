"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface SmartBackLinkProps {
  fallbackHref?: string;
  label?: string;
}

/**
 * Navigates back in browser history when arriving from another HANGOUT VN page
 * (preserving Explore / Random / Map filter state & scroll position without reload),
 * falling back to `fallbackHref` if opened directly in a fresh tab.
 */
export function SmartBackLink({
  fallbackHref = "/explore",
  label = "Quay lại danh sách",
}: SmartBackLinkProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      const externalReferrer =
        document.referrer &&
        !document.referrer.startsWith(window.location.origin);
      if (!externalReferrer) {
        router.back();
        return;
      }
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-full border border-[#242424]/15 bg-white px-4 py-2 text-xs font-bold text-[#242424] cursor-pointer transition-colors hover:bg-[#F6EBD8]"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
