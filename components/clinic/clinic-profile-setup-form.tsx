"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ensureClinicSessionAction, saveClinicProfileAction, ClinicProfileData } from "@/app/actions/clinic";

export function ClinicProfileSetupForm({ locale }: { locale: string }) {
  const t = useTranslations("clinicProfileSetup");
  const isEn = locale === "en";

  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [chiefVet, setChiefVet] = useState("");
  const [facilityType, setFacilityType] = useState<"private_clinic" | "hospital" | "emergency_center">("private_clinic");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState(isEn ? "Ho Chi Minh City" : "TP. Hồ Chí Minh");
  const [phone, setPhone] = useState("");
  const [hotline, setHotline] = useState("");
  const [email, setEmail] = useState("");

  const [openHours, setOpenHours] = useState("08:00");
  const [closeHours, setCloseHours] = useState("20:00");
  const [is247, setIs247] = useState(false);
  const [hasHomeVisit, setHasHomeVisit] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([
    t("srvGeneral"),
    t("srvSurgery"),
    t("srvImaging"),
  ]);
  const [bio, setBio] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedClinic, setSavedClinic] = useState<ClinicProfileData | null>(null);

  const serviceOptions = [
    { id: "general", label: t("srvGeneral") },
    { id: "surgery", label: t("srvSurgery") },
    { id: "emergency", label: t("srvEmergency") },
    { id: "imaging", label: t("srvImaging") },
    { id: "lab", label: t("srvLab") },
    { id: "dentistry", label: t("srvDentistry") },
    { id: "boarding", label: t("srvBoarding") },
    { id: "spa", label: t("srvSpa") },
  ];

  const handleToggleService = (srvLabel: string) => {
    setSelectedServices((prev) =>
      prev.includes(srvLabel)
        ? prev.filter((s) => s !== srvLabel)
        : [...prev, srvLabel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg(isEn ? "Please enter clinic name." : "Vui lòng nhập tên phòng khám / bệnh viện thú y.");
      return;
    }
    if (!licenseNumber.trim()) {
      setErrorMsg(isEn ? "Please enter veterinary practice license." : "Vui lòng nhập số giấy phép đăng ký / hành nghề.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(isEn ? "Please enter contact phone number." : "Vui lòng nhập số điện thoại tiếp nhận ca khám.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newClinic: ClinicProfileData = {
        id: `clinic-${Date.now()}`,
        name: name.trim(),
        licenseNumber: licenseNumber.trim(),
        chiefVet: chiefVet.trim() || (isEn ? "Attending Veterinary Surgeon" : "Bác sĩ thú y phụ trách"),
        facilityType,
        address: address.trim() || (isEn ? "Central District" : "Khu vực trung tâm"),
        city: city.trim(),
        phone: phone.trim(),
        hotline: hotline.trim() || undefined,
        email: email.trim() || "clinic@pawcare.vn",
        openHours,
        closeHours,
        is247,
        hasHomeVisit,
        services: selectedServices,
        bio: bio.trim(),
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pawcare-clinic-profile", JSON.stringify(newClinic));
          localStorage.setItem("pawcare-registered-clinic", JSON.stringify(newClinic));
          const rawExisting = localStorage.getItem("pawcare-user-clinics");
          const existingList: ClinicProfileData[] = rawExisting ? JSON.parse(rawExisting) : [];
          localStorage.setItem("pawcare-user-clinics", JSON.stringify([newClinic, ...existingList]));
          window.dispatchEvent(new CustomEvent("pawcare-clinic-updated", { detail: newClinic }));
        } catch {}
      }

      await ensureClinicSessionAction(locale as any).catch(() => {});
      await saveClinicProfileAction(newClinic, {
        completeOnboarding: true,
        locale: locale === "en" ? "en" : "vi",
      });

      setSavedClinic(newClinic);
    } catch (err: any) {
      if (
        err?.digest?.startsWith?.("NEXT_REDIRECT") ||
        err?.message?.includes?.("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setErrorMsg(err?.message || (isEn ? "An error occurred while saving." : "Đã xảy ra lỗi khi lưu thông tin."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (savedClinic) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <span className="inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {isEn ? "Profile saved" : "Hồ sơ cơ sở đã kích hoạt"}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">
              {t("successTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("successSubtitle")}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {savedClinic.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {savedClinic.chiefVet}
                </p>
              </div>
              <div className="sm:text-right">
                <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {isEn ? "License ID" : "Số giấy phép"}
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {savedClinic.licenseNumber}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <span className="block text-muted-foreground">{isEn ? "Hours" : "Giờ làm việc"}</span>
                <strong className="block text-foreground mt-0.5 tabular-nums">
                  {savedClinic.is247
                    ? isEn ? "24/7 Emergency" : "Trực cấp cứu 24/7"
                    : `${savedClinic.openHours} – ${savedClinic.closeHours}`}
                </strong>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <span className="block text-muted-foreground">{isEn ? "Reception" : "Số tiếp nhận"}</span>
                <strong className="block text-foreground mt-0.5 tabular-nums">{savedClinic.phone}</strong>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 col-span-2 sm:col-span-1">
                <span className="block text-muted-foreground">{isEn ? "City" : "Khu vực"}</span>
                <strong className="block text-foreground mt-0.5 truncate">{savedClinic.city}</strong>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">{savedClinic.address}</strong>, {savedClinic.city}
            </div>

            {savedClinic.services.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
                <span className="font-semibold text-foreground block">
                  {isEn ? "Active medical services" : "Dịch vụ thú y đã kích hoạt"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {savedClinic.services.map((srv, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground text-[11px]"
                    >
                      {srv}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/${locale}/clinic/appointments`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-95 transition"
            >
              {t("btnManageClinic")}
            </Link>

            <Link
              href={`/${locale}/clinic`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary transition"
            >
              {isEn ? "Back to overview" : "Quay về tổng quan"}
            </Link>
          </div>

          <div className="text-center">
            <Link
              href={`/${locale}/clinic/settings`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {isEn
                ? "Need changes later? Edit profile anytime in Clinic Settings"
                : "Chỉnh sửa thông tin hồ sơ sau này trong Cài đặt phòng khám"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* SECTION 1: Practice & Licensing */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-7 space-y-5">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("sectionBasic")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionBasicDesc")}
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            {errorMsg}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="clinic-name" className="text-xs font-semibold text-foreground block">
            {t("clinicName")} <span className="text-destructive">*</span>
          </label>
          <input
            id="clinic-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("clinicNamePlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground block">
            {t("facilityType")} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "private_clinic",
                label: t("privateClinic"),
                desc: isEn ? "Outpatient & wellness" : "Khám ngoại trú & tiêm phòng",
              },
              {
                id: "hospital",
                label: t("vetHospital"),
                desc: isEn ? "Surgery & inpatient care" : "Phẫu thuật & lưu chuồng",
              },
              {
                id: "emergency_center",
                label: t("emergencyCenter"),
                desc: isEn ? "Round-the-clock triage" : "Cấp cứu & hồi sức 24/7",
              },
            ].map((ft) => (
              <button
                key={ft.id}
                type="button"
                onClick={() => setFacilityType(ft.id as any)}
                className={`rounded-xl border p-3.5 text-left transition cursor-pointer ${
                  facilityType === ft.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                }`}
              >
                <span className="block text-xs font-bold text-foreground">{ft.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{ft.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="clinic-license" className="text-xs font-semibold text-foreground block">
              {t("licenseNumber")} <span className="text-destructive">*</span>
            </label>
            <input
              id="clinic-license"
              type="text"
              required
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={t("licensePlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clinic-chief-vet" className="text-xs font-semibold text-foreground block">
              {t("chiefVet")} <span className="text-destructive">*</span>
            </label>
            <input
              id="clinic-chief-vet"
              type="text"
              required
              value={chiefVet}
              onChange={(e) => setChiefVet(e.target.value)}
              placeholder={t("chiefVetPlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Location & Contact */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-7 space-y-5">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("sectionContact")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionContactDesc")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="clinic-address" className="text-xs font-semibold text-foreground block">
            {t("address")} <span className="text-destructive">*</span>
          </label>
          <input
            id="clinic-address"
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("addressPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-hidden"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="clinic-city" className="text-xs font-semibold text-foreground block">
              {t("city")} <span className="text-destructive">*</span>
            </label>
            <input
              id="clinic-city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("cityPlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clinic-phone" className="text-xs font-semibold text-foreground block">
              {t("phone")} <span className="text-destructive">*</span>
            </label>
            <input
              id="clinic-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium focus:border-primary focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="clinic-hotline" className="text-xs font-semibold text-foreground block">
              {t("hotline")}
            </label>
            <input
              id="clinic-hotline"
              type="tel"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              placeholder={t("hotlinePlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clinic-email" className="text-xs font-semibold text-foreground block">
              {t("email")}
            </label>
            <input
              id="clinic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Operating Hours */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-7 space-y-5">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("sectionHours")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionHoursDesc")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="clinic-open-hours" className="text-xs font-semibold text-foreground block">
              {t("openHours")}
            </label>
            <input
              id="clinic-open-hours"
              type="time"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold tabular-nums focus:border-primary focus:outline-hidden"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="clinic-close-hours" className="text-xs font-semibold text-foreground block">
              {t("closeHours")}
            </label>
            <input
              id="clinic-close-hours"
              type="time"
              value={closeHours}
              onChange={(e) => setCloseHours(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold tabular-nums focus:border-primary focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          <label
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition cursor-pointer ${
              is247
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-background text-foreground hover:bg-secondary/40"
            }`}
          >
            <span>{t("is247")}</span>
            <input
              type="checkbox"
              checked={is247}
              onChange={(e) => setIs247(e.target.checked)}
              className="size-4 rounded"
            />
          </label>

          <label
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition cursor-pointer ${
              hasHomeVisit
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-secondary/40"
            }`}
          >
            <span>{t("hasHomeVisit")}</span>
            <input
              type="checkbox"
              checked={hasHomeVisit}
              onChange={(e) => setHasHomeVisit(e.target.checked)}
              className="size-4 rounded"
            />
          </label>
        </div>
      </div>

      {/* SECTION 4: Medical Services */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs md:p-7 space-y-5">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("sectionServices")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionServicesDesc")}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {serviceOptions.map((srv) => {
            const checked = selectedServices.includes(srv.label);
            return (
              <label
                key={srv.id}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  checked
                    ? "border-primary/50 bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleService(srv.label)}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-foreground">{srv.label}</span>
              </label>
            );
          })}
        </div>

        <div className="space-y-1.5 pt-1">
          <label htmlFor="clinic-bio" className="text-xs font-semibold text-foreground block">
            {t("bio")}
          </label>
          <textarea
            id="clinic-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("bioPlaceholder")}
            className="w-full rounded-xl border border-border bg-background p-3.5 text-sm leading-relaxed focus:border-primary focus:outline-hidden"
          />
        </div>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition hover:brightness-95 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting
            ? isEn ? "Activating clinic profile..." : "Đang kích hoạt hồ sơ phòng khám..."
            : t("submitBtn")}
        </button>
      </div>
    </form>
  );
}
