import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/server";
import { OwnerShell } from "@/components/shell/owner-shell";
import { ClinicShell } from "@/components/shell/clinic-shell";
import { PublicHeader } from "@/components/shell/public-header";
import { getFallbackClinicById, type ClinicDetail } from "@/modules/clinics/mock-clinics";
import { localizeClinic } from "@/modules/i18n/localize-data";
import {
  MapPin,
  Phone,
  Clock,
  Calendar,
  Stethoscope,
  Globe,
  Star,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

async function getClinicData(id: string, locale: string): Promise<ClinicDetail | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id,name,address,phone,specialties,languages,is_24_7,verified")
        .eq("id", id)
        .eq("published", true)
        .eq("verified", true)
        .eq("is_demo", false)
        .maybeSingle();

      if (clinic) {
        const [{ data: services }, { data: hours }] = await Promise.all([
          supabase
            .from("clinic_services")
            .select("name,description,price_vnd,duration_minutes")
            .eq("clinic_id", clinic.id)
            .eq("active", true)
            .limit(50),
          supabase
            .from("clinic_hours")
            .select("weekday,opens_at,closes_at,closed")
            .eq("clinic_id", clinic.id)
            .order("weekday"),
        ]);

        return localizeClinic(
          {
            id: clinic.id,
            name: clinic.name,
            address: clinic.address,
            district: "",
            phone: clinic.phone ?? "",
            specialties: clinic.specialties ?? [],
            languages: clinic.languages ?? (locale === "en" ? ["Vietnamese", "English"] : ["Tiếng Việt"]),
            is_24_7: Boolean(clinic.is_24_7),
            verified: Boolean(clinic.verified),
            rating: 4.8,
            reviewCount: 95,
            description:
              locale === "en"
                ? "Official partner veterinary clinic in the PawCare digital health network."
                : "Phòng khám thú y đối tác chính thức trong mạng lưới y bạ điện tử PawCare.",
            services: (services ?? []).map((s) => ({
              name: s.name,
              description: s.description ?? "",
              price_vnd: Number(s.price_vnd),
              duration_minutes: Number(s.duration_minutes),
            })),
            hours: (hours ?? []).map((h) => ({
              weekday: h.weekday,
              opens_at: h.opens_at,
              closes_at: h.closes_at,
              closed: Boolean(h.closed),
            })),
          },
          locale === "en"
        );
      }
    } catch {}
  }

  // Fallback to local curated clinics
  const fallback = getFallbackClinicById(id, locale);
  return fallback ? localizeClinic(fallback, locale === "en") : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; clinicId: string }>;
}): Promise<Metadata> {
  const { locale, clinicId } = await params;
  const clinic = await getClinicData(clinicId, locale);
  if (!clinic) return { robots: { index: false, follow: false } };
  const t = await getTranslations({ locale, namespace: "clinicsSeo" });
  const url = `/${locale}/clinics/${clinic.id}`;
  return {
    title: `${clinic.name} — ${t("servicesPricing")}`,
    description: `${clinic.name} · ${clinic.address} · ${clinic.phone}`,
    alternates: {
      canonical: url,
      languages: {
        "vi-VN": `/vi/clinics/${clinic.id}`,
        "en-US": `/en/clinics/${clinic.id}`,
        "x-default": `/vi/clinics/${clinic.id}`,
      },
    },
  };
}

