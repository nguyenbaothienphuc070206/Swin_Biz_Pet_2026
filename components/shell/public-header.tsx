import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {LocaleSwitcher} from "./locale-switcher";

export async function PublicHeader({locale}: {locale: string}) {
  const t=await getTranslations("common"); const l=await getTranslations("landing"); const d=await getTranslations("demo");
  return <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8"><Link href={`/${locale}`} className="font-display text-2xl font-bold text-primary">{t("brand")}</Link><nav className="flex items-center gap-3"><Link href={`/${locale}/demo`} className="hidden rounded-full border border-border px-4 py-2 text-sm font-semibold sm:inline-flex">{d("title")}</Link><LocaleSwitcher/><Link href={`/${locale}/sign-in`} className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-secondary sm:inline-flex">{t("signIn")}</Link><Link href={`/${locale}/sign-up?context=owner`} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{l("ownerCta")}</Link></nav></header>;
}
