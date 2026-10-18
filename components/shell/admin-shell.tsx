"use client";
import Link from "next/link";
import {useLocale,useTranslations} from "next-intl";
import {LocaleSwitcher} from "./locale-switcher";
import {LayoutDashboard,ShieldCheck,Users,Hospital,Settings,ClipboardList,Flag,Star,ScrollText} from "lucide-react";

export function AdminShell({children}:{children:React.ReactNode}) {
  const locale=useLocale();const a=useTranslations("admin");const common=useTranslations("common");
  const links=[["/admin",a("overview"),LayoutDashboard],["/admin/verification",a("verification"),ShieldCheck],["/admin/community",a("communityQueue"),ClipboardList],["/admin/reviews",a("reviews"),Star],["/admin/users",a("users"),Users],["/admin/clinics",a("clinics"),Hospital],["/admin/flags",a("featureFlags"),Flag],["/admin/audit",a("auditLog"),ScrollText],["/settings/security",a("security"),Settings],["/settings",common("settings"),Settings]] as const;
  return <div className="min-h-screen md:flex"><aside className="hidden w-64 border-r border-border bg-card p-5 md:block"><Link href={`/${locale}/admin`} className="font-display text-2xl font-bold text-primary">{a("console")}</Link><nav className="mt-8 grid gap-2">{links.map(([href,label,Icon])=><Link key={href} href={`/${locale}${href}`} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-secondary"><Icon size={18}/>{label}</Link>)}</nav><div className="mt-8"><LocaleSwitcher/></div></aside><main className="min-w-0 flex-1 p-5 md:p-10">{children}</main></div>;
}
