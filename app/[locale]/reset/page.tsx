"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { CheckCircle2, RotateCcw, Home, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ResetPage() {
  const locale = useLocale();
  const isEn = locale === "en";
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    async function purgeAllData() {
      try {
        // 1. Call server API to delete HTTP-only cookies
        await fetch(`/api/auth/sign-out?locale=${locale}`, {
          method: "POST",
        }).catch(() => {});

        // 2. Client-side cookie purge
        if (typeof document !== "undefined") {
          const past = "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;max-age=0;";
          document.cookie = `pawcare_dev_session${past}`;
          document.cookie = `pawcare_dev_session${past}domain=localhost;`;
          document.cookie = `pawcare_dev_session${past}domain=127.0.0.1;`;
        }

        // 3. Purge all PawCare localStorage keys
        if (typeof window !== "undefined") {
          try {
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
              if (key.startsWith("pawcare")) {
                localStorage.removeItem(key);
              }
            }
            sessionStorage.clear();
          } catch {}
        }
      } finally {
        setCleared(true);
      }
    }

    purgeAllData();
  }, [locale]);

  return (
    <main className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-border shadow-lg text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-8 animate-in zoom-in-75 duration-300" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {isEn ? "Sessions & Test Data Cleared" : "Đã xóa phiên & Dữ liệu thử nghiệm"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isEn
              ? "All active sign-in sessions, dev cookies, and stored test accounts have been wiped. The website is now in a clean, logged-out state."
              : "Toàn bộ phiên đăng nhập, cookie thử nghiệm và tài khoản đã được dọn sạch. Trang web hiện ở trạng thái đăng xuất hoàn toàn."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-left text-xs space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isEn ? "Status Summary" : "Tóm tắt trạng thái"}</span>
          </div>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>{isEn ? "Dev session cookie (pawcare_dev_session): Deleted" : "Cookie phiên đăng nhập (pawcare_dev_session): Đã xóa"}</li>
            <li>{isEn ? "Stored pet records & profiles: Cleared" : "Hồ sơ thú cưng & thông tin lưu trữ: Đã xóa"}</li>
            <li>{isEn ? "Authentication state: Logged Out" : "Trạng thái xác thực: Đã đăng xuất"}</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href={`/${locale}`}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 px-4 font-bold text-xs sm:text-sm shadow-sm hover:opacity-90 transition cursor-pointer"
          >
            <Home className="size-4" />
            <span>{isEn ? "Back to Home" : "Về Trang chủ"}</span>
          </Link>
          <Link
            href={`/${locale}/sign-in`}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground py-3 px-4 font-bold text-xs sm:text-sm hover:bg-muted transition cursor-pointer"
          >
            <LogIn className="size-4" />
            <span>{isEn ? "Sign In Fresh" : "Đăng nhập mới"}</span>
          </Link>
        </div>
      </Card>
    </main>
  );
}
