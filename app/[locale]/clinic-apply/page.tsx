import {getTranslations} from "next-intl/server";
import {requireRole} from "@/lib/auth/server";
import {ClinicVerificationForm} from "@/components/clinic/verification-form";
import {Card} from "@/components/ui";
import {LocaleSwitcher} from "@/components/shell/locale-switcher";

export const dynamic="force-dynamic";

export default async function ClinicApplyPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{sent?:string;error?:string}>}) {
  const [{locale},query]=await Promise.all([params,searchParams]);await requireRole(["owner"],locale as "vi"|"en");const t=await getTranslations("clinic");const common=await getTranslations("common");
  return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8"><header className="mb-8 flex items-center justify-between"><span className="font-display text-2xl font-bold text-primary">{common("brand")}</span><LocaleSwitcher/></header><h1 className="font-display text-3xl font-bold">{t("verificationTitle")}</h1><p className="mt-3 text-muted-foreground">{t("verificationBody")}</p>{query.sent?<p role="status" className="mt-6 rounded-xl bg-secondary p-4">{t("sent")}</p>:<Card className="mt-7 p-5 md:p-8"><ClinicVerificationForm locale={locale} error={query.error}/></Card>}</main>;
}
