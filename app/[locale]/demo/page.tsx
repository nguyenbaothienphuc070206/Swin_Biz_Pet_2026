import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LazyDemo } from "@/components/demo/lazy-demo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("demo");
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Link className="text-sm font-semibold text-primary" href={`/${locale}`}>PawCare</Link><h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{t("title")}</h1><p className="mt-3 max-w-3xl text-muted-foreground">{t("subtitle")}</p></div>
      <div className="flex flex-wrap gap-2"><Link href={`/${locale}/pilot-kpis`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold">{t("pilotKpisLink")}</Link><Link href={`/${locale}/sign-in`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold">{t("signInForApp")}</Link></div>
    </header>
    <LazyDemo/>
  </main>;
}
