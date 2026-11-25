"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  saveClinicProfileAction,
  type ClinicProfileData,
} from "@/app/actions/clinic";
import { signOutAction } from "@/app/actions/auth";

type SettingsTab = "practice" | "dispatch" | "workflow" | "security";

interface ClinicOperationalSettings {
  dutyStatus: "open" | "busy_surge" | "emergency_only" | "after_hours";
  sosAudioAlert: boolean;
  queueRefreshSec: 15 | 30 | 60;
  escalateCriticalTriage: boolean;
  autoAssignReception: boolean;
  notifyOwnerOnConfirm: boolean;
  followUpReminderDays: 7 | 14 | 30;
  defaultConsultMinutes: 15 | 30 | 45;
  microchipFormat: "ISO_11784" | "AVID_10";
  defaultVaccineBrand: string;
  requireSoapVitals: boolean;
  includeClinicSealOnPdf: boolean;
  autoArchiveDays: 30 | 90;
  clinicalAuditRetention: "3_years" | "5_years" | "permanent";
  updatedAt: string | null;
}

const CLINIC_SETTINGS_STORAGE_KEY = "pawcare-clinic-settings";

const DEFAULT_OPERATIONAL_SETTINGS: ClinicOperationalSettings = {
  dutyStatus: "open",
  sosAudioAlert: true,
  queueRefreshSec: 30,
  escalateCriticalTriage: true,
  autoAssignReception: false,
  notifyOwnerOnConfirm: true,
  followUpReminderDays: 14,
  defaultConsultMinutes: 30,
  microchipFormat: "ISO_11784",
  defaultVaccineBrand: "Zoetis Vanguard Plus 5 / Rabisin",
  requireSoapVitals: true,
  includeClinicSealOnPdf: true,
  autoArchiveDays: 30,
  clinicalAuditRetention: "5_years",
  updatedAt: null,
};

function buildDefaultProfile(isEn: boolean, fallbackName?: string | null, fallbackEmail?: string | null): ClinicProfileData {
  return {
    id: "clinic-local-default",
    name:
      fallbackName?.trim() ||
      (isEn ? "PetCare Veterinary Clinic · District 1" : "Phòng Khám Thú Y PetCare · Quận 1"),
    licenseNumber: "CN-TY-HCM-0428",
    chiefVet: isEn ? "Dr. Nguyen Van Tam (DVM)" : "BS. Nguyễn Văn Tâm (Thú y trưởng)",
    facilityType: "private_clinic",
    address: isEn ? "128 Nguyen Cu Trinh, District 1" : "128 Nguyễn Cư Trinh, Phường Nguyễn Cư Trinh, Quận 1",
    city: isEn ? "Ho Chi Minh City" : "TP. Hồ Chí Minh",
    phone: "028 3824 9115",
    hotline: "0909 115 911",
    email: fallbackEmail || "clinic@pawcare.vn",
    openHours: "08:00",
    closeHours: "20:00",
    is247: false,
    hasHomeVisit: true,
    services: ["Khám tổng quát", "Tiêm phòng", "Cấp cứu SOS", "Xét nghiệm máu"],
    bio: isEn
      ? "Full-service small animal veterinary clinic with clinical EMR and emergency stabilization."
      : "Phòng khám thú y đa khoa chó mèo, tiêm phòng định kỳ và trực cấp cứu ổn định ban đầu.",
    createdAt: "2026-01-15T08:00:00.000Z",
  };
}

