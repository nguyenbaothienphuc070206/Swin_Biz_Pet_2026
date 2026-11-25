"use client";

import { useState, useEffect } from "react";
import { COMMON_POC_CATALOG, type CatalogItem } from "@/modules/passport/barcode";
import { CameraBarcodeScanner } from "./camera-barcode-scanner";

interface QuickVaccineLoggerProps {
  petId: string;
  petName: string;
  species?: string;
  allergies?: string[];
  clinicId?: string;
  onSaved: (entry: any) => void;
  onClose: () => void;
  locale?: string;
}

export function QuickVaccineLogger({
  petId,
  petName,
  allergies = [],
  onSaved,
  onClose,
  locale = "vi",
}: QuickVaccineLoggerProps) {
  const isVi = locale === "vi";
  const [showScanner, setShowScanner] = useState(false);

  const [vaccineName, setVaccineName] = useState("");
  const [code, setCode] = useState("");
  const [dose, setDose] = useState("1 ml");
  const [lot, setLot] = useState("");
  const [administeredAt, setAdministeredAt] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueAt, setNextDueAt] = useState("");
  const [notes] = useState("");

  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(6);
  const [pendingSavedEntry, setPendingSavedEntry] = useState<any | null>(null);

  useEffect(() => {
    try {
      const draftKey = `pawcare_draft_vax_${petId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.vaccineName) setVaccineName(parsed.vaccineName);
        if (parsed.lot) setLot(parsed.lot);
        if (parsed.dose) setDose(parsed.dose);
        if (parsed.nextDueAt) setNextDueAt(parsed.nextDueAt);
      }
    } catch {}
  }, [petId]);

  const saveDraft = (data: Record<string, string>) => {
    try {
      localStorage.setItem(`pawcare_draft_vax_${petId}`, JSON.stringify(data));
    } catch {}
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(`pawcare_draft_vax_${petId}`);
    } catch {}
  };

  const applyCatalogItem = (item: CatalogItem) => {
    setVaccineName(item.name);
    setCode(item.code);
    setDose(item.defaultDose || "1 ml");
    setLot(item.standardLot || `LOT-${new Date().getFullYear()}`);

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (item.nextDueDays || 365));
    setNextDueAt(nextDate.toISOString().slice(0, 10));

    saveDraft({
      vaccineName: item.name,
      code: item.code,
      lot: item.standardLot || "",
      dose: item.defaultDose || "1 ml",
      nextDueAt: nextDate.toISOString().slice(0, 10),
    });
  };

  const handleBarcodeDetected = (result: { code: string; catalogItem?: CatalogItem | null }) => {
    if (result.catalogItem) {
      applyCatalogItem(result.catalogItem);
    } else {
      setCode(result.code);
      setVaccineName(`Vắc-xin mã ${result.code}`);
      setLot(`LOT-${result.code.slice(-4)}`);
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      setNextDueAt(nextDate.toISOString().slice(0, 10));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName.trim() || !lot.trim()) return;

    const newRecord = {
      id: crypto.randomUUID(),
      petId,
      name: vaccineName,
      code: code || "VACC-CUSTOM",
      dose,
      lot,
      administeredAt,
      nextDueAt: nextDueAt || undefined,
      clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
      vetName: isVi ? "BS. Nguyễn Văn Tâm" : "Dr. Nguyen Van Tam",
      verified: true,
      notes,
    };

    setPendingSavedEntry(newRecord);
    setShowUndoToast(true);
    setUndoCountdown(6);
    clearDraft();
  };

  useEffect(() => {
    if (!showUndoToast) return;
    if (undoCountdown <= 0) {
      if (pendingSavedEntry) onSaved(pendingSavedEntry);
      setShowUndoToast(false);
      onClose();
      return;
    }
    const timer = setInterval(() => {
      setUndoCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showUndoToast, undoCountdown, pendingSavedEntry, onSaved, onClose]);

  const handleCancelUndo = () => {
    setShowUndoToast(false);
    setPendingSavedEntry(null);
  };

  return (
    <>
      {showScanner && (
        <CameraBarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
          locale={locale}
        />
      )}

      {showUndoToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-border bg-card text-foreground p-4 shadow-2xl">
          <div className="text-xs">
            <p className="font-bold">
              {isVi ? `Đã lưu mũi tiêm cho ${petName}` : `Vaccination logged for ${petName}`}
            </p>
            <p className="text-muted-foreground tabular-nums">
              {isVi ? `Hoàn tất sau ${undoCountdown}s...` : `Saving in ${undoCountdown}s...`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelUndo}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            {isVi ? "Hoàn tác" : "Undo"}
          </button>
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                {isVi ? "Ghi nhận mũi tiêm vắc-xin" : "Log vaccination"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isVi ? `Bệnh nhân: ${petName}` : `Patient: ${petName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isVi ? "Đóng" : "Close"}
            </button>
          </div>

          {allergies.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">
              {isVi ? "Lưu ý dị ứng:" : "Allergy alert:"} <strong>{allergies.join(", ")}</strong>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {isVi ? "Quét mã vạch hoặc chọn nhanh:" : "Scan barcode or select preset:"}
              </span>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-muted transition cursor-pointer"
              >
                {isVi ? "Mở camera quét" : "Open scanner"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => applyCatalogItem(COMMON_POC_CATALOG[0])}
                className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
              >
                <span className="font-semibold text-foreground block">
                  {isVi ? "Vắc-xin Dại (Rabisin)" : "Rabies (Rabisin)"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isVi ? "1 năm · Bắt buộc" : "1 year · Core"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyCatalogItem(COMMON_POC_CATALOG[2])}
                className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
              >
                <span className="font-semibold text-foreground block">
                  {isVi ? "Vanguard 7 bệnh (Chó)" : "Vanguard 7-in-1 (Dog)"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isVi ? "Mũi tổng hợp chó" : "Canine core combo"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyCatalogItem(COMMON_POC_CATALOG[3])}
                className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
              >
                <span className="font-semibold text-foreground block">
                  {isVi ? "Felocell 4 bệnh (Mèo)" : "Felocell 4-in-1 (Cat)"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isVi ? "Tổng hợp mèo" : "Feline core combo"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyCatalogItem(COMMON_POC_CATALOG[5])}
                className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
              >
                <span className="font-semibold text-foreground block">
                  {isVi ? "ProHeart 12 (Giun tim)" : "ProHeart 12 (Heartworm)"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isVi ? "Bảo vệ 12 tháng" : "12-month protection"}
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-foreground mb-1">
                  {isVi ? "Tên vắc-xin / Thuốc tiêm:" : "Vaccine name:"}
                </label>
                <input
                  type="text"
                  required
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  placeholder={isVi ? "VD: Vắc-xin phòng dại Rabisin" : "e.g. Rabisin Rabies Vaccine"}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {isVi ? "Số lô sản xuất:" : "Batch / Lot:"}
                </label>
                <input
                  type="text"
                  required
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="RAB-2026-X1"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs font-mono focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {isVi ? "Liều lượng:" : "Dosage:"}
                </label>
                <input
                  type="text"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="1 ml"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {isVi ? "Ngày tiêm:" : "Administered date:"}
                </label>
                <input
                  type="date"
                  required
                  value={administeredAt}
                  onChange={(e) => setAdministeredAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {isVi ? "Hẹn tái chủng:" : "Next due date:"}
                </label>
                <input
                  type="date"
                  value={nextDueAt}
                  onChange={(e) => setNextDueAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!vaccineName.trim() || !lot.trim()}
                className="w-full min-h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:brightness-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isVi ? "Xác nhận & lưu mũi tiêm" : "Confirm & log vaccine"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
