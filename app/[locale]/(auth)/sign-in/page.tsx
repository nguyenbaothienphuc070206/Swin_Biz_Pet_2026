import Link from "next/link";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {AuthForm} from "@/components/auth/auth-form";
import {LocaleSwitcher} from "@/components/shell/locale-switcher";

export default async function SignInPage({params}: {params:Promise<{locale:string}>}) {
  const {locale}=await params; const t=await getTranslations("auth"); const common=await getTranslations("common");
  return <main className="grid min-h-screen place-items-center px-4 py-10"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm md:p-9"><div className="mb-8 flex items-center justify-between"><Link href={`/${locale}`} className="font-display text-2xl font-bold text-primary">{common("brand")}</Link><LocaleSwitcher/></div><h1 className="font-display text-3xl font-bold">{t("welcome")}</h1><div className="mt-7"><Suspense fallback={<p>{common("loading")}</p>}><AuthForm mode="sign-in"/></Suspense></div><p className="mt-6 text-center text-sm text-muted-foreground">{t("noAccount")} <Link className="font-semibold text-primary underline" href={`/${locale}/sign-up`}>{common("signUp")}</Link></p></div></main>;
}
