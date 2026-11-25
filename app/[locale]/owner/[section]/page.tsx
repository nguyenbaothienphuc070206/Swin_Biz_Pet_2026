import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/server";
import { CommunityDashboard } from "@/components/community/community-dashboard";
import { PetPassportView } from "@/components/owner/pet-passport-view";
import { AppointmentsManager } from "@/components/owner/appointments-manager";
import { SosGuidance } from "@/components/owner/sos-guidance";
import { CarePlansView } from "@/components/owner/care-plans-view";

const sections = ["pets", "appointments", "community", "sos", "care-plans"] as const;

export default async function OwnerSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale, section } = await params;
  if (!sections.includes(section as (typeof sections)[number])) notFound();
  await requireRole(["owner"], locale as "vi" | "en");

  if (section === "pets") {
    return <PetPassportView key={locale} locale={locale} />;
  }
  if (section === "appointments") {
    return <AppointmentsManager key={locale} locale={locale} />;
  }
  if (section === "community") {
    return <CommunityDashboard key={locale} />;
  }
  if (section === "sos") {
    return <SosGuidance key={locale} locale={locale} />;
  }
  if (section === "care-plans") {
    return <CarePlansView key={locale} locale={locale} />;
  }

  notFound();
}
