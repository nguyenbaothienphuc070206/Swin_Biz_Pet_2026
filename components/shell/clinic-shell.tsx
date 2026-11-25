"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";

export function ClinicShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const isEn = locale === "en";
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await fetch(`/api/auth/sign-out?locale=${locale}`, {
        method: "POST",
      }).catch(() => {});

      const fd = new FormData();
      fd.set("locale", locale);
      await signOutAction(fd).catch(() => {});
    } catch {
    } finally {
      window.location.href = `/${locale}/sign-in`;
    }
  };

  const linkSections = [
    {
      title: isEn ? "Operations" : "Vận hành",
      items: [
        {
          href: "/clinic",
          label: isEn ? "Overview" : "Tổng quan",
        },
        {
          href: "/clinic/appointments",
          label: isEn ? "Appointments" : "Lịch khám",
          badge: "8",
        },
        {
          href: "/clinic/sos-settings",
          label: isEn ? "24/7 SOS Coverage" : "Trực SOS 24/7",
        },
      ],
    },
    {
      title: isEn ? "Clinical" : "Lâm sàng",
      items: [
        {
          href: "/clinic/records",
          label: isEn ? "Pet Records" : "Hồ sơ thú cưng",
          badge: "2",
        },
        {
          href: "/clinic/care-plans",
          label: isEn ? "Care Plans" : "Phác đồ điều trị",
        },
        {
          href: "/clinic/rescue",
          label: isEn ? "Rescue Network" : "Cứu hộ khẩn cấp",
        },
      ],
    },
    {
      title: isEn ? "Practice" : "Cơ sở",
      items: [
        {
          href: "/clinic/billing",
          label: isEn ? "Billing & Invoices" : "Viện phí & Hóa đơn",
        },
        {
          href: "/clinic/verification",
          label: isEn ? "Verification" : "Kiểm định chất lượng",
        },
        {
          href: "/clinic/settings",
          label: isEn ? "Settings" : "Cài đặt",
        },
      ],
    },
  ];

  return (
    <div className="clinic-theme min-h-screen lg:flex bg-background text-foreground transition-colors motion-reduce:transition-none">
      {/* Left Clinical Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card px-3.5 py-5 lg:flex lg:flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Clean Brand Wordmark */}
        <div className="mb-6 px-2.5">
          <Link href={`/${locale}/clinic`} className="block group">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                PawCare
              </span>
              <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {isEn ? "Clinic" : "Phòng khám"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEn ? "Veterinary workspace" : "Bàn điều hành thú y"}
            </p>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav aria-label={isEn ? "Clinic sidebar" : "Điều hướng phòng khám"} className="space-y-6 flex-1">
          {linkSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <div className="grid gap-0.5">
                {section.items.map(({ href, label, ...rest }) => {
                  const fullHref = `/${locale}${href}`;
                  const isActive =
                    href === "/clinic"
                      ? pathname === fullHref
                      : href === "/clinic/records"
                      ? pathname?.startsWith(fullHref) || pathname?.startsWith(`/${locale}/clinic/patients`)
                      : pathname?.startsWith(fullHref);
                  const badge = "badge" in rest ? rest.badge : undefined;

                  return (
                    <Link
                      key={href}
                      href={fullHref}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition motion-reduce:transition-none cursor-pointer min-h-9 ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {badge && (
                        <span
                          className={`ml-2 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums shrink-0 ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Sign Out */}
        <div className="mt-auto pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer min-h-9 disabled:opacity-50"
          >
            <span>
              {isSigningOut
                ? isEn ? "Signing out..." : "Đang đăng xuất..."
                : isEn ? "Sign out" : "Đăng xuất"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col pb-24 lg:pb-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-3 sm:px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={isEn ? "Open clinic menu" : "Mở menu phòng khám"}
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-secondary lg:hidden cursor-pointer transition"
            >
              Menu
            </button>

            <Link
              href={`/${locale}/clinic`}
              className="font-display text-base font-bold text-foreground flex items-baseline gap-1.5 lg:hidden min-w-0 truncate"
            >
              <span className="truncate">PawCare</span>
              <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                {isEn ? "Clinic" : "Phòng khám"}
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {isEn ? "Clinic Portal" : "Cổng Phòng Khám"}
              </span>
              <span aria-hidden="true">/</span>
              <span>
                {isEn ? "24/7 clinical intake & records" : "Tiếp nhận khám bệnh & hồ sơ y bạ"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Link
              href={`/${locale}/clinic/appointments`}
              className="hidden sm:inline-flex min-h-9 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
            >
              {isEn ? "New check-in" : "Tiếp nhận ca"}
            </Link>

            <ThemeToggle variant="text" />
            <LocaleSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8 flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-150 motion-reduce:animate-none">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xs bg-card border-r border-border shadow-xl flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div>
                <span className="font-display text-base font-bold text-foreground block leading-tight">
                  PawCare
                </span>
                <span className="text-xs text-muted-foreground">
                  {isEn ? "Clinic workspace" : "Cổng phòng khám"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={isEn ? "Close menu" : "Đóng menu"}
                className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <div className="p-3.5 border-b border-border">
              <Link
                href={`/${locale}/clinic/appointments`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-10 items-center justify-center w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-95 transition"
              >
                {isEn ? "Check in patient" : "Tiếp nhận ca khám mới"}
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {linkSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </div>
                  {section.items.map(({ href, label, ...rest }) => {
                    const fullHref = `/${locale}${href}`;
                    const isActive =
                      href === "/clinic"
                        ? pathname === fullHref
                        : pathname?.startsWith(fullHref);
                    const badge = "badge" in rest ? rest.badge : undefined;

                    return (
                      <Link
                        key={href}
                        href={fullHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex min-h-10 items-center justify-between rounded-lg px-2.5 py-2 text-sm transition cursor-pointer ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        {badge && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="p-3.5 border-t border-border mt-auto">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full min-h-10 items-center justify-center rounded-lg border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-50"
              >
                {isSigningOut
                  ? isEn ? "Signing out..." : "Đang đăng xuất..."
                  : isEn ? "Sign out" : "Đăng xuất"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label={isEn ? "Clinic mobile navigation" : "Điều hướng di động phòng khám"}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,4px)] backdrop-blur lg:hidden"
      >
        {[
          {
            href: "/clinic",
            label: isEn ? "Overview" : "Tổng quan",
            active: pathname === `/${locale}/clinic`,
          },
          {
            href: "/clinic/appointments",
            label: isEn ? "Bookings" : "Lịch khám",
            active: pathname?.startsWith(`/${locale}/clinic/appointments`),
          },
          {
            href: "/clinic/records",
            label: isEn ? "Records" : "Hồ sơ",
            active:
              pathname?.startsWith(`/${locale}/clinic/records`) ||
              pathname?.startsWith(`/${locale}/clinic/patients`),
          },
          {
            href: "/clinic/care-plans",
            label: isEn ? "Plans" : "Phác đồ",
            active: pathname?.startsWith(`/${locale}/clinic/care-plans`),
          },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={`/${locale}${tab.href}`}
            className={`flex min-h-13 items-center justify-center border-t-2 px-1 text-[11px] transition ${
              tab.active
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            <span className="truncate">{tab.label}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`flex min-h-13 items-center justify-center border-t-2 px-1 text-[11px] transition cursor-pointer ${
            mobileMenuOpen ||
            pathname?.startsWith(`/${locale}/clinic/rescue`) ||
            pathname?.startsWith(`/${locale}/clinic/billing`) ||
            pathname?.startsWith(`/${locale}/clinic/verification`) ||
            pathname?.startsWith(`/${locale}/clinic/sos-settings`) ||
            pathname?.startsWith(`/${locale}/clinic/settings`)
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground font-medium"
          }`}
        >
          <span className="truncate">{isEn ? "More" : "Thêm"}</span>
        </button>
      </nav>
    </div>
  );
}
