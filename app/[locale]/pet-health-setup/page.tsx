import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HealthProfileSetupForm } from "@/components/pet/health-profile-setup-form";
import { BackButton } from "@/components/ui/back-button";
import { HeartPulse } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "petHealthSetup" });
  return {
    title: `${t("title")} — PawCare`,
    description: t("subtitle"),
  };
}

export default async function PetHealthSetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("petHealthSetup");
  const isEn = locale === "en";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BackButton
              fallbackHref={`/${locale}/owner/pets`}
              label={isEn ? "Back to Pet Passports" : "Quay về Sổ y bạ thú cưng"}
              variant="pill"
            />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="font-display font-bold text-foreground">
              {t("title")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Page Hero Title */}
        <div className="mb-8 text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground">
            <HeartPulse className="size-3.5 text-primary" />
            <span>{t("badge")}</span>
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <HealthProfileSetupForm locale={locale} />
      </main>
    </div>
  );
}
