"use client";
import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";
import {CalendarDays, ClipboardList, HeartHandshake, LayoutDashboard, Settings, ShieldCheck, ReceiptText} from "lucide-react";
import {LocaleSwitcher} from "./locale-switcher";

export function ClinicShell({children}: {children: React.ReactNode}) {
  const locale = useLocale(); const c = useTranslations("clinic"); const common = useTranslations("common");
  const links = [["/clinic", c("overview"), LayoutDashboard], ["/clinic/appointments", c("appointments"), CalendarDays], ["/clinic/patients", c("patients"), ClipboardList], ["/clinic/rescue", c("rescue"), HeartHandshake], ["/clinic/billing", common("billing"), ReceiptText], ["/clinic/verification", c("verification"), ShieldCheck], ["/settings", common("settings"), Settings]] as const;
  return <div className="min-h-screen md:flex"><aside className="hidden w-64 shrink-0 border-r border-border bg-card p-5 md:flex md:flex-col"><Link className="mb-10 font-display text-2xl font-bold text-primary" href={`/${locale}/clinic`}>{common("brand")}</Link><nav className="grid gap-2">{links.map(([href,label,Icon])=><Link key={href} href={`/${locale}${href}`} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><Icon size={18}/>{label}</Link>)}</nav><div className="mt-auto"><LocaleSwitcher/></div></aside><div className="min-w-0 flex-1"><header className="flex items-center justify-between border-b border-border bg-background px-4 py-4 md:hidden"><Link className="font-display text-xl font-bold text-primary" href={`/${locale}/clinic`}>{common("brand")}</Link><LocaleSwitcher/></header><main className="mx-auto max-w-7xl p-4 md:p-10">{children}</main></div></div>;
}
