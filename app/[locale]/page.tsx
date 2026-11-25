import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getOptionalUser } from "@/lib/auth/server";
import { PublicHeader } from "@/components/shell/public-header";
import {
  ArrowRight,
  ShieldCheck,
  HeartPulse,
  MapPin,
  Stethoscope,
  PawPrint,
  CheckCircle2,
  Syringe,
  Calendar,
  Sparkles,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  return {
    title: `PawCare — ${t("eyebrow")}`,
    description: t("subtitle"),
    alternates: {
      canonical: `/${locale}`,
      languages: { "vi-VN": "/vi", "en-US": "/en", "x-default": "/vi" },
    },
    openGraph: {
      title: `PawCare — ${t("eyebrow")}`,
      description: t("subtitle"),
      type: "website",
      locale: locale === "en" ? "en_US" : "vi_VN",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // If user is already authenticated, redirect to their dedicated portal home
  const currentUser = await getOptionalUser();
  if (currentUser) {
    if (currentUser.role === "clinic_staff" || currentUser.role === "clinic_admin") {
      redirect(`/${locale}/clinic`);
    } else if (currentUser.role === "platform_admin") {
      redirect(`/${locale}/admin`);
    } else {
      redirect(`/${locale}/owner`);
    }
  }

  const t = await getTranslations("landing");
  const common = await getTranslations("common");
  const petHealthSetupHref = `/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/pet-health-setup`)}&context=owner`;
  const clinicSetupHref = `/${locale}/sign-up?next=${encodeURIComponent(`/${locale}/clinic-profile-setup`)}&context=clinic`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PawCare",
    description: t("subtitle"),
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { url: process.env.NEXT_PUBLIC_SITE_URL } : {}),
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PublicHeader locale={locale} />
      <main>
        {/* Hero Section */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:pb-20 sm:pt-14 md:grid-cols-[1.1fr_.9fr] md:px-8 md:pb-24 md:pt-16">
          <div className="min-w-0">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground sm:text-sm">
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span>{t("eyebrow")}</span>
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
              {t("subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={petHealthSetupHref}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
              >
                <span>{t("ownerCta")}</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href={`/${locale}/clinics`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold shadow-2xs transition hover:bg-muted"
              >
                <span>{t("findClinic")}</span>
                <MapPin size={18} className="text-primary" />
              </Link>
            </div>
          </div>

          {/* Visual Badge Graphic */}
          <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[380px] sm:max-w-[420px]">
            <div className="absolute inset-8 rounded-[40%_60%_55%_45%] bg-secondary" />
            <div className="absolute inset-16 flex items-center justify-center rounded-[48%_52%_48%_52%] bg-card shadow-xl">
              <div className="text-center">
                <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-md sm:size-24">
                  <PawPrint size={44} />
                </div>
                <p className="font-display text-2xl font-bold text-primary">PawCare</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground sm:text-sm">Digital Pet Care</p>
              </div>
            </div>
            <div className="absolute right-2 top-8 rounded-2xl border border-border bg-card p-3.5 shadow-lg backdrop-blur-xs sm:right-3 sm:top-12 sm:p-4">
              <HeartPulse className="text-accent" />
              <span className="mt-2 block text-xs font-semibold">{common("sos")}</span>
            </div>
            <div className="absolute bottom-6 left-0 rounded-2xl border border-border bg-card p-3.5 shadow-lg backdrop-blur-xs sm:bottom-8 sm:p-4">
              <MapPin className="text-primary" />
              <span className="mt-2 block text-xs font-semibold">{t("stepTwo")}</span>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="border-y border-border bg-muted/20 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-accent sm:text-sm">
                {t("how")}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl md:text-4xl">
                {t("processTitle")}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: t("stepOne"),
                  desc: t("stepOneDesc"),
                  icon: Syringe,
                },
                {
                  step: "02",
                  title: t("stepTwo"),
                  desc: t("stepTwoDesc"),
                  icon: Calendar,
                },
                {
                  step: "03",
                  title: t("stepThree"),
                  desc: t("stepThreeDesc"),
                  icon: CheckCircle2,
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className="flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs transition hover:border-primary/40 hover:shadow-md sm:p-8"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-4xl font-extrabold text-primary/40">
                        {item.step}
                      </span>
                      <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                        <item.icon className="size-6" />
                      </div>
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Value Proposition for Owners & Clinics */}
        <section className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:py-16 md:grid-cols-2 md:px-8 md:py-24">
          <article className="flex flex-col justify-between rounded-3xl bg-secondary p-6 sm:p-8 md:p-12">
            <div>
              <HeartPulse className="size-8 text-primary" />
              <h2 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{t("owners")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("ownersBody")}</p>
            </div>
            <Link
              href={petHealthSetupHref}
              className="mt-8 inline-flex items-center gap-2 font-bold text-primary hover:underline"
            >
              <span>{t("ownerCta")}</span>
              <ArrowRight size={17} />
            </Link>
          </article>

          <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8 md:p-12">
            <div>
              <Stethoscope className="size-8 text-primary" />
              <h2 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{t("clinics")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("clinicsBody")}</p>
            </div>
            <Link
              href={clinicSetupHref}
              className="mt-8 inline-flex items-center gap-2 font-bold text-primary hover:underline"
            >
              <span>{t("clinicCta")}</span>
              <ArrowRight size={17} />
            </Link>
          </article>
        </section>

        {/* SOS Emergency Banner */}
        <section className="bg-destructive px-5 py-12 text-destructive-foreground sm:py-14">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-white/15 sm:size-16">
              <HeartPulse className="size-7 animate-pulse sm:size-8" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("sosTitle")}</h2>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed opacity-90 sm:text-sm">{t("sosBody")}</p>
            </div>
            <Link
              href={`/${locale}/owner/sos`}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-destructive shadow transition hover:bg-white/90"
            >
              {t("sosCta")}
            </Link>
          </div>
        </section>

        {/* Trust & FAQ Section */}
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <ShieldCheck className="size-8 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t("trust")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("trustBody")}</p>
            <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("securityStandard")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("securityDesc")}
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("faq")}</h2>
            <details className="mt-6 border-b border-border py-4">
              <summary className="cursor-pointer font-bold text-foreground">
                {t("faqOne")}
              </summary>
              <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                {t("faqOneAnswer")}
              </p>
            </details>
            <details className="border-b border-border py-4">
              <summary className="cursor-pointer font-bold text-foreground">
                {t("faqTwo")}
              </summary>
              <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                {t("faqTwoAnswer")}
              </p>
            </details>
            <details className="border-b border-border py-4">
              <summary className="cursor-pointer font-bold text-foreground">
                {t("faqThree")}
              </summary>
              <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                {t("faqThreeAnswer")}
              </p>
            </details>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-primary px-5 py-16 text-center text-primary-foreground md:py-20">
          <p className="font-display text-3xl font-bold sm:text-4xl">{t("footer")}</p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-primary-foreground/85 sm:text-sm">
            {t("footerSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={petHealthSetupHref}
              className="inline-block rounded-full bg-card px-8 py-3.5 text-sm font-bold text-card-foreground shadow-lg transition hover:bg-card/90"
            >
              {t("ownerCta")}
            </Link>
            <Link
              href={`/${locale}/clinics`}
              className="inline-block rounded-full border border-white/30 bg-primary-foreground/10 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/20"
            >
              {t("exploreClinics")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
