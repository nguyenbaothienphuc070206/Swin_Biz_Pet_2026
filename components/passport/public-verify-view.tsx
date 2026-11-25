"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Building2,
  Syringe,
  Pill,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Info,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { SharedPetDataProjection } from "@/modules/passport/share-service";

export function PublicVerifyView({
  token,
  locale = "vi",
}: {
  token: string;
  locale?: string;
}) {
  const isVi = locale === "vi";
  const [loading, setLoading] = useState(true);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [projection, setProjection] = useState<SharedPetDataProjection | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clinic Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function fetchRecord(pin?: string) {
    setLoading(true);
    setPinError("");
    setError(null);

    try {
      const res = await fetch(`/api/passport/verify/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPin) {
          setRequiresPin(true);
          setPinError(data.message || (isVi ? "Mã PIN không đúng" : "Invalid PIN"));
        } else {
          setError(data.message || (isVi ? "Không tìm thấy hồ sơ hoặc mã đã hết hạn" : "Record not found or expired"));
        }
        setLoading(false);
        return;
      }

      if (data.requiresPin) {
        setRequiresPin(true);
      } else if (data.projection) {
        setProjection(data.projection);
        setRequiresPin(false);
      }
    } catch {
      setError(isVi ? "Lỗi kết nối mạng, vui lòng thử lại" : "Network error, please retry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecord();
  }, [token]);

  async function handleImportToClinic() {
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/passport/verify/${encodeURIComponent(token)}/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportSuccess(
          isVi
            ? "Đã tiếp nhận hồ sơ vào phòng khám! Lịch sử y bạ được liên kết thành công."
            : "Successfully imported patient history into your clinic file!"
        );
      } else {
        setImportError(
          data.error === "clinic_membership_required"
            ? (isVi ? "Bạn cần đăng nhập tài khoản Bác sĩ / Nhân viên phòng khám để tiếp nhận." : "You must sign in as clinic staff to import.")
            : (data.message || (isVi ? "Không thể tiếp nhận hồ sơ" : "Failed to import"))
        );
      }
    } catch {
      setImportError(isVi ? "Lỗi kết nối khi gửi yêu cầu tiếp nhận" : "Connection error during import");
    } finally {
      setIsImporting(false);
    }
  }

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {isVi ? "Đang xác thực mã y bạ PawCare..." : "Verifying PawCare medical passport..."}
        </p>
      </div>
    );
  }

  // --- PIN Gate View ---
  if (requiresPin) {
    return (
      <div className="mx-auto max-w-md p-4 sm:p-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600">
            <Lock className="size-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground">
            {isVi ? "Hồ Sơ Được Bảo Vệ Bằng Mã PIN" : "PIN-Protected Health Record"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isVi
              ? "Chủ nuôi đã cài đặt mã bảo mật cho liên kết này. Vui lòng nhập mã PIN (4-6 chữ số) do chủ nuôi cung cấp."
              : "The pet owner has protected this record. Please enter the 4-6 digit PIN provided by the owner."}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchRecord(pinInput);
            }}
            className="space-y-3 pt-2"
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center tracking-[0.5em] text-2xl font-bold rounded-xl border border-border bg-background py-3 px-4 focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {pinError && <p className="text-xs font-semibold text-destructive">{pinError}</p>}
            <button
              type="submit"
              disabled={pinInput.length < 4}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              {isVi ? "Xác Nhận Mở Hồ Sơ" : "Unlock Medical Record"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error || !projection) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 space-y-3">
          <AlertTriangle className="mx-auto size-10 text-destructive" />
          <h2 className="text-lg font-bold text-destructive">
            {isVi ? "Mã Xác Thực Không Hợp Lệ" : "Invalid Verification Token"}
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            href={`/${locale}`}
            className="inline-block mt-3 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted"
          >
            {isVi ? "Quay về trang chủ PawCare" : "Return to PawCare"}
          </Link>
        </div>
      </div>
    );
  }

  const { pet, rabiesStatus, provenance } = projection;
  const isRabiesOnly = provenance.shareType === "rabies_verification";

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6 pb-20">
      {/* Verification Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <ShieldCheck className="size-4 shrink-0" />
            {isVi ? "Chứng Thực Y Bạ Điện Tử PawCare" : "Verified PawCare Passport"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          ID: #{pet.id.slice(0, 8)}
        </span>
      </div>

      {/* --- RABIES COMPLIANCE BANNER --- */}
      <div
        className={`rounded-3xl border p-5 shadow-sm ${
          rabiesStatus.isValid
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-300"
            : "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-300"
        }`}
      >
        <div className="flex items-start gap-3.5">
          {rabiesStatus.isValid ? (
            <CheckCircle2 className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="size-6 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-base sm:text-lg">
                {rabiesStatus.isValid
                  ? (isVi ? "ĐÃ TIÊM PHÒNG DẠI HỢP LỆ (VALID)" : "RABIES VACCINATION CERTIFIED")
                  : (isVi ? "CẢNH BÁO: CHƯA CÓ CHỨNG NHẬN DẠI HỢP LỆ" : "WARNING: NO VALID RABIES RECORD")}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                  rabiesStatus.isValid
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {rabiesStatus.isValid ? (isVi ? "Hợp Lệ" : "Certified") : (isVi ? "Hết Hạn / Chưa Tiêm" : "Expired")}
              </span>
            </div>

            {rabiesStatus.isValid ? (
              <div className="text-xs sm:text-sm space-y-0.5 opacity-90">
                <p>
                  {isVi ? "Hiệu lực đến ngày" : "Valid until"}:{" "}
                  <strong>{rabiesStatus.expiresAt}</strong>{" "}
                  {rabiesStatus.daysRemaining !== undefined && (
                    <span>({isVi ? `còn ${rabiesStatus.daysRemaining} ngày` : `${rabiesStatus.daysRemaining} days left`})</span>
                  )}
                </p>
                <p className="text-xs">
                  {isVi ? "Vắc-xin" : "Vaccine"}: {rabiesStatus.vaccineName || "Rabisin / Defensor"} · Lô: {rabiesStatus.lot || "N/A"}
                </p>
                {rabiesStatus.issuingClinic && (
                  <p className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Building2 className="size-3.5 shrink-0" />
                    <span>{rabiesStatus.issuingClinic}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm opacity-90">
                {isVi
                  ? "Bé chưa có mũi tiêm dại còn hạn trong hệ thống. Theo Nghị định 90/2017/NĐ-CP & Thông tư 07/2016/TT-BNNPTNT, chủ nuôi bắt buộc phải tiêm phòng dại định kỳ hàng năm."
                  : "No active rabies certificate on file. Annual vaccination is legally required under Vietnamese veterinary law."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --- PET PROFILE SUMMARY CARD --- */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold font-display border border-primary/20">
            {pet.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              {pet.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {pet.species === "dog" ? (isVi ? "Chó" : "Dog") : pet.species === "cat" ? (isVi ? "Mèo" : "Cat") : pet.species}
              {pet.breed ? ` · ${pet.breed}` : ""}
              {pet.gender ? ` · ${pet.gender === "female" ? (isVi ? "Cái" : "Female") : (isVi ? "Đực" : "Male")}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60 text-xs">
          <div className="rounded-xl bg-secondary/50 p-2.5">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              {isVi ? "Vi Mạch (Microchip)" : "Microchip ID"}
            </span>
            <span className="font-mono font-bold text-foreground">
              {pet.microchip || (isVi ? "Chưa gắn chip" : "None")}
            </span>
          </div>

          <div className="rounded-xl bg-secondary/50 p-2.5">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              {isVi ? "Cân nặng" : "Weight"}
            </span>
            <span className="font-bold text-foreground">
              {pet.weightKg ? `${pet.weightKg} kg` : (isVi ? "Chưa đo" : "N/A")}
            </span>
          </div>

          <div className="rounded-xl bg-secondary/50 p-2.5 col-span-2 sm:col-span-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              {isVi ? "Ngày sinh" : "Birth Date"}
            </span>
            <span className="font-bold text-foreground">
              {pet.birthDate || (isVi ? "Không rõ" : "Unknown")}
            </span>
          </div>
        </div>

        {/* Owner Contact if authorized */}
        {projection.ownerContact && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
            <span className="font-bold text-primary block">
              {isVi ? "Thông tin liên hệ chủ nuôi (Đã cấp quyền)" : "Owner Contact (Authorized)"}
            </span>
            <p className="text-foreground">
              {projection.ownerContact.name} · {projection.ownerContact.phone} · {projection.ownerContact.district}
            </p>
          </div>
        )}
      </div>

      {/* --- RECEIVING CLINIC IMPORT ACTION BANNER --- */}
      <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Building2 className="size-5 text-primary shrink-0" />
          <h4 className="font-display font-bold text-sm sm:text-base text-foreground">
            {isVi ? "Tiếp Nhận Hồ Sơ Vào Phòng Khám Của Bạn" : "Import Patient to Your Clinic"}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isVi
            ? "Bác sĩ hoặc quầy lễ tân có thể gắn kèm y bạ này vào hồ sơ phòng khám của mình với sự đồng ý của chủ nuôi (Tuân thủ Nghị định 13/2023/NĐ-CP). Dữ liệu nhập khẩu được lưu trữ minh bạch nguồn gốc ban đầu."
            : "Veterinarians can attach this verified history to their practice file with owner consent (Decree 13/2023/ND-CP). Imported records preserve original clinic attribution."}
        </p>

        {importSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{importSuccess}</span>
          </div>
        )}
        {importError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleImportToClinic}
            disabled={isImporting || Boolean(importSuccess)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Building2 className="size-4" />
            <span>
              {isImporting
                ? (isVi ? "Đang tiếp nhận..." : "Importing...")
                : importSuccess
                ? (isVi ? "Đã Tiếp Nhận Thành Công" : "Imported")
                : (isVi ? "Tiếp Nhận Vào Phòng Khám Của Tôi" : "Import to My Clinic")}
            </span>
          </button>

          <a
            href={`/api/passport/${encodeURIComponent(pet.id)}/export?locale=${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <Download className="size-4 text-muted-foreground" />
            <span>{isVi ? "Tải Bản Sao Y Bạ PDF" : "Download PDF Passport"}</span>
          </a>
        </div>
      </div>

      {/* --- FULL RECORD SECTIONS (If not minimal collar mode) --- */}
      {!isRabiesOnly && (
        <div className="space-y-4 pt-2">
          {/* Vaccinations */}
          {projection.vaccinations && projection.vaccinations.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Syringe className="size-4 text-primary" />
                <h3 className="font-display font-bold text-base text-foreground">
                  {isVi ? "Lịch Sử Tiêm Chủng Đã Ghi Nhận" : "Vaccination History"}
                </h3>
              </div>

              <div className="space-y-2">
                {projection.vaccinations.map((v: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground text-sm block">
                        {v.name}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {isVi ? "Ngày tiêm" : "Administered"}: {v.date} · {isVi ? "Tái chủng" : "Next Due"}: {v.nextDue || "N/A"}
                        {v.lot ? ` · Lô: ${v.lot}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        {isVi ? "Phòng khám xác thực" : "Clinic Verified"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Medications */}
          {projection.medications && projection.medications.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Pill className="size-4 text-primary" />
                <h3 className="font-display font-bold text-base text-foreground">
                  {isVi ? "Đơn Thuốc & Điều Trị Hiện Tại" : "Current Medications"}
                </h3>
              </div>
              <div className="space-y-2">
                {projection.medications.map((m: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs space-y-0.5">
                    <span className="font-bold text-foreground">{m.name}</span>
                    <span className="text-muted-foreground block">
                      {m.dose} · {m.instructions}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allergies & Conditions */}
          {((projection.allergies && projection.allergies.length > 0) ||
            (projection.conditions && projection.conditions.length > 0)) && (
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                <h3 className="font-display font-bold text-base text-foreground">
                  {isVi ? "Dị Ứng & Tiền Sử Bệnh Nền" : "Allergies & Conditions"}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {projection.allergies?.map((a: any, idx: number) => (
                  <span
                    key={`all-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300"
                  >
                    ⚠ {a.name} ({a.severity || "theo dõi"})
                  </span>
                ))}
                {projection.conditions?.map((c: any, idx: number) => (
                  <span
                    key={`cond-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    • {c.name} [{c.status || "mãn tính"}]
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- FOOTER COMPLIANCE & LEGAL NOTICE --- */}
      <div className="pt-4 text-center text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          {isVi
            ? "PawCare · Nền tảng Hồ sơ Sức khỏe Thú cưng Thông minh Việt Nam"
            : "PawCare · Intelligent Pet Healthcare Platform Vietnam"}
        </p>
        <p>
          {isVi
            ? "Thông tin hồ sơ hiển thị theo quyền cấp phép của chủ nuôi tuân thủ Nghị định 13/2023/NĐ-CP & Luật Thú y Việt Nam. Không thay thế chẩn đoán lâm sàng trực tiếp."
            : "Data displayed under pet owner authorization in accordance with Decree 13/2023/ND-CP. Does not replace direct clinical diagnosis."}
        </p>
      </div>
    </div>
  );
}

