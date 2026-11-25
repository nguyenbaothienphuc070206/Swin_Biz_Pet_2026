"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
  variant?: "pill" | "outline" | "ghost";
  hideIcon?: boolean;
}

export function BackButton({
  fallbackHref,
  label,
  className = "",
  variant = "pill",
  hideIcon = false,
}: BackButtonProps) {
  const locale = useLocale();
  const isEn = locale === "en";

  // Target destination: if fallbackHref is provided, navigate directly to it;
  // otherwise default to returning straight to the Home page (/${locale})
  const targetHref = fallbackHref || `/${locale}`;

  const baseStyles =
    "inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer select-none shrink-0";

  const variantStyles = {
    pill: "rounded-full bg-secondary/80 px-3.5 py-1.5 text-secondary-foreground hover:bg-secondary border border-border/60 shadow-2xs hover:shadow-xs",
    outline: "rounded-xl border border-border bg-card px-3.5 py-2 text-foreground hover:bg-muted shadow-2xs",
    ghost: "rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
  };

  const displayLabel = label || (isEn ? "Back to Home" : "Quay về Trang chủ");

  return (
    <Link
      href={targetHref}
      className={`group ${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-label={displayLabel}
    >
      {!hideIcon && (
        <ArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
      )}
      <span className="truncate">{displayLabel}</span>
    </Link>
  );
}
