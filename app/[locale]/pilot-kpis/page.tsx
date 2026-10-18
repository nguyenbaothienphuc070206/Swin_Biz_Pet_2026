import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  return { title: t("pilotKpisTitle"), robots: { index: false, follow: false } };
}

export default async function PilotKpisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  const metrics = [
    [t("pilotKpiActivationTitle"), t("pilotKpiActivationDescription")],
    [t("pilotKpiFirstRecordTitle"), t("pilotKpiFirstRecordDescription")],
    [t("pilotKpiBookingTitle"), t("pilotKpiBookingDescription")],
    [t("pilotKpiSosTitle"), t("pilotKpiSosDescription")],
    [t("pilotKpiClinicActivationTitle"), t("pilotKpiClinicActivationDescription")],
    [t("pilotKpiRetentionTitle"), t("pilotKpiRetentionDescription")],
  ];
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="warning">{t("pilotKpisPlanned")}</Badge><h1 className="mt-3 font-display text-3xl font-bold">{t("pilotKpisTitle")}</h1><p className="mt-2 max-w-3xl text-muted-foreground">{t("pilotKpisDisclaimer")}</p></div><Link href={`/${locale}/demo`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-semibold">{t("backToDemo")}</Link></header>
    <Card className="overflow-x-auto p-5"><table className="w-full min-w-[36rem] text-left text-sm"><caption className="mb-3 text-left text-xs text-muted-foreground">{t("pilotKpisSource")}</caption><thead><tr className="border-b border-border"><th className="p-3">{t("pilotKpiMetric")}</th><th className="p-3">{t("pilotKpiDefinition")}</th><th className="p-3">{t("pilotKpiStatus")}</th></tr></thead><tbody>{metrics.map(([title, description]) => <tr key={title} className="border-b border-border last:border-0"><th scope="row" className="p-3 align-top font-semibold">{title}</th><td className="p-3 align-top text-muted-foreground">{description}</td><td className="p-3 align-top"><Badge>{t("pilotKpisPlanned")}</Badge></td></tr>)}</tbody></table></Card>
    <p className="text-xs text-muted-foreground">{t("pilotKpiPrivacy")}</p>
  </main>;
}
