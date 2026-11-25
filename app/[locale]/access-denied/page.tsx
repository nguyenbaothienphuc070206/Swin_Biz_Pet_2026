import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {BackButton} from "@/components/ui/back-button";

export default async function AccessDenied({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;const t=await getTranslations("errors");
  return <main className="grid min-h-screen place-items-center p-5">
    <div className="max-w-md text-center space-y-4">
      <div className="flex justify-center">
        <BackButton fallbackHref={`/${locale}`} label={locale === "en" ? "Back to Home" : "Quay về Trang chủ"} variant="pill" />
      </div>
      <h1 className="font-display text-3xl font-bold">{t("forbidden")}</h1>
      <Link href={`/${locale}`} className="inline-block rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">PawCare</Link>
    </div>
  </main>;
}
