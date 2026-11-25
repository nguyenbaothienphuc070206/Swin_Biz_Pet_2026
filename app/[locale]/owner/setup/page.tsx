import type { Metadata } from "next";
import { requireRole, getOptionalUser } from "@/lib/auth/server";
import { OwnerOnboardingWizard } from "@/components/owner/owner-onboarding-wizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn
      ? "Profile & Pet Setup — PawCare"
      : "Thiết lập Thông tin & Hồ sơ Thú cưng — PawCare",
    description: isEn
      ? "Step-by-step pet parent profile and digital pet passport setup wizard"
      : "Trang thiết lập thông tin chủ nuôi và khởi tạo sổ y bạ điện tử cho thú cưng",
  };
}

export const dynamic = "force-dynamic";

export default async function OwnerSetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["owner"], locale as "vi" | "en");
  const user = await getOptionalUser();

  return (
    <OwnerOnboardingWizard
      initialUserName={user?.name || ""}
      initialUserEmail={user?.email || ""}
    />
  );
}
