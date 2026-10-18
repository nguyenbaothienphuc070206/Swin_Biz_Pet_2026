import {getTranslations} from "next-intl/server";
import {ClinicVerificationForm} from "@/components/clinic/verification-form";
import {requireRole} from "@/lib/auth/server";
import {Card} from "@/components/ui";

export default async function VerificationPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{sent?:string;error?:string}>}) {
  const [{locale},query]=await Promise.all([params,searchParams]); await requireRole(["clinic_admin"],locale as "vi"|"en"); const t=await getTranslations("clinic");
  return <div className="max-w-3xl"><h1 className="font-display text-3xl font-bold">{t("verificationTitle")}</h1><p className="mt-3 text-muted-foreground">{t("verificationBody")}</p>{query.sent?<p role="status" className="mt-5 rounded-xl bg-secondary p-4">{t("sent")}</p>:<Card className="mt-7 p-5 md:p-8"><ClinicVerificationForm locale={locale} error={query.error}/></Card>}</div>;
}
