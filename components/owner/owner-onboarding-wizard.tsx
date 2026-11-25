"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Heart,
  Sparkles,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { HealthProfileSetupForm } from "@/components/pet/health-profile-setup-form";

const HCMC_DISTRICTS = [
  "Quận 1",
  "Quận 2 (Thủ Đức)",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 9 (Thủ Đức)",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Thạnh",
  "Phú Nhuận",
  "Gò Vấp",
  "Tân Bình",
  "Tân Phú",
  "Bình Tân",
  "TP. Thủ Đức",
  "Huyện Bình Chánh",
  "Huyện Nhà Bè",
  "Huyện Củ Chi",
  "Huyện Hóc Môn",
  "Tỉnh/Thành khác",
];

export function OwnerOnboardingWizard({
  initialUserName = "",
  initialUserEmail = "",
}: {
  initialUserName?: string;
  initialUserEmail?: string;
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [step, setStep] = useState<1 | 2>(1);

  // User Profile Form State
  const [fullName, setFullName] = useState(initialUserName || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(initialUserEmail || "");
  const [gender, setGender] = useState("male");
  const [birthDate, setBirthDate] = useState("1992-05-18");
  const [city, setCity] = useState("TP. Hồ Chí Minh");
  const [district, setDistrict] = useState("Quận 1");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing profile from localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pawcare-user-profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.email && !email) setEmail(parsed.email);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.birthDate) setBirthDate(parsed.birthDate);
        if (parsed.city) setCity(parsed.city);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.emergencyContact) setEmergencyContact(parsed.emergencyContact);
      } else {
        const storedName = localStorage.getItem("pawcare-owner-name");
        if (storedName && !fullName) setFullName(storedName);
        const storedPhone = localStorage.getItem("pawcare-user-phone");
        if (storedPhone && !phone) setPhone(storedPhone);
      }
    } catch {}
  }, []);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMsg(
        isEn
          ? "Please enter your full name."
          : "Vui lòng nhập họ và tên của bạn."
      );
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 8) {
      setErrorMsg(
        isEn
          ? "Please enter a valid phone number (at least 8-10 digits)."
          : "Vui lòng nhập số điện thoại hợp lệ (ít nhất 8-10 chữ số) để phòng khám liên hệ."
      );
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMsg(
        isEn
          ? "Please enter a valid email address."
          : "Vui lòng nhập địa chỉ email hợp lệ để nhận thông báo và y bạ."
      );
      return;
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setErrorMsg(
        isEn
          ? "Please enter your city / province."
          : "Vui lòng nhập tỉnh / thành phố của bạn."
      );
      return;
    }

    const trimmedDistrict = district.trim();
    if (!trimmedDistrict) {
      setErrorMsg(
        isEn
          ? "Please select your district / area."
          : "Vui lòng chọn quận / huyện của bạn."
      );
      return;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setErrorMsg(
        isEn
          ? "Please enter your street address / apartment."
          : "Vui lòng nhập địa chỉ nhà / số nhà, tên đường hoặc căn hộ."
      );
      return;
    }

    // Save profile to localStorage and sync to Settings
    try {
      const profileData = {
        fullName: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        gender,
        birthDate,
        city: trimmedCity,
        district: trimmedDistrict,
        address: trimmedAddress,
        emergencyContact: emergencyContact.trim(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("pawcare-user-profile", JSON.stringify(profileData));
      localStorage.setItem("pawcare-owner-name", trimmedName);
      localStorage.setItem("pawcare-user-phone", trimmedPhone);
      localStorage.setItem("pawcare-user-district", trimmedDistrict);
      window.dispatchEvent(
        new CustomEvent("pawcare-user-profile-updated", { detail: profileData })
      );
    } catch {}

    // Advance to Step 2: Pet Profile Setup
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Visual Stepper Tracker */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold">
          {/* Step 1 Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`grid size-7 sm:size-8 place-items-center rounded-full text-xs font-bold transition ${
                step === 1
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {step > 1 ? <CheckCircle2 className="size-4" /> : "1"}
            </div>
            <div className="text-left">
              <span
                className={`block text-[11px] font-bold ${
                  step === 1 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isEn ? "Step 1" : "Bước 1"}
              </span>
              <span className="font-semibold text-foreground text-xs hidden sm:inline">
                {isEn ? "User Profile" : "Thông tin chủ nuôi"}
              </span>
            </div>
          </div>

          {/* Connector Line */}
          <div
            className={`flex-1 mx-3 sm:mx-6 h-1 rounded-full transition-colors ${
              step > 1 ? "bg-emerald-500" : "bg-border"
            }`}
          />

          {/* Step 2 Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`grid size-7 sm:size-8 place-items-center rounded-full text-xs font-bold transition ${
                step === 2
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div className="text-left">
              <span
                className={`block text-[11px] font-bold ${
                  step === 2 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isEn ? "Step 2" : "Bước 2"}
              </span>
              <span className="font-semibold text-foreground text-xs hidden sm:inline">
                {isEn ? "Pet Profile" : "Hồ sơ thú cưng"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: USER / OWNER PROFILE INFORMATION */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-primary/15 via-card to-emerald-500/10 p-6 sm:p-8 text-center sm:text-left shadow-xs">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary mb-3">
              <User className="size-3.5" />
              <span>
                {isEn
                  ? "Step 1 of 2 · Account Information"
                  : "Bước 1 / 2 · Thông tin chủ nuôi"}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEn ? "Set Up Your Profile" : "Nhập Thông Tin Người Dùng"}
            </h1>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-semibold text-destructive animate-in fade-in">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Profile Form */}
          <form
            onSubmit={handleStep1Submit}
            className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-xs space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "Full Name" : "Họ và tên chủ nuôi"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Alex Nguyen"
                        : "VD: Nguyễn Văn An, Trần Thu Hà..."
                    }
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <User className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "Phone Number" : "Số điện thoại liên hệ"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <Phone className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Used for clinic appointments & emergency contact"
                    : "Dùng để bác sĩ xác nhận lịch khám & liên hệ khi khẩn cấp"}
                </span>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "Email Address" : "Địa chỉ Email"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <Mail className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Receives e-passport updates and invoices"
                    : "Nhận thông báo cập nhật y bạ và biên lai tiêm chủng"}
                </span>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isEn ? "Gender" : "Giới tính"}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="male">{isEn ? "Male" : "Nam"}</option>
                  <option value="female">{isEn ? "Female" : "Nữ"}</option>
                  <option value="other">{isEn ? "Other / Prefer not to say" : "Khác / Không tiết lộ"}</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isEn ? "Date of Birth" : "Ngày sinh"}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <Calendar className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "City / Province" : "Tỉnh / Thành phố"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="TP. Hồ Chí Minh"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <MapPin className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* District Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "District / Area" : "Quận / Huyện"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{isEn ? "-- Select District / Area --" : "-- Chọn Quận / Huyện --"}</option>
                  {HCMC_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Street Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{isEn ? "Street Address / Apartment" : "Địa chỉ nhà / Căn hộ"}</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. 124 Le Loi, Ben Thanh"
                        : "VD: 124 Lê Lợi, Phường Bến Thành"
                    }
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <Home className="size-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Emergency Contact Note */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isEn
                    ? "Secondary Emergency Contact (Optional)"
                    : "Liên hệ khẩn cấp phụ (Zalo / Người thân - Tùy chọn)"}
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. Family member phone: 0987654321"
                      : "VD: Số điện thoại người thân hoặc Zalo phụ khi bạn đi vắng"
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:opacity-95 transition cursor-pointer active:scale-98"
              >
                <span>
                  {isEn
                    ? "Continue: Set Up Pet Profile"
                    : "Tiếp tục: Thiết lập hồ sơ thú cưng"}
                </span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: PET PROFILE SETUP FORM */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Header Banner */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-emerald-500/15 via-card to-primary/10 p-6 sm:p-8 text-center sm:text-left shadow-xs">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-3">
              <Heart className="size-3.5 text-emerald-600" />
              <span>
                {isEn
                  ? "Step 2 of 2 · Digital Pet Passport"
                  : "Bước 2 / 2 · Thiết lập hồ sơ bé cưng"}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isEn ? "Set Up Your Pet Profile" : "Thiết Lập Hồ Sơ Thú Cưng"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {isEn
                ? "Enter your pet's basic information, birthdate, weight, and vaccination history to generate their official digital health passport."
                : "Khởi tạo thẻ căn cước y tế cho bé: tên, giống loài, ngày sinh, thể trạng và các mũi tiêm phòng để hoàn tất thiết lập tài khoản."}
            </p>
          </div>

          {/* Embedded Health Profile Form configured for Onboarding */}
          <HealthProfileSetupForm
            locale={locale}
            redirectTo={`/${locale}/owner?welcome=1`}
            submitLabel={
              isEn
                ? "Save Pet & Enter Home Dashboard →"
                : "Lưu hồ sơ & Vào Trang chủ PawCare →"
            }
            onBack={() => {
              setStep(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onCompleted={() => {
              try {
                localStorage.setItem("pawcare-onboarding-completed", "true");
              } catch {}
            }}
          />
        </div>
      )}
    </div>
  );
}
