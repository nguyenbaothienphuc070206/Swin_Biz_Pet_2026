import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClinicProfileSetupForm } from "@/components/clinic/clinic-profile-setup-form";
import { BackButton } from "@/components/ui/back-button";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { getOptionalUser } from "@/lib/auth/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clinicProfileSetup" });
  return {
    title: `${t("title")} — PawCare`,
    description: t("subtitle"),
  };
}

export default async function ClinicProfileSetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getOptionalUser();
  if (!user) {
    redirect(`/${locale}/sign-up?context=clinic&next=${encodeURIComponent(`/${locale}/clinic-profile-setup`)}`);
  }
  if (user.role === "owner") {
    redirect(`/${locale}/owner`);
  }
  if (user.role === "platform_admin") {
    redirect(`/${locale}/admin`);
  }

  const cookieStore = await cookies();
  const isOnboarding = cookieStore.get("pawcare_clinic_onboarding")?.value === "1";
  const isRegistered = cookieStore.get("pawcare_clinic_registered")?.value === "1";
  let hasClinicMembership = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("clinic_staff")
        .select("clinic_id")
        .eq("user_id", user.id)
        .limit(1);
      hasClinicMembership = Boolean(data && data.length > 0);
    } catch {
      hasClinicMembership = false;
    }
  }

  // Initial clinic profile setup is strictly part of clinic registration;
  // registered clinics edit their profile exclusively inside Clinic Settings.
  if (!isOnboarding || isRegistered || hasClinicMembership) {
    redirect(`/${locale}/clinic/settings`);
  }

  const t = await getTranslations("clinicProfileSetup");
  const common = await getTranslations("common");
  const isEn = locale === "en";

  return (
    <div className="clinic-theme min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BackButton
              fallbackHref={`/${locale}/clinic`}
              label={isEn ? "Back" : "Quay về"}
              variant="pill"
              hideIcon
            />
            <Link
              href={`/${locale}/clinic`}
              className="hidden sm:inline-block font-display text-lg font-bold text-foreground transition hover:opacity-90"
            >
              {common("brand")}
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle variant="text" />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("badge")}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <ClinicProfileSetupForm locale={locale} />

        <div className="mt-10 text-center text-xs text-muted-foreground">
          <p>
            {isEn
              ? "Clinic verification and digital records are protected under PawCare Veterinary Data Protocols."
              : "Hồ sơ phòng khám và dữ liệu y tế được kiểm định và bảo mật theo Tiêu chuẩn Dữ liệu Thú y PawCare."}
          </p>
        </div>
      </main>
    </div>
  );
}
