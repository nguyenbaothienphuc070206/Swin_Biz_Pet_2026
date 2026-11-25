import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOptionalUser } from "@/lib/auth/server";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";

export async function PublicHeader({ locale }: { locale: string }) {
  const t = await getTranslations("common");
  const user = await getOptionalUser();

  const isClinic = user?.role === "clinic_admin" || user?.role === "clinic_staff";
  const portalHref = isClinic ? `/${locale}/clinic` : `/${locale}/owner`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 md:px-8">
        <Link href={`/${locale}`} className="shrink-0 font-display text-2xl font-bold tracking-tight text-primary">
          {t("brand")}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <LocaleSwitcher />
          {user ? (
            <Link
              href={portalHref}
              className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition"
            >
              {locale === "en" ? "Go to Portal" : "Vào Trang chính"}
            </Link>
          ) : (
            <Link
              href={`/${locale}/sign-in`}
              className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition"
            >
              {locale === "en" ? "Sign In" : "Đăng nhập"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