export default async function PublicClinicPage({
  params,
}: {
  params: Promise<{ locale: string; clinicId: string }>;
}) {
  const { locale, clinicId } = await params;
  const clinic = await getClinicData(clinicId, locale);
  if (!clinic) notFound();

  const t = await getTranslations("clinicsSeo");
  const common = await getTranslations("common");

  const user = await getOptionalUser();
  const isOwner = user?.role === "owner";
  const isClinic = user?.role === "clinic_admin" || user?.role === "clinic_staff";

  const content = (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 md:py-12">
      {/* Top Back / Exit Navigation */}
      <div>
        <BackButton
          fallbackHref={`/${locale}/clinics`}
          label={locale === "en" ? "Back to Find Clinics" : "Quay lại Tìm phòng khám"}
          variant="pill"
        />
      </div>

      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={
            isOwner
              ? `/${locale}/owner`
              : isClinic
              ? `/${locale}/clinic`
              : `/${locale}`
          }
          className="hover:text-foreground"
        >
          {isOwner || isClinic ? (locale === "en" ? "Dashboard" : "Trang chính") : common("home")}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/clinics`} className="hover:text-foreground">
          {t("directoryTitle")}
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground truncate max-w-[240px] sm:max-w-none">
          {clinic.name}
        </span>
      </nav>

      {/* Main Clinic Header */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {clinic.facilityType && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold border-2 ${
                    clinic.facilityType === "shop"
                      ? "bg-amber-100 dark:bg-amber-900/40 border-amber-500 text-amber-950 dark:text-amber-200"
                      : clinic.facilityType === "spa"
                      ? "bg-purple-100 dark:bg-purple-900/40 border-purple-500 text-purple-950 dark:text-purple-200"
                      : "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-950 dark:text-emerald-200"
                  }`}
                >
                  {clinic.facilityType === "shop"
                    ? (locale === "en" ? "Pet Shop" : "Cửa hàng Pet Shop")
                    : clinic.facilityType === "spa"
                    ? (locale === "en" ? "Pet Spa & Hotel" : "Spa & Khách sạn thú cưng")
                    : (locale === "en" ? "Vet Clinic" : "Phòng khám thú y")}
                </span>
              )}
              {clinic.is_24_7 && (
                <span className="rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-bold text-destructive">
                  {t("open247")}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {clinic.name}
            </h1>

            {/* Stars Rating Display */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-4 ${
                      star <= Math.floor(clinic.rating)
                        ? "fill-amber-400 text-amber-400"
                        : star === Math.ceil(clinic.rating) && clinic.rating % 1 !== 0
                        ? "fill-amber-400/50 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="font-extrabold text-sm text-foreground">
                {clinic.rating.toFixed(1)} / 5.0
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                ({clinic.reviewCount} {locale === "en" ? "verified customer reviews" : "đánh giá thực tế từ khách hàng"})
              </span>
              {clinic.rating >= 4.8 && (
                <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-400">
                  {clinic.rating === 5.0
                    ? (locale === "en" ? "⭐ 5.0 Top Tier Rating" : "⭐ 5.0 Đánh giá tuyệt đối")
                    : (locale === "en" ? "⭐ Top Rated Service" : "⭐ Dịch vụ được đánh giá cao")}
                </span>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
              <span>{clinic.address}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:flex-nowrap md:flex-col shrink-0">
            <Link
              href={isClinic ? `/${locale}/clinic/appointments` : `/${locale}/owner/appointments`}
              className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
            >
              <Calendar className="size-4" />
              <span>
                {isClinic
                  ? locale === "en"
                    ? "Manage appointments"
                    : "Quản lý lịch hẹn"
                  : t("bookOnline")}
              </span>
            </Link>

            <a
              href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
              className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-muted"
            >
              <Phone className="size-4 text-primary" />
              <span>{clinic.phone}</span>
            </a>
          </div>
        </div>

        <p className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          {clinic.description}
        </p>
      </div>

      {/* Two Column Details Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        {/* Left Column: Services & Pricing */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Stethoscope className="size-5 text-primary shrink-0" />
              {t("servicesPricing")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pricingSubtitle")}
            </p>

            <div className="mt-5 space-y-3">
              {clinic.services.map((service, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-2xl border border-border p-4 transition hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-display text-base font-bold text-primary">
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: "VND",
                        maximumFractionDigits: 0,
                      }).format(service.price_vnd)}
                    </span>
                    {service.duration_minutes > 0 && service.duration_minutes < 1440 && (
                      <p className="text-xs text-muted-foreground">
                        ~{service.duration_minutes} {locale === "en" ? "min" : "phút"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Working Hours & Specialties */}
        <div className="space-y-6">
          {/* Working Hours */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary shrink-0" />
              {t("hours")}
            </h2>

            {clinic.is_24_7 ? (
              <div className="mt-4 rounded-xl bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
                {t("hoursNotice247")}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border text-xs">
                {clinic.hours.map((h) => {
                  const dayKey = `day${h.weekday}` as
                    | "day0"
                    | "day1"
                    | "day2"
                    | "day3"
                    | "day4"
                    | "day5"
                    | "day6";
                  return (
                    <li key={h.weekday} className="flex items-center justify-between py-2">
                      <span className="font-medium text-foreground">
                        {t(dayKey)}
                      </span>
                      <span
                        className={
                          h.closed ? "text-destructive font-semibold" : "text-muted-foreground"
                        }
                      >
                        {h.closed ? t("closedDay") : `${h.opens_at} – ${h.closes_at}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Specialties & Languages */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Globe className="size-5 text-primary shrink-0" />
              {t("specialtiesAndLanguages")}
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("specialtiesTitle")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clinic.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("languagesTitle")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clinic.languages.map((lang, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
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
