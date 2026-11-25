import type { Metadata } from "next";
import { requireRole, getOptionalUser } from "@/lib/auth/server";
import { ClinicHomeView } from "@/components/clinic/clinic-home-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Clinic Portal — PawCare" : "Trang chính Phòng khám — PawCare",
    description: isEn
      ? "Veterinary practice management, appointments dispatch, and patient EMR records"
      : "Trang điều hành phòng khám thú y, tiếp nhận lịch hẹn và quản lý bệnh án điện tử",
  };
}

export const dynamic = "force-dynamic";

export default async function ClinicHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Ensure user is an authenticated clinic staff or admin (redirects to /sign-in if not authenticated)
  await requireRole(["clinic_staff", "clinic_admin"], locale as "vi" | "en");
  const user = await getOptionalUser();

  const clinicName = user?.name || (locale === "en" ? "PawCare Partner Veterinary Clinic" : "Phòng khám Thú y PawCare Partner");

  return <ClinicHomeView clinicName={clinicName} />;
}
