import Link from "next/link";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {Card} from "@/components/ui";
import {CommunityDashboard} from "@/components/community/community-dashboard";

const sections=["pets","appointments","community","sos"] as const;
export default async function OwnerSectionPage({params}:{params:Promise<{locale:string;section:string}>}) {
  const {locale,section}=await params;if(!sections.includes(section as (typeof sections)[number]))notFound();await requireRole(["owner"],locale as "vi"|"en");
  const t=await getTranslations("owner");const title=section==="pets"?t("myPets"):section==="appointments"?t("bookings"):section==="community"?t("community"):t("sosTitle");
  if(section==="community")return <CommunityDashboard/>;
  if(section==="sos")return <div className="mx-auto max-w-2xl"><Card className="border-l-4 border-l-destructive p-6 md:p-8"><h1 className="font-display text-3xl font-bold">{t("sosTitle")}</h1><p className="mt-4 leading-7">{t("sosBody")}</p><p className="mt-4 rounded-xl bg-warning/20 p-4 text-sm font-semibold">{t("sosNext")}</p><Link href={`/${locale}/owner`} className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">{t("welcome")}</Link></Card></div>;
  return <Card className="p-6"><h1 className="font-display text-3xl font-bold">{title}</h1><p className="mt-3 text-muted-foreground">{t("empty")}</p><Link href={`/${locale}/owner`} className="mt-5 inline-block font-semibold text-primary underline">{t("welcome")}</Link></Card>;
}
