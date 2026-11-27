"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  User,
  Settings,
  CreditCard,
  Lock,
  Heart,
  Palette,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Home,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";

interface AccountNavProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  } | null;
  className?: string;
}

export function AccountNav({ user, className = "" }: AccountNavProps) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isEn = locale === "en";

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
      // 1. Wipe cookie via dedicated route handler
      await fetch(`/api/auth/sign-out?locale=${locale}`, {
        method: "POST",
      }).catch(() => {});

      // 2. Invoke Server Action
      const fd = new FormData();
      fd.set("locale", locale);
      await signOutAction(fd).catch(() => {});
    } catch {
    } finally {
      // 3. Immediately redirect to the sign-in / registration screen
      window.location.href = `/${locale}/sign-in`;
    }
  };

  // Default displayed profile
  const displayName = user?.name || (isEn ? "User" : "Người dùng");
  const displayEmail = user?.email || "";
  const isClinic = user?.role === "clinic_admin" || user?.role === "clinic_staff";
  const displayRole = isClinic
    ? (isEn ? "Veterinary Clinic" : "Cơ sở y tế")
    : (isEn ? "Member" : "Thành viên");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // When user is not authenticated: only show person icon that navigates to sign-in / sign-up
  if (user === null) {
    return (
      <div className={`relative inline-block ${className}`}>
        <Link
          href={`/${locale}/sign-in`}
          title={isEn ? "Sign In / Register" : "Đăng ký / Đăng nhập"}
          aria-label={isEn ? "Sign In / Register" : "Đăng ký / Đăng nhập"}
          className="group flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/80 bg-card text-foreground hover:bg-muted/80 shadow-2xs hover:shadow-xs transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
        >
          <div className="grid size-7 sm:size-8 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-105 group-hover:bg-primary/20 transition-all">
            <User className="size-4 sm:size-4.5" />
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      {/* Account Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={isEn ? "Personal Account & Settings" : "Tài khoản cá nhân & Cài đặt"}
        className="group flex items-center gap-2 rounded-full border border-border/80 bg-card p-1 sm:pr-2.5 text-foreground hover:bg-muted/80 shadow-2xs hover:shadow-xs transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
      >
        <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary ring-2 ring-primary/20 group-hover:scale-105 transition-transform">
          <User className="size-4.5" />
        </div>
        <span className="hidden sm:inline-block max-w-[100px] truncate text-xs font-bold">
          {displayName.split(" ")[0]}
        </span>
        <ChevronDown className={`hidden sm:inline-block size-3 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-3xl border border-border bg-card p-2.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Profile Info - Click directly navigates to Settings */}
          <Link
            href={isClinic ? `/${locale}/clinic/settings` : `/${locale}/settings`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3 hover:bg-secondary transition"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <ShieldCheck className="size-3" />
                {displayRole}
              </span>
            </div>
          </Link>

          {/* Quick Menu Links */}
          <div className="mt-2 space-y-1 text-xs font-medium">
            <Link
              href={isClinic ? `/${locale}/clinic` : `/${locale}/owner`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
            >
              <Home className="size-4 text-primary" />
              <span>{isEn ? "Main Dashboard" : "Trang chính"}</span>
            </Link>

            <Link
              href={isClinic ? `/${locale}/clinic/settings` : `/${locale}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
            >
              <Settings className="size-4 text-primary" />
              <span>{isClinic ? (isEn ? "Clinic Settings" : "Cài đặt phòng khám") : isEn ? "Settings" : "Cài đặt"}</span>
            </Link>

            {isClinic ? (
              <>
                <Link
                  href={`/${locale}/clinic/records`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <Heart className="size-4 text-primary" />
                  <span>{isEn ? "Patient Medical Records" : "Bệnh án thú y & Hồ sơ"}</span>
                </Link>

                <Link
                  href={`/${locale}/clinic/billing`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <CreditCard className="size-4 text-emerald-500" />
                  <span>{isEn ? "Billing & Statements" : "Viện phí & Đối soát"}</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/owner/pets`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <Heart className="size-4 text-rose-500" />
                  <span>{isEn ? "Pet Profiles & Health" : "Hồ sơ thú cưng & Y bạ"}</span>
                </Link>

                <Link
                  href={`/${locale}/settings#security`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <Lock className="size-4 text-amber-500" />
                  <span>{isEn ? "Change Password" : "Thay đổi mật khẩu"}</span>
                </Link>

                <Link
                  href={`/${locale}/settings#billing`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <CreditCard className="size-4 text-emerald-500" />
                  <span>{isEn ? "Payment Methods" : "Phương thức thanh toán"}</span>
                </Link>

                <Link
                  href={`/${locale}/settings#display`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground hover:bg-muted transition"
                >
                  <Palette className="size-4 text-blue-500" />
                  <span>{isEn ? "Display & Dark Theme" : "Giao diện & Theme tối"}</span>
                </Link>
              </>
            )}
          </div>

          {/* Divider & Sign Out */}
          <div className="mt-2 border-t border-border pt-2">
            <form onSubmit={handleSignOut}>
              <button
                type="submit"
                disabled={isSigningOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-60"
              >
                <LogOut className={`size-4 shrink-0 ${isSigningOut ? "animate-spin" : ""}`} />
                <span>
                  {isSigningOut
                    ? isEn
                      ? "Signing Out..."
                      : "Đang đăng xuất..."
                    : isEn
                    ? "Sign Out"
                    : "Đăng xuất tài khoản"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
