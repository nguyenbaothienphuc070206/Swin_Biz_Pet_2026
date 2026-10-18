import "@fontsource/be-vietnam-pro";
import "@fontsource/dm-sans";
import "./globals.css";
import {getLocale} from "next-intl/server";
import {PwaRegister} from "@/components/pwa/register";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "PawCare — chăm sóc thú cưng", template: "%s | PawCare" },
  description: "Hồ sơ sức khỏe, phòng khám và lịch chăm sóc thú cưng.",
};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const locale=await getLocale();
  return <html lang={locale} suppressHydrationWarning><body><PwaRegister/>{children}</body></html>;
}
