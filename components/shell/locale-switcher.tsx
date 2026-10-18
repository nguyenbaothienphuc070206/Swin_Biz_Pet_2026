"use client";
import {useLocale} from "next-intl";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");
  const path = pathname.replace(/^\/(vi|en)(?=\/|$)/, "");
  return <nav aria-label={t("language")} className="flex gap-1 text-sm">
    {(["vi", "en"] as const).map((code) => <a key={code} lang={code} href={`/${code}${path}`} aria-current={locale === code ? "page" : undefined} className={`rounded-full px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${locale === code ? "bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/60"}`}>{code.toUpperCase()}</a>)}
  </nav>;
}
