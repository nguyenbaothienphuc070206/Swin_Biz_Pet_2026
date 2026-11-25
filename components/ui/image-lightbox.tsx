"use client";

import { useEffect } from "react";
import { X, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  locale?: string;
  children?: React.ReactNode;
}

export function ImageLightbox({
  isOpen,
  onClose,
  src,
  alt = "Ảnh phóng to / Zoomed photo",
  title,
  subtitle,
  locale = "vi",
  children,
}: ImageLightboxProps) {
  const isEn = locale === "en";

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || (isEn ? "Photo preview" : "Xem ảnh chi tiết")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-card p-5 shadow-2xl overflow-hidden">
        {/* Header with Title and Prominent Exit Button */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="min-w-0 pr-3">
            <h3 className="font-display text-lg font-bold truncate text-foreground">
              {title || (isEn ? "Photo & Profile Preview" : "Xem ảnh & Hồ sơ chi tiết")}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>

          {/* Primary Exit Button */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-destructive shrink-0 cursor-pointer"
            aria-label={isEn ? "Exit photo preview" : "Thoát xem ảnh"}
          >
            <X className="size-4 shrink-0" />
            <span>{isEn ? "Exit photo" : "Thoát xem ảnh"}</span>
          </button>
        </div>

        {/* Content / Photo Display */}
        <div className="my-4 flex flex-1 items-center justify-center overflow-auto rounded-2xl bg-muted/40 p-3">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-md"
            />
          ) : (
            children
          )}
        </div>

        {/* Footer with Secondary Exit Button & Hint */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {isEn ? "Press ESC or click outside to exit" : "Nhấn ESC hoặc bấm ra ngoài để thoát"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition cursor-pointer"
          >
            <ZoomOut className="size-3.5 text-muted-foreground" />
            <span>{isEn ? "Close preview" : "Đóng xem ảnh"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
