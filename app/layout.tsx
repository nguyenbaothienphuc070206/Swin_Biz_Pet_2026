import "@fontsource/be-vietnam-pro";
import "@fontsource/dm-sans";
import "./globals.css";
import {getLocale} from "next-intl/server";
import {PwaRegister} from "@/components/pwa/register";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "PawCare", template: "%s | PawCare" },
  description: "PawCare — Digital pet health records and verified veterinary network.",
};

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const locale=await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pawcare-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}var c=localStorage.getItem('pawcare-contrast');if(c){document.documentElement.setAttribute('data-contrast',c)}var s=localStorage.getItem('pawcare-font-size');if(s){document.documentElement.setAttribute('data-font-size',s)}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
