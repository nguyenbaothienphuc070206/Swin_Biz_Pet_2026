import type { Metadata } from "next";
import { PublicVerifyView } from "@/components/passport/public-verify-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn ? "Verify Pet Health Record — PawCare" : "Xác Thực Sổ Y Bạ Thú Cưng — PawCare",
    description: isEn
      ? "Official rabies certificate and digital medical passport verification"
      : "Đối chiếu chứng nhận tiêm phòng dại và y bạ điện tử chính thức PawCare",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RecordVerifyPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  return (
    <div className="min-h-screen bg-background">
      <PublicVerifyView token={token} locale={locale} />
    </div>
  );
}

