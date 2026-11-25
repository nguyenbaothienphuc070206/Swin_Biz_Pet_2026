"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");
  const path = pathname.replace(/^\/(vi|en)(?=\/|$)/, "");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSearch(window.location.search);
    }
  }, [pathname]);

  const handleSwitch = (code: string) => {
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  return (
    <nav
      aria-label={t("language")}
      className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-card p-0.5 sm:p-1 shadow-xs shrink-0"
    >
      {(["vi", "en"] as const).map((code) => {
        const href = `/${code}${path}${search}`;
        const isCurrent = locale === code;
        return (
          <Link
            key={code}
            lang={code}
            href={href}
            onClick={() => handleSwitch(code)}
            aria-current={isCurrent ? "page" : undefined}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
              isCurrent
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {code.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
