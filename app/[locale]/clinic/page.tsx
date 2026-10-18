import {getTranslations} from "next-intl/server";
import {Card} from "@/components/ui";
import Link from "next/link";
import {requireRole} from "@/lib/auth/server";

export default async function ClinicHome({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params; await requireRole(["clinic_staff","clinic_admin"]); const t=await getTranslations("clinic");
  return <div><p className="text-sm font-semibold text-primary">PawCare</p><h1 className="mt-2 font-display text-3xl font-bold">{t("workspace")}</h1><div className="mt-7 grid gap-4 md:grid-cols-3"><Card className="p-5"><h2 className="font-semibold">{t("appointments")}</h2><p className="mt-2 text-sm text-muted-foreground">—</p></Card><Card className="p-5"><h2 className="font-semibold">{t("patients")}</h2><p className="mt-2 text-sm text-muted-foreground">—</p></Card><Link href={`/${locale}/clinic/verification`} className="rounded-2xl border border-border bg-card p-5 font-semibold hover:border-primary">{t("verification")}</Link></div></div>;
}
