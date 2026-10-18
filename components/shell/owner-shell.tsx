"use client";
import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";
import {Home, HeartPulse, CalendarDays, UsersRound, Settings} from "lucide-react";
import {LocaleSwitcher} from "./locale-switcher";

export function OwnerShell({children}: {children: React.ReactNode}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const owner = useTranslations("owner");
  const links = [["/owner", t("home"), Home], ["/owner/pets", owner("myPets"), HeartPulse], ["/owner/appointments", owner("bookings"), CalendarDays], ["/owner/community", owner("community"), UsersRound], ["/settings", t("settings"), Settings]] as const;
  return <div className="min-h-screen pb-20 md:pb-0">
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-8">
      <Link href={`/${locale}/owner`} className="font-display text-xl font-bold text-primary">{t("brand")}</Link><div className="flex items-center gap-3"><Link href={`/${locale}/owner/billing`} className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary md:inline-flex">{t("billing")}</Link><Link href={`/${locale}/settings`} className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary md:inline-flex">{t("settings")}</Link><LocaleSwitcher/><Link href={`/${locale}/owner/sos`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{t("sos")}</Link></div>
    </header>
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
    <nav aria-label={t("home")} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur md:hidden">
      {links.map(([href, label, Icon]) => <Link key={href} href={`/${locale}${href}`} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><Icon aria-hidden size={19}/><span>{label}</span></Link>)}
    </nav>
  </div>;
}