export function ClinicSettingsView({
  locale,
  role,
  userEmail,
  clinicName,
}: {
  locale: string;
  role: string;
  userEmail?: string | null;
  clinicName?: string | null;
}) {
  const isEn = locale === "en";
  const [activeTab, setActiveTab] = useState<SettingsTab>("practice");
  const [hydrated, setHydrated] = useState(false);

  const [profile, setProfile] = useState<ClinicProfileData>(() =>
    buildDefaultProfile(isEn, clinicName, userEmail)
  );
  const [settings, setSettings] = useState<ClinicOperationalSettings>(
    DEFAULT_OPERATIONAL_SETTINGS
  );

  const [sosPinStatus, setSosPinStatus] = useState<{
    loading: boolean;
    supports24h: boolean | null;
    address: string | null;
    error: boolean;
  }>({
    loading: true,
    supports24h: null,
    address: null,
    error: false,
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      const storedProfile =
        localStorage.getItem("pawcare-registered-clinic") ||
        localStorage.getItem("pawcare-clinic-profile");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as Partial<ClinicProfileData>;
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          name: parsed.name || clinicName || prev.name,
          email: parsed.email || userEmail || prev.email,
        }));
      }
      const storedSettings = localStorage.getItem(CLINIC_SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as Partial<ClinicOperationalSettings>;
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("activated") === "1") {
        setFeedback({
          kind: "success",
          text: isEn
            ? "Clinic profile activated! All future profile updates are made directly here in Clinic Settings."
            : "Hồ sơ phòng khám đã được kích hoạt! Mọi chỉnh sửa hồ sơ về sau được thực hiện tại trang Cài đặt này.",
        });
      }
    } catch {
      // Fallback cleanly to defaults if local storage is unavailable
    } finally {
      setHydrated(true);
    }

    let cancelled = false;
    fetch("/api/clinic/sos/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("sos-settings-unavailable");
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const firstClinic = Array.isArray(payload?.clinics)
          ? payload.clinics[0]
          : payload?.clinic;
        setSosPinStatus({
          loading: false,
          supports24h: typeof firstClinic?.supports24h === "boolean" ? firstClinic.supports24h : null,
          address: typeof firstClinic?.address === "string" ? firstClinic.address : null,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSosPinStatus({
          loading: false,
          supports24h: null,
          address: null,
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [clinicName, userEmail]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);

    if (!profile.name.trim()) {
      setActiveTab("practice");
      setFeedback({
        kind: "error",
        text: isEn
          ? "Clinic display name is required before saving."
          : "Vui lòng nhập tên phòng khám trước khi lưu.",
      });
      return;
    }

    if (!profile.licenseNumber.trim()) {
      setActiveTab("practice");
      setFeedback({
        kind: "error",
        text: isEn
          ? "Veterinary practice license number is required."
          : "Vui lòng nhập số giấy phép hành nghề thú y.",
      });
      return;
    }

    if (!profile.address.trim()) {
      setActiveTab("practice");
      setFeedback({
        kind: "error",
        text: isEn
          ? "Facility street address is required."
          : "Vui lòng nhập địa chỉ cơ sở phòng khám.",
      });
      return;
    }

    if (!profile.phone.trim()) {
      setActiveTab("practice");
      setFeedback({
        kind: "error",
        text: isEn
          ? "Reception phone number is required."
          : "Vui lòng nhập số điện thoại lễ tân.",
      });
      return;
    }

    if (!profile.is247 && profile.openHours >= profile.closeHours) {
      setActiveTab("practice");
      setFeedback({
        kind: "error",
        text: isEn
          ? "Closing time must be later than opening time when not 24/7."
          : "Giờ đóng cửa phải sau giờ mở cửa khi không trực 24/7.",
      });
      return;
    }

    setSaving(true);
    try {
      const updatedProfile: ClinicProfileData = {
        ...profile,
        name: profile.name.trim(),
        licenseNumber: profile.licenseNumber.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        phone: profile.phone.trim(),
        chiefVet: profile.chiefVet.trim(),
        email: profile.email.trim(),
        bio: profile.bio?.trim() || undefined,
        hotline: profile.hotline?.trim() || undefined,
      };
      const updatedSettings: ClinicOperationalSettings = {
        ...settings,
        defaultVaccineBrand: settings.defaultVaccineBrand.trim() || DEFAULT_OPERATIONAL_SETTINGS.defaultVaccineBrand,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem("pawcare-registered-clinic", JSON.stringify(updatedProfile));
      localStorage.setItem("pawcare-clinic-profile", JSON.stringify(updatedProfile));
      localStorage.setItem(CLINIC_SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      window.dispatchEvent(new CustomEvent("pawcare-clinic-updated", { detail: updatedProfile }));

      await saveClinicProfileAction(updatedProfile).catch(() => null);

      setProfile(updatedProfile);
      setSettings(updatedSettings);
      setFeedback({
        kind: "success",
        text: isEn
          ? "Clinic configuration saved for reception and clinical workstations."
          : "Đã lưu cấu hình vận hành cho quầy lễ tân và bàn khám.",
      });
    } catch {
      setFeedback({
        kind: "error",
        text: isEn
          ? "Could not persist settings locally. Check browser storage permissions."
          : "Không thể lưu cài đặt vào trình duyệt. Vui lòng kiểm tra quyền lưu trữ.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_OPERATIONAL_SETTINGS);
    try {
      localStorage.removeItem(CLINIC_SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore storage failures
    }
    setConfirmReset(false);
    setFeedback({
      kind: "success",
      text: isEn
        ? "Operational defaults restored. Practice license details were kept."
        : "Đã khôi phục mặc định vận hành. Thông tin giấy phép cơ sở được giữ nguyên.",
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const fd = new FormData();
      fd.set("locale", locale);
      await signOutAction(fd).catch(() => {});
      await fetch(`/api/auth/sign-out?locale=${locale}`, { method: "POST" }).catch(() => {});
    } finally {
      window.location.href = `/${locale}/sign-in`;
    }
  };

  const roleLabel =
    role === "clinic_admin"
      ? isEn
        ? "Clinic Administrator"
        : "Quản trị viên phòng khám"
      : isEn
      ? "Veterinary & Reception Staff"
      : "Bác sĩ & Nhân viên phòng khám";

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "practice", label: isEn ? "Practice & Shifts" : "Cơ sở & Ca trực" },
    { id: "dispatch", label: isEn ? "SOS & Alerts" : "Điều phối SOS" },
    { id: "workflow", label: isEn ? "Clinical EMR" : "Quy trình khám" },
    { id: "security", label: isEn ? "Staff & Security" : "Tài khoản & Bảo mật" },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isEn ? "Clinic Operations Console" : "Cấu hình vận hành cơ sở"}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isEn ? "Clinic Settings" : "Cài đặt phòng khám"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isEn
              ? "Manage practice shift status, SOS dispatch preferences, EMR defaults, and staff security controls."
              : "Thiết lập trạng thái ca trực, quy tắc tiếp nhận SOS, mẫu bệnh án điện tử và bảo mật tài khoản nhân sự."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {saving
              ? isEn
                ? "Saving..."
                : "Đang lưu..."
              : isEn
              ? "Save settings"
              : "Lưu cài đặt"}
          </button>
        </div>
      </header>

      {/* Status banner */}
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.kind === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/10 text-foreground"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Section tabs */}
      <div
        role="tablist"
        aria-label={isEn ? "Clinic settings categories" : "Danh mục cài đặt phòng khám"}
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-10 rounded-lg border px-3.5 text-sm font-medium transition cursor-pointer ${
                active
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!hydrated ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            {isEn ? "Loading clinic configuration..." : "Đang tải cấu hình phòng khám..."}
          </p>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: PRACTICE & SHIFTS */}
          {activeTab === "practice" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-5 space-y-5 lg:col-span-2">
                <div className="border-b border-border pb-3">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {isEn ? "Practice Profile, Reception & Shift Hours" : "Hồ sơ cơ sở, Lễ tân & Giờ trực"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? "Clinic profile edits are managed exclusively here and synced to booking cards, certificates, and triage routing."
                      : "Chỉnh sửa toàn bộ thông tin hồ sơ phòng khám tại đây để đồng bộ lên thẻ tiếp nhận, giấy chứng nhận và bảng điều phối."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="clinic-name" className="text-sm font-medium text-foreground block">
                      {isEn ? "Clinic display name" : "Tên phòng khám / Bệnh viện"}
                    </label>
                    <input
                      id="clinic-name"
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-license" className="text-sm font-medium text-foreground block">
                      {isEn ? "Veterinary license no." : "Số giấy phép hành nghề"}
                    </label>
                    <input
                      id="clinic-license"
                      type="text"
                      required
                      value={profile.licenseNumber}
                      onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-facility-type" className="text-sm font-medium text-foreground block">
                      {isEn ? "Facility type" : "Loại hình cơ sở"}
                    </label>
                    <select
                      id="clinic-facility-type"
                      value={profile.facilityType}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          facilityType: e.target.value as ClinicProfileData["facilityType"],
                        })
                      }
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="private_clinic">
                        {isEn ? "Private Veterinary Clinic" : "Phòng khám thú y"}
                      </option>
                      <option value="hospital">
                        {isEn ? "Veterinary Hospital" : "Bệnh viện thú y"}
                      </option>
                      <option value="emergency_center">
                        {isEn ? "24/7 Emergency Center" : "Trung tâm cấp cứu 24/7"}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="clinic-address" className="text-sm font-medium text-foreground block">
                      {isEn ? "Facility street address" : "Địa chỉ cơ sở"}
                    </label>
                    <input
                      id="clinic-address"
                      type="text"
                      required
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-city" className="text-sm font-medium text-foreground block">
                      {isEn ? "City / Province" : "Tỉnh / Thành phố"}
                    </label>
                    <input
                      id="clinic-city"
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-phone" className="text-sm font-medium text-foreground block">
                      {isEn ? "Reception phone" : "Số điện thoại lễ tân"}
                    </label>
                    <input
                      id="clinic-phone"
                      type="tel"
                      required
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-hotline" className="text-sm font-medium text-foreground block">
                      {isEn ? "Emergency hotline" : "Hotline cấp cứu"}
                    </label>
                    <input
                      id="clinic-hotline"
                      type="tel"
                      value={profile.hotline || ""}
                      onChange={(e) => setProfile({ ...profile, hotline: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="clinic-vet" className="text-sm font-medium text-foreground block">
                      {isEn ? "Chief veterinarian" : "Bác sĩ phụ trách chuyên môn"}
                    </label>
                    <input
                      id="clinic-vet"
                      type="text"
                      value={profile.chiefVet}
                      onChange={(e) => setProfile({ ...profile, chiefVet: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="clinic-email" className="text-sm font-medium text-foreground block">
                      {isEn ? "Clinic desk email" : "Email tiếp nhận hành chính"}
                    </label>
                    <input
                      id="clinic-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="duty-status" className="text-sm font-medium text-foreground block">
                      {isEn ? "Current floor capacity & duty status" : "Trạng thái tiếp nhận tại quầy"}
                    </label>
                    <select
                      id="duty-status"
                      value={settings.dutyStatus}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dutyStatus: e.target.value as ClinicOperationalSettings["dutyStatus"],
                        })
                      }
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    >
                      <option value="open">
                        {isEn ? "Normal intake — accepting walk-ins & bookings" : "Hoạt động bình thường — nhận hẹn & khám trực tiếp"}
                      </option>
                      <option value="busy_surge">
                        {isEn ? "High volume — prioritize scheduled slots & SOS" : "Đang đông ca — ưu tiên khách đặt lịch & SOS"}
                      </option>
                      <option value="emergency_only">
                        {isEn ? "Emergency triage only — pause routine slots" : "Chỉ nhận cấp cứu — tạm khóa lịch khám thường"}
                      </option>
                      <option value="after_hours">
                        {isEn ? "After-hours standby" : "Ngoài giờ hành chính — trực dự phòng"}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="open-hours" className="text-sm font-medium text-foreground block">
                      {isEn ? "Opens at" : "Giờ mở cửa"}
                    </label>
                    <input
                      id="open-hours"
                      type="time"
                      disabled={profile.is247}
                      value={profile.openHours}
                      onChange={(e) => setProfile({ ...profile, openHours: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="close-hours" className="text-sm font-medium text-foreground block">
                      {isEn ? "Closes at" : "Giờ đóng cửa"}
                    </label>
                    <input
                      id="close-hours"
                      type="time"
                      disabled={profile.is247}
                      value={profile.closeHours}
                      onChange={(e) => setProfile({ ...profile, closeHours: e.target.value })}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.is247}
                      onChange={(e) => setProfile({ ...profile, is247: e.target.checked })}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground block">
                        {isEn ? "24/7 Emergency Shift" : "Trực cấp cứu 24/7"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isEn ? "Staffed overnight for urgent triage transfers" : "Có bác sĩ trực đêm tiếp nhận ca khẩn cấp"}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.hasHomeVisit}
                      onChange={(e) => setProfile({ ...profile, hasHomeVisit: e.target.checked })}
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground block">
                        {isEn ? "Mobile home visit unit" : "Hỗ trợ khám tại nhà"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isEn ? "Allow vaccination & basic follow-up visits at home" : "Nhận lịch tiêm nhắc & theo dõi sau điều trị tại nhà"}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <span className="text-sm font-medium text-foreground block">
                    {isEn ? "Active clinical services" : "Danh mục dịch vụ chuyên môn"}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      isEn ? "General Wellness & Vaccinations" : "Khám tổng quát & Tiêm phòng vắc-xin",
                      isEn ? "Surgery & Spay/Neuter" : "Phẫu thuật ngoại khoa & Triệt sản",
                      isEn ? "Emergency & Critical Care ICU" : "Cấp cứu & Hồi sức tích cực",
                      isEn ? "Diagnostic Imaging: X-Ray & Ultrasound" : "Chẩn đoán hình ảnh: X-Quang, Siêu âm màu",
                      isEn ? "In-house Hematology & Biochemistry Lab" : "Xét nghiệm máu & Sinh hóa tự động",
                      isEn ? "Veterinary Dentistry & Scaling" : "Nha khoa thú y & Lấy cao răng",
                      isEn ? "Pet Hotel & Medical Boarding" : "Khách sạn & Lưu chuồng điều trị",
                      isEn ? "Bathing, Grooming & Spa" : "Tắm spa, Cắt tỉa & Vệ sinh",
                    ].map((srv) => {
                      const checked = profile.services.includes(srv);
                      return (
                        <label
                          key={srv}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition ${
                            checked
                              ? "border-primary bg-primary/10 text-foreground font-semibold"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setProfile({
                                ...profile,
                                services: checked
                                  ? profile.services.filter((item) => item !== srv)
                                  : [...profile.services, srv],
                              })
                            }
                            className="size-4 accent-primary"
                          />
                          <span>{srv}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="clinic-bio" className="text-sm font-medium text-foreground block">
                    {isEn ? "Clinic introduction & capabilities" : "Giới thiệu đội ngũ & năng lực chuyên môn"}
                  </label>
                  <textarea
                    id="clinic-bio"
                    rows={3}
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-foreground border-b border-border pb-2.5">
                    {isEn ? "Facility Credentials" : "Tóm tắt hồ sơ pháp lý"}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{isEn ? "License no." : "Số giấy phép"}</span>
                      <span className="font-mono font-semibold text-foreground tabular-nums">
                        {profile.licenseNumber || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{isEn ? "City" : "Khu vực"}</span>
                      <span className="font-medium text-foreground text-right">{profile.city || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{isEn ? "Services listed" : "Danh mục dịch vụ"}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {profile.services.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground border-t border-border pt-2.5">
                    {isEn
                      ? "Initial onboarding setup completes during clinic registration. All updates after activation are made directly on this page."
                      : "Thiết lập ban đầu chỉ mở lúc đăng ký phòng khám. Sau khi kích hoạt, mọi chỉnh sửa hồ sơ đều thực hiện tại đây."}
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href={`/${locale}/clinic/verification`}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary transition"
                    >
                      {isEn ? "Open quality verification" : "Hồ sơ kiểm định chất lượng"}
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: SOS & ALERTS */}
          {activeTab === "dispatch" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-5 space-y-4 lg:col-span-2">
                <div className="border-b border-border pb-3">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {isEn ? "SOS Triage & Reception Alert Rules" : "Cấu hình tiếp nhận SOS & thông báo quầy"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? "Triage routing only — clinic staff always confirm emergency intake manually."
                      : "Chỉ hỗ trợ định tuyến phân loại khẩn cấp — nhân sự phòng khám luôn xác nhận tiếp nhận trực tiếp."}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sosAudioAlert}
                      onChange={(e) =>
                        setSettings({ ...settings, sosAudioAlert: e.target.checked })
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground block">
                        {isEn ? "Audible chime for incoming SOS alerts" : "Phát âm thanh cảnh báo khi có ca SOS mới"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isEn
                          ? "Plays a workbench chime at reception when an emergency ping arrives."
                          : "Phát tín hiệu âm thanh tại màn hình lễ tân khi có yêu cầu cấp cứu gần phòng khám."}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.escalateCriticalTriage}
                      onChange={(e) =>
                        setSettings({ ...settings, escalateCriticalTriage: e.target.checked })
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground block">
                        {isEn ? "Pin Red / Critical triage cases to top of queue" : "Ghim ca phân loại Khẩn cấp (Đỏ) lên đầu hàng đợi"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isEn
                          ? "Highlights respiratory distress, poisoning, or trauma alerts above routine check-ins."
                          : "Ưu tiên hiển thị các ca khó thở, ngộ độc hoặc chấn thương trước lịch khám thường."}
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifyOwnerOnConfirm}
                      onChange={(e) =>
                        setSettings({ ...settings, notifyOwnerOnConfirm: e.target.checked })
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground block">
                        {isEn ? "Prepare owner SMS/Zalo confirmation note on check-in approval" : "Tạo mẫu xác nhận lịch khi duyệt ca khám"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isEn
                          ? "Generates pre-filled confirmation details for clinic staff to review before sending."
                          : "Chuẩn bị sẵn nội dung hướng dẫn đến khám và thời gian dự kiến khi nhân viên duyệt lịch."}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="grid gap-4 pt-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="queue-refresh" className="text-sm font-medium text-foreground block">
                      {isEn ? "Dispatch queue polling interval" : "Tần suất làm mới hàng đợi"}
                    </label>
                    <select
                      id="queue-refresh"
                      value={settings.queueRefreshSec}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          queueRefreshSec: Number(e.target.value) as 15 | 30 | 60,
                        })
                      }
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums"
                    >
                      <option value={15}>{isEn ? "Every 15 seconds" : "Mỗi 15 giây"}</option>
                      <option value={30}>{isEn ? "Every 30 seconds" : "Mỗi 30 giây"}</option>
                      <option value={60}>{isEn ? "Every 60 seconds" : "Mỗi 60 giây"}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="followup-days" className="text-sm font-medium text-foreground block">
                      {isEn ? "Default post-visit follow-up window" : "Mốc gợi ý tái khám mặc định"}
                    </label>
                    <select
                      id="followup-days"
                      value={settings.followUpReminderDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          followUpReminderDays: Number(e.target.value) as 7 | 14 | 30,
                        })
                      }
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums"
                    >
                      <option value={7}>{isEn ? "7 days after visit" : "Sau 7 ngày"}</option>
                      <option value={14}>{isEn ? "14 days after visit" : "Sau 14 ngày"}</option>
                      <option value={30}>{isEn ? "30 days after visit" : "Sau 30 ngày"}</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-3 h-fit">
                <h2 className="font-display text-base font-bold text-foreground border-b border-border pb-2.5">
                  {isEn ? "SOS Map Dispatch Status" : "Trạng thái ghim bản đồ SOS"}
                </h2>
                {sosPinStatus.loading ? (
                  <p className="text-sm text-muted-foreground">
                    {isEn ? "Checking SOS dispatch feed..." : "Đang kiểm tra trạng thái SOS..."}
                  </p>
                ) : sosPinStatus.error ? (
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? "SOS coordinate feed is currently using local clinic defaults."
                      : "Chưa kết nối máy chủ SOS trực tuyến — dùng thiết lập cục bộ tại phòng khám."}
                  </p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{isEn ? "24h listing" : "Hiển thị trực 24h"}</span>
                      <span className="font-semibold text-foreground">
                        {sosPinStatus.supports24h
                          ? isEn
                            ? "Active"
                            : "Đang bật"
                          : isEn
                          ? "Daytime only"
                          : "Theo giờ mở cửa"}
                      </span>
                    </div>
                    {sosPinStatus.address && (
                      <p className="text-xs text-muted-foreground">{sosPinStatus.address}</p>
                    )}
                  </div>
                )}
                <Link
                  href={`/${locale}/clinic/sos-settings`}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary transition"
                >
                  {isEn ? "Configure SOS coordinates" : "Cập nhật tọa độ trực SOS"}
                </Link>
              </Card>
            </div>
          )}

          {/* TAB 3: CLINICAL EMR */}
          {activeTab === "workflow" && (
            <Card className="p-5 space-y-5 max-w-3xl">
              <div className="border-b border-border pb-3">
                <h2 className="font-display text-base font-bold text-foreground">
                  {isEn ? "Consultation Slots, Microchip & Vaccine Templates" : "Khung giờ khám, Microchip & Mẫu bệnh án"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Standardize defaults across veterinary workstations to reduce clicks during intake."
                    : "Chuẩn hóa thông số mặc định trên máy trạm bác sĩ để giảm thao tác nhập liệu khi khám."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="consult-duration" className="text-sm font-medium text-foreground block">
                    {isEn ? "Default consultation slot length" : "Thời lượng mỗi lượt khám mặc định"}
                  </label>
                  <select
                    id="consult-duration"
                    value={settings.defaultConsultMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultConsultMinutes: Number(e.target.value) as 15 | 30 | 45,
                      })
                    }
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground tabular-nums"
                  >
                    <option value={15}>{isEn ? "15 minutes (express / vaccine)" : "15 phút (tiêm phòng / tái khám nhanh)"}</option>
                    <option value={30}>{isEn ? "30 minutes (standard exam)" : "30 phút (khám lâm sàng tiêu chuẩn)"}</option>
                    <option value={45}>{isEn ? "45 minutes (diagnostics / chronic)" : "45 phút (xét nghiệm / bệnh lý phức tạp)"}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="microchip-format" className="text-sm font-medium text-foreground block">
                    {isEn ? "Microchip scanner encoding" : "Chuẩn mã hóa đầu đọc Microchip"}
                  </label>
                  <select
                    id="microchip-format"
                    value={settings.microchipFormat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        microchipFormat: e.target.value as ClinicOperationalSettings["microchipFormat"],
                      })
                    }
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="ISO_11784">ISO 11784 / 11785 (15-digit FDX-B)</option>
                    <option value="AVID_10">AVID / FECAVA (10-digit hex)</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="default-vaccine" className="text-sm font-medium text-foreground block">
                    {isEn ? "Preferred vaccine stock label for quick logger" : "Loại vắc-xin gợi ý sẵn khi ghi sổ tiêm nhanh"}
                  </label>
                  <input
                    id="default-vaccine"
                    type="text"
                    value={settings.defaultVaccineBrand}
                    onChange={(e) =>
                      setSettings({ ...settings, defaultVaccineBrand: e.target.value })
                    }
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireSoapVitals}
                    onChange={(e) =>
                      setSettings({ ...settings, requireSoapVitals: e.target.checked })
                    }
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-foreground block">
                      {isEn ? "Prompt SOAP vital signs (temp, weight)" : "Nhắc nhập chỉ số sinh tồn (thân nhiệt, cân nặng)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isEn
                        ? "Reminds clinicians to log weight and temperature on clinical notes."
                        : "Hiển thị khung nhắc nhập cân nặng và thân nhiệt trước khi lưu bệnh án."}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-border p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeClinicSealOnPdf}
                    onChange={(e) =>
                      setSettings({ ...settings, includeClinicSealOnPdf: e.target.checked })
                    }
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-foreground block">
                      {isEn ? "Include clinic stamp block on PDF exports" : "Chèn khung xác nhận phòng khám trên bản xuất PDF"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isEn
                        ? "Prints chief veterinarian signature line and license number on clinical PDFs."
                        : "In kèm họ tên bác sĩ phụ trách và số giấy phép cơ sở trên phiếu xuất."}
                    </span>
                  </span>
                </label>
              </div>
            </Card>
          )}

          {/* TAB 4: STAFF & SECURITY */}
          {activeTab === "security" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5 space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {isEn ? "Active Workstation Session" : "Phiên làm việc hiện tại"}
                  </h2>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">{isEn ? "Role" : "Vai trò"}</span>
                    <span className="font-semibold text-foreground">{roleLabel}</span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">{isEn ? "Account email" : "Email đăng nhập"}</span>
                    <span className="font-medium text-foreground">
                      {userEmail || profile.email || "clinic@pawcare.vn"}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-muted-foreground">{isEn ? "Access policy" : "Nguyên tắc truy cập"}</span>
                    <span className="font-medium text-foreground">
                      {isEn ? "Audit-logged per patient record" : "Ghi nhật ký mọi lượt mở bệnh án"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label htmlFor="audit-retention" className="text-sm font-medium text-foreground block">
                    {isEn ? "Local terminal record cache retention" : "Thời gian giữ bộ nhớ đệm hồ sơ trên máy trạm"}
                  </label>
                  <select
                    id="audit-retention"
                    value={settings.clinicalAuditRetention}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        clinicalAuditRetention: e.target.value as ClinicOperationalSettings["clinicalAuditRetention"],
                      })
                    }
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="3_years">{isEn ? "3 years" : "3 năm"}</option>
                    <option value="5_years">{isEn ? "5 years (recommended)" : "5 năm (khuyến nghị)"}</option>
                    <option value="permanent">{isEn ? "Archive indefinitely" : "Lưu trữ dài hạn"}</option>
                  </select>
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                  {isEn
                    ? "Notice: Clinic workstations store minimum patient summary data with explicit access logging. Always lock this terminal when stepping away."
                    : "Lưu ý bảo mật: Máy trạm phòng khám chỉ lưu tóm tắt cần thiết và ghi nhật ký truy cập hồ sơ. Vui lòng đăng xuất khi rời bàn trực."}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 px-4 text-sm font-semibold text-destructive hover:bg-destructive/15 transition cursor-pointer disabled:opacity-60"
                  >
                    {signingOut
                      ? isEn
                        ? "Signing out..."
                        : "Đang đăng xuất..."
                      : isEn
                      ? "Sign out of clinic workstation"
                      : "Đăng xuất khỏi cổng phòng khám"}
                  </button>
                </div>
              </Card>

              <Card className="p-5 space-y-4 h-fit">
                <div className="border-b border-border pb-3">
                  <h2 className="font-display text-base font-bold text-foreground">
                    {isEn ? "Display & Language Preferences" : "Giao diện & Ngôn ngữ hiển thị"}
                  </h2>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {isEn ? "Workbench color theme" : "Chế độ sáng / tối bàn làm việc"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? "Switch between daylight reception mode and night-shift dark mode."
                        : "Chuyển đổi nhanh giữa chế độ ban ngày và chế độ trực đêm dịu mắt."}
                    </p>
                  </div>
                  <ThemeToggle variant="text" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {isEn ? "Portal language" : "Ngôn ngữ hệ thống"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEn ? "Vietnamese is the primary clinical default." : "Tiếng Việt là ngôn ngữ mặc định tại phòng khám."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/vi/clinic/settings"
                      className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
                        locale === "vi"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      Tiếng Việt
                    </Link>
                    <Link
                      href="/en/clinic/settings"
                      className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
                        locale === "en"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      English
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {confirmReset ? (
                <>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="min-h-10 rounded-lg border border-destructive bg-destructive px-3.5 text-xs font-semibold text-destructive-foreground cursor-pointer"
                  >
                    {isEn ? "Confirm reset defaults" : "Xác nhận khôi phục"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="min-h-10 rounded-lg border border-border bg-background px-3.5 text-xs font-medium text-foreground cursor-pointer"
                  >
                    {isEn ? "Cancel" : "Giữ nguyên"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-10 rounded-lg border border-border bg-background px-3.5 text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  {isEn ? "Restore operational defaults" : "Khôi phục mặc định vận hành"}
                </button>
              )}
              {settings.updatedAt && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {isEn ? "Last saved locally:" : "Lưu gần nhất:"}{" "}
                  {new Date(settings.updatedAt).toLocaleString(isEn ? "en-US" : "vi-VN")}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              {saving
                ? isEn
                  ? "Saving..."
                  : "Đang lưu..."
                : isEn
                ? "Save clinic configuration"
                : "Lưu cấu hình phòng khám"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
