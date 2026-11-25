import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/server";
import { OwnerShell } from "@/components/shell/owner-shell";
import { ClinicShell } from "@/components/shell/clinic-shell";
import { PublicHeader } from "@/components/shell/public-header";
import { getFallbackClinics, ClinicDetail } from "@/modules/clinics/mock-clinics";
import { localizeClinic } from "@/modules/i18n/localize-data";
import { ClinicsDirectoryView } from "@/components/clinics/clinics-directory-view";
import { BackButton } from "@/components/ui/back-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clinicsSeo" });
  return {
    title: `${t("directoryTitle")} — PawCare`,
    description: t("directoryDescription"),
    alternates: {
      canonical: `/${locale}/clinics`,
      languages: {
        "vi-VN": "/vi/clinics",
        "en-US": "/en/clinics",
        "x-default": "/vi/clinics",
      },
    },
  };
}

export default async function ClinicsDirectory({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("clinicsSeo");

  let clinicList: ClinicDetail[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("clinics")
        .select("id,name,address,phone,specialties,verified")
        .eq("published", true)
        .eq("verified", true)
        .eq("is_demo", false)
        .order("name")
        .limit(200);
      if (data && data.length > 0) {
        clinicList = data.map((d: any) => ({
          ...d,
          district: "",
          languages: ["Tiếng Việt"],
          rating: 4.8,
          reviewCount: 80,
          description: "",
          services: [],
          hours: [],
          distanceKm: 2.5,
          facilityType: "clinic" as const,
          featuredServices: ["general", "vaccine"],
        }));
      }
    } catch {}
  }

  // Fallback to rich curated clinics if no database data is found
  if (clinicList.length === 0) {
    clinicList = getFallbackClinics(locale);
  }

  // Ensure every clinic is normalized for the active locale
  clinicList = clinicList.map((c) => localizeClinic(c, locale === "en"));

  const user = await getOptionalUser();
  const isOwner = user?.role === "owner";
  const isClinic = user?.role === "clinic_admin" || user?.role === "clinic_staff";

  const content = (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:py-12">
      {/* Top Back / Exit Navigation */}
      <div>
        <BackButton
          fallbackHref={
            isOwner
              ? `/${locale}/owner`
              : isClinic
              ? `/${locale}/clinic`
              : `/${locale}`
          }
          label={
            isOwner || isClinic
              ? locale === "en"
                ? "Back to Main"
                : "Quay về Trang chính"
              : locale === "en"
              ? "Back to Home"
              : "Quay về Trang chủ"
          }
          variant="pill"
        />
      </div>

      <ClinicsDirectoryView initialClinics={clinicList} locale={locale} />
    </main>
  );

  if (isOwner) {
    return <OwnerShell>{content}</OwnerShell>;
  }
  if (isClinic) {
    return <ClinicShell>{content}</ClinicShell>;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader locale={locale} />
      {content}
    </div>
  );
}
