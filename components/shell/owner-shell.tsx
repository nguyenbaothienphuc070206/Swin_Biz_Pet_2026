"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  HeartPulse,
  PlusCircle,
  CalendarDays,
  AlertTriangle,
  UsersRound,
  MapPin,
  ReceiptText,
  Settings,
  Home,
  ClipboardCheck,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Plus,
  ArrowRight,
  Palette,
  Sun,
  Moon,
  Laptop,
  Globe,
  Bell,
  Scale,
  Check,
  Clock,
  Syringe,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { useOwnerPlan } from "@/lib/hooks/use-owner-plan";
import { PortalSyncBridge } from "./portal-sync-bridge";
import { localizeReminder, localizePetName } from "@/modules/i18n/localize-data";

interface ShellReminderItem {
  id: string;
  petName: string;
  title: string;
  dueDate: string;
  category: "vaccine" | "deworm" | "medication" | "checkup" | "grooming";
  completed: boolean;
}

const getDefaultReminders = (isEn: boolean): ShellReminderItem[] => [
  {
    id: "rem-1",
    petName: "Milo",
    title: isEn ? "Annual Rabies Booster Vaccination" : "Tiêm nhắc lại Mũi dại định kỳ hàng năm",
    dueDate: "2026-11-15",
    category: "vaccine",
    completed: false,
  },
  {
    id: "rem-2",
    petName: "Milo",
    title: isEn ? "Quarterly Deworming & Flea Preventative" : "Tẩy giun & nhỏ gáy phòng ve rận Q4",
    dueDate: "2026-11-05",
    category: "deworm",
    completed: false,
  },
  {
    id: "rem-3",
    petName: "Luna",
    title: isEn ? "Dental Cleaning & General Health Checkup" : "Vệ sinh răng miệng & Khám tổng quát",
    dueDate: "2026-11-20",
    category: "checkup",
    completed: false,
  },
  {
    id: "rem-4",
    petName: "Milo",
    title: isEn ? "DHPPi Core Vaccine 5-in-1" : "Mũi nhắc 5 bệnh chó mèo cơ bản",
    dueDate: "2026-10-10",
    category: "vaccine",
    completed: true,
  },
];

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const { plan, isPremium, isFree } = useOwnerPlan();
  const isEn = locale === "en";
  const common = useTranslations("common");
  const owner = useTranslations("owner");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Appearance & Preferences state for Mobile Menu Drawer
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("pawcare-theme") as any) || "light";
      setThemeMode(savedTheme);

      const savedUnit = localStorage.getItem("pawcare-weight-unit");
      if (savedUnit === "kg" || savedUnit === "lbs") setWeightUnit(savedUnit);

      const savedNotif = localStorage.getItem("pawcare-notifications-enabled");
      if (savedNotif !== null) setNotifEnabled(savedNotif === "true");
    }
  }, []);

  const changeTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawcare-theme", mode);
      const isDark =
        mode === "dark" ||
        (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const changeWeightUnit = (unit: "kg" | "lbs") => {
    setWeightUnit(unit);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawcare-weight-unit", unit);
      window.dispatchEvent(new CustomEvent("pawcare-unit-updated", { detail: unit }));
    }
  };

  const toggleNotifications = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawcare-notifications-enabled", String(next));
      window.dispatchEvent(new CustomEvent("pawcare-notif-updated", { detail: next }));
    }
  };

  const handleLanguageSwitch = (targetLocale: "vi" | "en") => {
    if (targetLocale === locale) return;
    if (typeof document !== "undefined") {
      document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const cleanPath = pathname.replace(/^\/(vi|en)(?=\/|$)/, "");
    const search = typeof window !== "undefined" ? window.location.search : "";
    window.location.href = `/${targetLocale}${cleanPath}${search}`;
  };

  // Notification / Reminders State for Top Navigation
  const [reminders, setReminders] = useState<ShellReminderItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    const getOwnerPrimaryPetName = (): string => {
      try {
        const storedPets = localStorage.getItem("pawcare-user-pets");
        if (storedPets) {
          const parsedPets = JSON.parse(storedPets);
          if (Array.isArray(parsedPets) && parsedPets[0]?.name) {
            return localizePetName(parsedPets[0].name, isEn);
          }
        }
      } catch {}
      return isEn ? "Bo" : "Bơ";
    };

    const loadReminders = () => {
      const primaryPet = getOwnerPrimaryPetName();
      try {
        const stored = localStorage.getItem("pawcare-care-reminders");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReminders(parsed.map((r) => localizeReminder(r, isEn, primaryPet)));
            return;
          }
        }
      } catch {}
      const defaults = getDefaultReminders(isEn).map((r) =>
        localizeReminder(r, isEn, primaryPet)
      );
      setReminders(defaults);
      try {
        localStorage.setItem("pawcare-care-reminders", JSON.stringify(defaults));
      } catch {}
    };

    loadReminders();
    window.addEventListener("pawcare-reminders-updated", loadReminders);
    window.addEventListener("pawcare-pets-updated", loadReminders);
    window.addEventListener("storage", loadReminders);
    return () => {
      window.removeEventListener("pawcare-reminders-updated", loadReminders);
      window.removeEventListener("pawcare-pets-updated", loadReminders);
      window.removeEventListener("storage", loadReminders);
    };
  }, [isEn]);

  const toggleReminder = (id: string) => {
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    setReminders(updated);
    try {
      localStorage.setItem("pawcare-care-reminders", JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("pawcare-reminders-updated", { detail: updated })
      );
    } catch {}
  };

  const pendingCount = reminders.filter((r) => !r.completed).length;
  const filteredReminders = reminders.filter((r) => {
    if (notificationFilter === "pending") return !r.completed;
    if (notificationFilter === "completed") return r.completed;
    return true;
  });

  // Close mobile drawer and notification panel on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  // Close mobile drawer and notification panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowNotifications(false);
      }
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

  // Collapsible & Resizable Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pawcare-sidebar-collapsed");
      if (saved !== null) {
        const collapsed = saved === "true";
        setIsCollapsed(collapsed);
        if (collapsed) setSidebarWidth(68);
      }
    } catch {}
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    setSidebarWidth(next ? 68 : 240);
    try {
      localStorage.setItem("pawcare-sidebar-collapsed", String(next));
    } catch {}
  };

  // Draggable right border to resize or snap to icon-only mode
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(68, Math.min(320, e.clientX));
      if (newWidth <= 125) {
        setIsCollapsed(true);
        setSidebarWidth(68);
      } else {
        setIsCollapsed(false);
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem("pawcare-sidebar-collapsed", String(sidebarWidth <= 125));
      } catch {}
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, sidebarWidth]);

  const handleSignOut = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pawcare_synced_owner_id");
        } catch {}
      }
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

  // Sidebar Feature Links (Matching requested order with highlighted primary & SOS items)
  const sidebarLinks = [
    {
      href: "/pet-health-setup",
      label: isEn ? "Set Up Pet Profile" : "Thiết lập hồ sơ thú cưng",
      icon: PlusCircle,
      isPrimaryAction: true,
    },
    {
      href: "/owner",
      label: isEn ? "Dashboard" : "Trang chính",
      icon: LayoutDashboard,
    },
    {
      href: "/owner/pets",
      label: isEn ? "Pet Profiles" : "Hồ sơ thú cưng",
      icon: HeartPulse,
    },
    {
      href: "/owner/appointments",
      label: isEn ? "Book Appointment" : "Hẹn lịch khám",
      icon: CalendarDays,
    },
    {
      href: "/owner/care-plans",
      label: isEn ? "Care Plans" : "Kế hoạch chăm sóc",
      icon: ClipboardCheck,
    },
    {
      href: "/clinics",
      label: isEn ? "Clinics / Spas / Shops" : "Phòng khám/Spa/Shop",
      icon: MapPin,
    },
    {
      href: "/owner/community",
      label: isEn ? "Community" : "Cộng đồng",
      icon: UsersRound,
    },
    {
      href: "/owner/billing",
      label: isEn ? "Subscription Plans" : "Gói đăng ký",
      icon: ReceiptText,
    },
    {
      href: "/owner/sos",
      label: isEn ? "SOS Emergency 24/7" : "Cấp cứu SOS 24/7",
      icon: AlertTriangle,
      isAlert: true,
    },
    {
      href: "/settings",
      label: isEn ? "Account Settings" : "Cài đặt tài khoản",
      icon: Settings,
    },
  ] as const;

  const isSetupPage = pathname?.endsWith("/owner/setup") || pathname?.includes("/owner/setup");
  const currentWidth = isCollapsed ? 68 : sidebarWidth;

  return (
    <div className="min-h-screen md:flex bg-background">
      {/* Left Sidebar Column - Resizable / Collapsible to icon-only mode (Hidden on Onboarding Setup) */}
      {!isSetupPage && (
        <aside
          style={{ width: `${currentWidth}px` }}
          className={`hidden shrink-0 border-r border-border bg-card p-3 md:flex md:flex-col sticky top-0 h-screen overflow-y-auto relative ${
            isDragging ? "select-none" : "transition-[width] duration-150 ease-in-out"
          }`}
        >
        {/* Drag handle on right edge to resize or collapse sidebar */}
        <div
          onMouseDown={handleMouseDown}
          title={isEn ? "Drag to resize or collapse sidebar" : "Kéo chuột để chỉnh độ rộng hoặc thu gọn chỉ hiện icon"}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors z-20 group"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-primary transition-colors opacity-0 group-hover:opacity-100" />
        </div>

        {/* Brand Header & Collapse Toggle Button */}
        <div className={`mb-5 flex items-center ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
          {isCollapsed ? (
            <Link
              href={`/${locale}/owner`}
              title={common("brand")}
              className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary font-display font-bold text-lg hover:scale-105 transition-transform"
            >
              <HeartPulse className="size-5" />
            </Link>
          ) : (
            <Link
              className="font-display text-2xl font-bold text-primary transition hover:opacity-90 truncate"
              href={`/${locale}/owner`}
            >
              {common("brand")}
            </Link>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? isEn ? "Expand sidebar" : "Mở rộng thanh điều hướng"
                : isEn ? "Collapse to icon-only" : "Thu gọn chỉ hiện icon"
            }
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer shrink-0"
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* Feature Navigation List */}
        <nav className="grid gap-1.5 flex-1">
          {sidebarLinks.map(({ href, label, icon: Icon, ...rest }) => {
            const isAlert = "isAlert" in rest && Boolean(rest.isAlert);
            const isPrimaryAction = "isPrimaryAction" in rest && Boolean(rest.isPrimaryAction);
            const fullHref = `/${locale}${href}`;
            const isActive =
              href === "/owner"
                ? pathname === fullHref
                : pathname?.startsWith(fullHref);

            let linkClasses = "";
            let iconClasses = "";

            if (isPrimaryAction) {
              if (isActive) {
                linkClasses = "bg-primary text-primary-foreground font-bold shadow-sm ring-2 ring-primary/30";
                iconClasses = "text-primary-foreground";
              } else {
                linkClasses = "border border-primary/45 bg-primary/20 text-primary font-bold hover:bg-primary/30 hover:border-primary/60 shadow-2xs";
                iconClasses = "text-primary";
              }
            } else if (isAlert) {
              if (isActive) {
                linkClasses = "bg-destructive text-destructive-foreground font-bold shadow-sm ring-2 ring-destructive/30";
                iconClasses = "text-destructive-foreground";
              } else {
                linkClasses = "border border-destructive/40 bg-destructive/20 text-destructive font-bold hover:bg-destructive/30 hover:border-destructive/60 shadow-2xs";
                iconClasses = "text-destructive";
              }
            } else {
              if (isActive) {
                linkClasses = "bg-primary/20 text-primary font-bold shadow-2xs ring-1 ring-primary/30";
                iconClasses = "text-primary";
              } else {
                linkClasses = "text-muted-foreground hover:bg-secondary hover:text-foreground";
                iconClasses = "text-muted-foreground";
              }
            }

            return (
              <Link
                key={href}
                href={fullHref}
                title={label}
                className={`flex items-center ${
                  isCollapsed ? "justify-center px-1" : "gap-2.5 px-3"
                } rounded-xl py-2 text-xs sm:text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer min-h-[38px] ${linkClasses}`}
              >
                <Icon size={18} className={`shrink-0 ${iconClasses}`} />
                {!isCollapsed && <span className="leading-snug line-clamp-2">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Bottom / Logout */}
        <div className="mt-auto pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title={isEn ? "Sign Out" : "Đăng xuất"}
            className={`flex w-full items-center ${
              isCollapsed ? "justify-center px-1" : "gap-2.5 px-3"
            } rounded-xl py-2 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer min-h-[38px] disabled:opacity-50`}
          >
            <LogOut size={18} className={`shrink-0 ${isSigningOut ? "animate-spin" : ""}`} />
            {!isCollapsed && (
              <span>
                {isSigningOut
                  ? isEn ? "Signing out..." : "Đang đăng xuất..."
                  : isEn ? "Sign Out" : "Đăng xuất"}
              </span>
            )}
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className={`min-w-0 flex-1 flex flex-col ${isSetupPage ? "pb-8" : "pb-28 md:pb-8"}`}>
        {/* Top Header Bar: Clean, Centered on Mobile, No Paw Icon, No SOS Button */}
        <header className="sticky top-0 z-30 relative flex items-center justify-between border-b border-border bg-background/95 px-3.5 sm:px-6 py-2.5 sm:py-3 backdrop-blur-md md:px-8 shadow-2xs">
          {/* Left Title / Branding & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isSetupPage && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={isEn ? "Open navigation menu" : "Mở menu điều hướng"}
                className="grid size-9 place-items-center rounded-xl border border-border/80 bg-card text-foreground hover:bg-secondary md:hidden cursor-pointer transition active:scale-95 shadow-2xs"
              >
                <Menu className="size-5" />
              </button>
            )}
            <Link
              href={`/${locale}/owner`}
              className={`${isSetupPage ? "flex" : "hidden md:flex"} font-display text-xl sm:text-2xl font-bold tracking-tight text-primary hover:opacity-90 transition`}
            >
              {common("brand")}
            </Link>
          </div>

          {/* Centered Brand Title on Mobile */}
          {!isSetupPage && (
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto">
              <Link
                href={`/${locale}/owner`}
                className="font-display text-xl font-extrabold tracking-tight text-primary hover:opacity-90 transition select-none"
              >
                {common("brand")}
              </Link>
            </div>
          )}

          {/* Right Header Controls: Desktop Theme/Language + Mobile Notification Bell */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Header Controls: Theme toggle & Language switcher (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>

            {/* Notification / Reminders Bell (Replaces theme & language on mobile) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label={isEn ? "Notifications & Reminders" : "Thông báo & Lịch nhắc"}
                title={isEn ? "Notifications & Reminders" : "Thông báo & Lịch nhắc"}
                className={`grid size-9 place-items-center rounded-xl border transition active:scale-95 cursor-pointer relative shadow-2xs ${
                  showNotifications
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/80 bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <Bell className="size-4.5" />
                {pendingCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-xs">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                    <span className="absolute -top-1 -right-1 size-4.5 rounded-full bg-rose-400 opacity-60 animate-ping pointer-events-none" />
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Floating Notification & Reminders Panel */}
        {showNotifications && (
          <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4 animate-in fade-in duration-150">
            {/* Backdrop overlay */}
            <div
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
              aria-hidden="true"
            />

            {/* Panel Card */}
            <div className="relative z-10 w-full sm:max-w-sm mt-12 sm:mt-10 mx-2 sm:mx-0 rounded-3xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">
                      {isEn ? "Care Reminders & Alerts" : "Thông báo & Lịch nhắc"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {pendingCount > 0
                        ? isEn
                          ? `${pendingCount} pending task${pendingCount === 1 ? "" : "s"}`
                          : `${pendingCount} lịch nhắc cần thực hiện`
                        : isEn
                        ? "All caught up!"
                        : "Đã hoàn thành tất cả"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-border/50 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setNotificationFilter("all")}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    notificationFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {isEn ? "All" : "Tất cả"} ({reminders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter("pending")}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    notificationFilter === "pending"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {isEn ? "Pending" : "Chưa xong"} ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter("completed")}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    notificationFilter === "completed"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {isEn ? "Completed" : "Đã xong"} ({reminders.length - pendingCount})
                </button>
              </div>

              {/* Reminders List (Scrollable) */}
              <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                {filteredReminders.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <div className="text-3xl">🐾</div>
                    <p className="text-xs font-bold text-foreground">
                      {isEn ? "No reminders in this view" : "Không có lịch nhắc nào"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isEn ? "You're all set with care routines!" : "Bé cưng đang được chăm sóc rất tốt!"}
                    </p>
                  </div>
                ) : (
                  filteredReminders.map((rem) => {
                    const isDone = rem.completed;
                    return (
                      <div
                        key={rem.id}
                        className={`group flex items-start gap-3 p-2.5 rounded-2xl border transition ${
                          isDone
                            ? "bg-muted/30 border-border/40 opacity-60"
                            : "bg-card border-border/80 hover:border-primary/40 shadow-2xs"
                        }`}
                      >
                        {/* Checkbox / Toggle status button */}
                        <button
                          type="button"
                          onClick={() => toggleReminder(rem.id)}
                          title={
                            isDone
                              ? isEn ? "Mark as pending" : "Đánh dấu chưa xong"
                              : isEn ? "Mark as completed" : "Đánh dấu hoàn thành"
                          }
                          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border transition cursor-pointer active:scale-95 ${
                            isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border hover:border-primary text-transparent hover:text-muted-foreground"
                          }`}
                        >
                          <Check className="size-3.5" />
                        </button>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {rem.petName}
                            </span>
                            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {rem.category === "vaccine"
                                ? isEn ? "Vaccine" : "Tiêm phòng"
                                : rem.category === "deworm"
                                ? isEn ? "Deworm" : "Tẩy giun"
                                : rem.category === "checkup"
                                ? isEn ? "Checkup" : "Khám tổng quát"
                                : isEn ? "Care" : "Chăm sóc"}
                            </span>
                          </div>

                          <p className={`text-xs font-semibold mt-1 leading-snug ${
                            isDone ? "line-through text-muted-foreground" : "text-foreground"
                          }`}>
                            {rem.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 shrink-0" />
                              <span>{rem.dueDate}</span>
                            </span>
                            {!isDone && (
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                {isEn ? "Upcoming" : "Sắp tới"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                <Link
                  href={`/${locale}/settings#reminders`}
                  onClick={() => setShowNotifications(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 px-3 text-xs font-bold text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition text-center"
                >
                  <span>{isEn ? "Manage in Settings" : "Quản lý trong Cài đặt"}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className={`mx-auto w-full ${isSetupPage ? "max-w-4xl p-4 md:p-8" : "max-w-7xl p-4 pb-24 md:p-8 md:pb-8"} flex-1`}>
          {children}
        </main>
      </div>

      {/* Mobile Slide-Over Navigation Drawer */}
      {!isSetupPage && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer sheet panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-card border-r border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Top / Brand & Close */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <span className="font-display text-lg font-bold text-primary block leading-tight">
                    {common("brand")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isEn ? "Pet Owner Portal" : "Cổng thông tin chủ nuôi"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={isEn ? "Close menu" : "Đóng menu"}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Membership badge in Drawer */}
            <div className="p-3 mx-3 my-2 rounded-2xl border border-border/80 bg-muted/30 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {isEn ? "Current Membership:" : "Gói thành viên:"}
              </span>
              <Link
                href={`/${locale}/owner/billing`}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] transition hover:opacity-90 ${
                  isPremium
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-muted text-foreground border border-border hover:bg-secondary"
                }`}
              >
                {isPremium ? "⭐ Premium" : "Free"}
              </Link>
            </div>

            {/* Scrollable Settings in Drawer */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
              {/* Account Settings Link */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
                  {isEn ? "Account Settings" : "Cài đặt tài khoản"}
                </span>
                <Link
                  href={`/${locale}/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-3.5 transition hover:bg-primary/20 active:scale-[0.98] group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                      <Settings className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition">
                        {isEn ? "Account Settings" : "Cài đặt tài khoản"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isEn ? "Personal profile, security & sessions" : "Hồ sơ cá nhân & bảo mật"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Preferences Divider */}
              <div className="border-t border-border/80 pt-3 space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block px-1">
                  {isEn ? "Preferences & Display" : "Tùy chỉnh & Hiển thị"}
                </span>

                {/* 1. Theme / Giao diện */}
                <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Palette className="size-4 text-primary shrink-0" />
                    <span>{isEn ? "Theme Appearance" : "Giao diện (Theme)"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => changeTheme("light")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition cursor-pointer border ${
                        themeMode === "light"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="size-3.5 shrink-0 text-amber-500" />
                      <span>{isEn ? "Light" : "Sáng"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTheme("dark")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition cursor-pointer border ${
                        themeMode === "dark"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Moon className="size-3.5 shrink-0 text-blue-400" />
                      <span>{isEn ? "Dark" : "Tối"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeTheme("system")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition cursor-pointer border ${
                        themeMode === "system"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Laptop className="size-3.5 shrink-0" />
                      <span>{isEn ? "Auto" : "Hệ thống"}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Language / Ngôn ngữ */}
                <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Globe className="size-4 text-primary shrink-0" />
                    <span>{isEn ? "Language" : "Ngôn ngữ"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleLanguageSwitch("vi")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition cursor-pointer border ${
                        locale === "vi"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>🇻🇳</span>
                      <span>Tiếng Việt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLanguageSwitch("en")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition cursor-pointer border ${
                        locale === "en"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>🇬🇧</span>
                      <span>English</span>
                    </button>
                  </div>
                </div>

                {/* 3. Weight Unit / Đơn vị cân nặng */}
                <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Scale className="size-4 text-primary shrink-0" />
                      <span>{isEn ? "Weight Unit" : "Đơn vị cân nặng"}</span>
                    </div>
                    <span className="text-[11px] font-mono text-primary font-bold">
                      {weightUnit.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => changeWeightUnit("kg")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition cursor-pointer border ${
                        weightUnit === "kg"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Kilogram (kg)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => changeWeightUnit("lbs")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition cursor-pointer border ${
                        weightUnit === "lbs"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Pound (lbs)</span>
                    </button>
                  </div>
                </div>

                {/* 4. Notifications / Thông báo */}
                <div className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Bell className="size-4 text-primary shrink-0" />
                      <span>{isEn ? "Notifications" : "Thông báo nhắc nhở"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleNotifications}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        notifEnabled ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                          notifEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {notifEnabled
                      ? isEn
                        ? "Care alerts & vaccine reminders are active"
                        : "Lịch tiêm phòng & lịch khám định kỳ đang bật"
                      : isEn
                      ? "Notifications muted"
                      : "Đang tạm tắt các thông báo nhắc"}
                  </p>
                </div>
              </div>
            </div>

            {/* Drawer Bottom / Sign Out */}
            <div className="p-3 border-t border-border mt-auto">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-50"
              >
                <LogOut size={18} className={`shrink-0 ${isSigningOut ? "animate-spin" : ""}`} />
                <span>
                  {isSigningOut
                    ? isEn ? "Signing out..." : "Đang đăng xuất..."
                    : isEn ? "Sign Out" : "Đăng xuất"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (md:hidden, Hidden on Onboarding Setup) */}
      {!isSetupPage && (
        <nav
          aria-label={common("home")}
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1 backdrop-blur md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        >
        {/* Slot 1: Home / Trang chính */}
        {(() => {
          const href = "/owner";
          const fullHref = `/${locale}${href}`;
          const isActive = pathname === fullHref;
          return (
            <Link
              href={fullHref}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home aria-hidden size={20} className={isActive ? "text-primary" : ""} />
              <span className="truncate">{isEn ? "Home" : "Trang chính"}</span>
            </Link>
          );
        })()}

        {/* Slot 2: My Pets / Sổ y bạ */}
        {(() => {
          const href = "/owner/pets";
          const fullHref = `/${locale}${href}`;
          const isActive = pathname?.startsWith(fullHref);
          return (
            <Link
              href={fullHref}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HeartPulse aria-hidden size={20} className={isActive ? "text-primary" : ""} />
              <span className="truncate">{owner("myPets")}</span>
            </Link>
          );
        })()}

        {/* Slot 3: Center Elevated Add Pet / Health Setup Action Button (Replaced SOS with +) */}
        {(() => {
          const href = "/pet-health-setup";
          const fullHref = `/${locale}${href}`;
          const isActive = pathname?.startsWith(fullHref);
          return (
            <Link
              href={fullHref}
              className="relative -top-3.5 flex flex-col items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring group"
              aria-label={isEn ? "Set Up Pet Health Profile" : "Thiết lập hồ sơ thú cưng"}
            >
              <div
                className={`grid size-12 place-items-center rounded-full shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                    : "bg-primary text-primary-foreground shadow-primary/35 ring-2 ring-background group-hover:scale-105"
                }`}
              >
                <Plus className="size-6.5 shrink-0 stroke-[2.75] text-primary-foreground" />
              </div>
              <span className="mt-1 text-[10px] font-bold tracking-tight text-primary truncate">
                {isEn ? "Set Up" : "Thiết lập"}
              </span>
            </Link>
          );
        })()}

        {/* Slot 4: Appointments / Hẹn lịch */}
        {(() => {
          const href = "/owner/appointments";
          const fullHref = `/${locale}${href}`;
          const isActive = pathname?.startsWith(fullHref);
          return (
            <Link
              href={fullHref}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays aria-hidden size={20} className={isActive ? "text-primary" : ""} />
              <span className="truncate">{owner("bookings")}</span>
            </Link>
          );
        })()}

        {/* Slot 5: Settings / Cài đặt */}
        {(() => {
          const href = "/settings";
          const fullHref = `/${locale}${href}`;
          const isActive = pathname?.startsWith(fullHref);

          return (
            <Link
              href={fullHref}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={isEn ? "Settings" : "Cài đặt"}
            >
              <Settings
                aria-hidden
                size={20}
                className={isActive ? "text-primary" : ""}
              />
              <span className="truncate">
                {isEn ? "Settings" : "Cài đặt"}
              </span>
            </Link>
          );
        })()}
      </nav>
      )}
      <PortalSyncBridge role="owner" />
    </div>
  );
}
