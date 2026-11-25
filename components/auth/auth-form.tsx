"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Stethoscope,
  User,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { googleSignInAction, signInAction, signUpAction } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const params = useSearchParams();
  const isSignup = mode === "sign-up";

  const initialContext = params.get("context") === "clinic" ? "clinic" : "owner";
  const [accountType, setAccountType] = useState<"owner" | "clinic">(initialContext);

  const isEn = locale === "en";

  const action = async (formData: FormData) => {
    setClientError(null);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const name = String(formData.get("name") || "").trim();

    if (isSignup && !name) {
      setClientError(
        isEn
          ? "Please enter your full name or facility name."
          : "Vui lòng nhập họ và tên hoặc tên cơ sở phòng khám."
      );
      return;
    }
    if (!email || !email.includes("@")) {
      setClientError(
        isEn
          ? "Please enter a valid email address (e.g. user@gmail.com)."
          : "Vui lòng nhập địa chỉ email hợp lệ (VD: user@gmail.com)."
      );
      return;
    }
    if (password.length < 8) {
      setClientError(
        isEn
          ? "Password must be at least 8 characters."
          : "Mật khẩu phải có tối thiểu 8 ký tự (VD: Pawcare@2026)."
      );
      return;
    }

    setPending(true);
    try {
      formData.set("locale", locale);
      formData.set("context", accountType);
      formData.set("next", params.get("next") ?? "");
      if (isSignup) await signUpAction(formData);
      else await signInAction(formData);
    } catch (err: any) {
      // Re-throw redirect errors so Next.js navigates
      if (
        err?.digest?.startsWith?.("NEXT_REDIRECT") ||
        err?.message?.includes?.("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setClientError(
        isEn
          ? "Connection error. Please check your network and try again."
          : "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại."
      );
    } finally {
      setPending(false);
    }
  };

  const errorCode = params.get("error");
  const getErrorMessage = (code: string | null) => {
    if (!code) return null;
    switch (code) {
      case "password_too_short":
        return isEn ? "Password must be at least 8 characters." : "Mật khẩu phải có tối thiểu 8 ký tự.";
      case "invalid_email":
        return isEn ? "Please enter a valid email address." : "Vui lòng nhập địa chỉ email hợp lệ.";
      case "unavailable":
        return t("errorUnavailable");
      case "invalid_credentials":
        return t("errorInvalidCredentials");
      case "email_not_confirmed":
        return t("errorEmailNotConfirmed");
      case "email_exists":
        return t("errorEmailExists");
      case "oauth_error":
      case "oauth_failed":
        return t("errorOauth");
      case "suspended":
        return isEn ? "Your account has been temporarily suspended." : "Tài khoản của bạn tạm thời bị khóa.";
      default:
        return t("error");
    }
  };

  return (
    <div className="grid gap-5">
      {/* Account Type Segment Switcher (Owner vs Clinic) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {isEn ? "Select Account Role" : "Chọn đối tượng tài khoản"}
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
          <button
            type="button"
            onClick={() => setAccountType("owner")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
              accountType === "owner"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="size-4 shrink-0 text-primary" />
            <span>{isEn ? "Pet Owner" : "Chủ nuôi"}</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("clinic")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
              accountType === "clinic"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Stethoscope className="size-4 shrink-0 text-primary" />
            <span>{isEn ? "Vet Clinic" : "Cơ sở y tế"}</span>
          </button>
        </div>
      </div>

      {/* Google Login / Sign Up Button */}
      <form
        action={async (data) => {
          setPending(true);
          try {
            data.set("locale", locale);
            data.set("context", accountType);
            data.set("mode", mode);
            data.set("next", params.get("next") ?? "");
            await googleSignInAction(data);
          } catch (err: any) {
            if (
              err?.digest?.startsWith?.("NEXT_REDIRECT") ||
              err?.message?.includes?.("NEXT_REDIRECT")
            ) {
              throw err;
            }
          } finally {
            setPending(false);
          }
        }}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="context" value={accountType} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={params.get("next") ?? ""} />
        <button
          disabled={pending}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-card py-3 px-4 text-sm font-semibold shadow-xs transition hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 cursor-pointer min-h-[48px] active:scale-[0.99]"
          type="submit"
        >
          <span>
            {accountType === "clinic"
              ? isSignup
                ? isEn
                  ? "Sign up with Google (Clinic)"
                  : "Đăng ký cơ sở y tế với Google"
                : isEn
                ? "Sign in with Google (Clinic)"
                : "Đăng nhập bằng Google (Phòng khám)"
              : isSignup
              ? t("googleSignUp")
              : t("google")}
          </span>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.35 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Email / Password Form */}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="context" value={accountType} />
        <input type="hidden" name="next" value={params.get("next") ?? ""} />

        {/* Sign Up Fields tailored to Account Role */}
        {isSignup && accountType === "owner" && (
          <label className="grid gap-1.5 text-sm font-medium">
            {common("name")}
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder={isEn ? "Jane Doe" : "Nguyễn Văn A"}
              className="rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base min-h-[46px]"
            />
          </label>
        )}

        {isSignup && accountType === "clinic" && (
          <>
            <label className="grid gap-1.5 text-sm font-medium">
              {isEn ? "Clinic / Veterinary Hospital Name" : "Tên cơ sở y tế / Phòng khám"}
              <input
                name="name"
                autoComplete="organization"
                required
                maxLength={120}
                placeholder={
                  isEn ? "PetCare Veterinary Hospital" : "Bệnh viện Thú y PetCare Quận 1"
                }
                className="rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base min-h-[46px]"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              {isEn ? "Practice License / Tax ID (Optional)" : "Số giấy phép thú y / MST (Tùy chọn)"}
              <input
                name="license"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={isEn ? "e.g. VET-2026-HCM-099" : "VD: 0312345678 hoặc CTY-2026/HCM"}
                className="rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base min-h-[46px]"
              />
            </label>
          </>
        )}

        <label className="grid gap-1.5 text-sm font-medium">
          {accountType === "clinic"
            ? isEn
              ? "Official Clinic Email"
              : "Email phòng khám / Bác sĩ"
            : common("email")}
          <input
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            required
            placeholder={
              accountType === "clinic" ? "contact@petcare-clinic.vn" : "example@gmail.com"
            }
            className="rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base min-h-[46px]"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          {common("password")}
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 pr-11 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-base min-h-[46px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 cursor-pointer touch-manipulation"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <span className="text-xs font-normal text-muted-foreground">{t("passwordHint")}</span>
        </label>

        {clientError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive font-medium animate-in fade-in"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{clientError}</span>
          </div>
        )}

        {errorCode && !clientError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs sm:text-sm text-destructive font-medium animate-in fade-in"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{getErrorMessage(errorCode)}</span>
          </div>
        )}

        {params.get("registered") && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium animate-in fade-in"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">
                {isEn
                  ? "🎉 Account registered successfully!"
                  : "🎉 Đăng ký tài khoản PawCare thành công!"}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {isEn
                  ? "Please sign in with your credentials to access your dashboard."
                  : "Vui lòng đăng nhập lại bằng thông tin tài khoản vừa tạo để tiếp tục vào trang chính."}
              </p>
            </div>
          </div>
        )}

        {params.get("sent") && (
          <div
            role="status"
            className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
          >
            {t("checkEmail")}
          </div>
        )}

        <button
          disabled={pending}
          type="submit"
          className="rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground shadow-md transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 cursor-pointer min-h-[48px] text-base touch-manipulation"
        >
          {pending
            ? common("loading")
            : isSignup
            ? accountType === "clinic"
              ? isEn
                ? "Register Clinic Account"
                : "Đăng ký Cơ sở y tế"
              : t("confirm")
            : accountType === "clinic"
            ? isEn
              ? "Sign in as Clinic"
              : "Đăng nhập Cơ sở y tế"
            : t("submit")}
        </button>
      </form>

      {/* Helpful note for Clinics wishing to verify */}
      {accountType === "clinic" && (
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>
              {isEn
                ? "Want full verification badge on directory?"
                : "Muốn nhận huy hiệu chứng thực y tế trên danh bạ?"}
            </span>
          </span>
          <Link
            href={`/${locale}/clinic-apply`}
            className="font-bold text-primary hover:underline shrink-0"
          >
            {isEn ? "Apply verification →" : "Đăng ký thẩm định →"}
          </Link>
        </div>
      )}
    </div>
  );
}

