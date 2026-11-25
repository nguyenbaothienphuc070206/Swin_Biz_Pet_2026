import Link from "next/link";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {AuthForm} from "@/components/auth/auth-form";
import {BackButton} from "@/components/ui/back-button";
import {HeartPulse, Stethoscope} from "lucide-react";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams?: Promise<{next?: string; context?: string}>;
}) {
  const {locale} = await params;
  const sp: {next?: string; context?: string} = (await searchParams) ?? {};
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  const isEn = locale === "en";

  const isPetSetup = sp.next?.includes("pet-health-setup");
  const isClinicSetup = sp.next?.includes("clinic-profile-setup") || sp.context === "clinic";

  const queryParams = new URLSearchParams();
  if (sp.next) queryParams.set("next", sp.next);
  if (sp.context) queryParams.set("context", sp.context);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center">
          <BackButton
            fallbackHref={`/${locale}`}
            label={isEn ? "Back to Home" : "Quay về Trang chủ"}
            variant="pill"
          />
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-9">
          <div className="mb-8 flex items-center justify-between">
            <Link href={`/${locale}`} className="font-display text-2xl font-bold text-primary">
              {common("brand")}
            </Link>
          </div>

          {/* Context Guidance Banners */}
          {isPetSetup && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-xs sm:text-sm text-foreground">
              <HeartPulse className="mt-0.5 size-5 shrink-0 text-primary animate-pulse" />
              <div>
                <p className="font-bold text-primary">
                  {isEn ? "Pet Health Profile Setup" : "Thiết lập Hồ sơ Sức khỏe Thú cưng"}
                </p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {isEn
                    ? "Please sign in or register to set up your pet's digital health record. You will be automatically redirected to setup right after."
                    : "Vui lòng đăng nhập hoặc đăng ký tài khoản để thiết lập hồ sơ sức khỏe cho thú cưng. Bạn sẽ được tự động chuyển đến trang thiết lập ngay sau khi hoàn tất."}
                </p>
              </div>
            </div>
          )}

          {isClinicSetup && !isPetSetup && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-xs sm:text-sm text-foreground">
              <Stethoscope className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold text-blue-700 dark:text-blue-300">
                  {isEn ? "Clinic Facility Setup" : "Thiết lập Cơ sở Phòng khám"}
                </p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {isEn
                    ? "Please sign in or register to set up your clinic practice profile. You will be automatically redirected to setup right after."
                    : "Vui lòng đăng nhập hoặc đăng ký để thiết lập thông tin cơ sở phòng khám. Bạn sẽ được tự động chuyển đến bảng thiết lập ngay sau đó."}
                </p>
              </div>
            </div>
          )}

          <h1 className="font-display text-3xl font-bold">{t("welcome")}</h1>
          <div className="mt-7">
            <Suspense fallback={<p>{common("loading")}</p>}>
              <AuthForm mode="sign-in" />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link className="font-semibold text-primary underline" href={`/${locale}/sign-up${queryString}`}>
              {common("signUp")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
