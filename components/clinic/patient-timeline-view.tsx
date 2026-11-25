"use client";

import { useState } from "react";
import { QuickVaccineLogger } from "./quick-vaccine-logger";

export interface TimelineEntry {
  id: string;
  type: "vaccine" | "prescription" | "note" | "visit";
  title: string;
  date: string;
  details: string;
  lot?: string;
  nextDue?: string;
  verified: boolean;
  clinic?: string;
  vetName?: string;
}

interface PatientTimelineViewProps {
  patient: {
    id: string;
    name: string;
    species: "dog" | "cat" | "other";
    breed?: string;
    birthDate?: string;
    weightKg?: number;
    microchip?: string;
    ownerName: string;
    ownerPhone: string;
    rabiesValid: boolean;
    rabiesExpiresAt?: string;
    allergies?: string[];
    conditions?: string[];
  };
  initialEntries?: TimelineEntry[];
  onBack: () => void;
  locale?: string;
}

export function PatientTimelineView({
  patient,
  initialEntries = [],
  onBack,
  locale = "vi",
}: PatientTimelineViewProps) {
  const isVi = locale === "vi";
  const [entries, setEntries] = useState<TimelineEntry[]>(() => {
    if (initialEntries.length > 0) return initialEntries;
    return [
      {
        id: "vax-1",
        type: "vaccine",
        title: isVi
          ? "Rabisin (Phòng Dại - Boehringer Ingelheim)"
          : "Rabisin (Rabies Vaccine - Boehringer Ingelheim)",
        date: "2026-06-15",
        details: isVi
          ? "Mũi tiêm dại định kỳ hàng năm. Tem kiểm định số VN-RAB-2026."
          : "Annual routine rabies booster. Quarantine stamp #VN-RAB-2026.",
        lot: "RAB-2026-X1",
        nextDue: "2027-06-15",
        verified: true,
        clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
        vetName: isVi ? "BS. Nguyễn Văn Tâm" : "Dr. Nguyen Van Tam",
      },
      {
        id: "vax-2",
        type: "vaccine",
        title: isVi
          ? "Vanguard Plus 5/CV-L (Phòng 7 bệnh chó)"
          : "Vanguard Plus 5/CV-L (Canine 7-in-1 Core Vaccine)",
        date: "2026-06-15",
        details: isVi
          ? "Tiêm bắp 1 liều, không có phản ứng quá mẫn."
          : "1 intramuscular dose, no hypersensitivity reaction.",
        lot: "VG7-2026-09",
        nextDue: "2027-06-15",
        verified: true,
        clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
        vetName: isVi ? "BS. Nguyễn Văn Tâm" : "Dr. Nguyen Van Tam",
      },
      {
        id: "rx-1",
        type: "prescription",
        title: "NexGard Spectra 7.5 - 15kg",
        date: "2026-09-10",
        details: isVi
          ? "1 viên nhai mỗi tháng phòng ve rận & giun tim."
          : "1 chewable tablet monthly for tick, flea & heartworm prevention.",
        verified: true,
        clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
      },
      {
        id: "note-1",
        type: "note",
        title: isVi ? "Khám lâm sàng & kiểm tra thể trạng" : "Clinical Examination & Physical Assessment",
        date: "2026-06-15",
        details: isVi
          ? "Thân nhiệt 38.5°C, niêm mạc hồng hào, tim phổi bình thường. Cân nặng 11.5kg."
          : "Temperature 38.5°C, pink mucosa, clear heart & lung sounds. Weight: 11.5 kg.",
        verified: true,
        clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
      },
    ];
  });

  const [showVaxModal, setShowVaxModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  const handleVaccineLogged = (newRecord: any) => {
    const entry: TimelineEntry = {
      id: newRecord.id,
      type: "vaccine",
      title: newRecord.name,
      date: newRecord.administeredAt,
      details: `${isVi ? "Liều" : "Dose"}: ${newRecord.dose} · ${isVi ? "Lô" : "Lot"}: ${newRecord.lot}${
        newRecord.notes ? ` · ${newRecord.notes}` : ""
      }`,
      lot: newRecord.lot,
      nextDue: newRecord.nextDueAt,
      verified: true,
      clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
      vetName: newRecord.vetName || (isVi ? "Bác sĩ phụ trách" : "Attending Vet"),
    };
    setEntries((prev) => [entry, ...prev]);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const noteEntry: TimelineEntry = {
      id: crypto.randomUUID(),
      type: "note",
      title: isVi ? "Ghi chú điều trị / Theo dõi lâm sàng" : "Clinical Follow-up Note",
      date: new Date().toISOString().slice(0, 10),
      details: newNoteText.trim(),
      verified: true,
      clinic: isVi ? "Phòng khám Thú y Bác Sĩ Tâm" : "Dr. Tam Veterinary Clinic",
    };
    setEntries((prev) => [noteEntry, ...prev]);
    setNewNoteText("");
    setShowNoteModal(false);
  };

  return (
    <>
      {showVaxModal && (
        <QuickVaccineLogger
          petId={patient.id}
          petName={patient.name}
          species={patient.species}
          allergies={patient.allergies}
          onSaved={handleVaccineLogged}
          onClose={() => setShowVaxModal(false)}
          locale={locale}
        />
      )}

      {showNoteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="font-bold text-base text-foreground">
                {isVi ? "Thêm ghi chú lâm sàng" : "Add clinical note"}
              </h3>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isVi ? "Đóng" : "Close"}
              </button>
            </div>
            <textarea
              rows={4}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder={isVi ? "Ghi nhận triệu chứng, lời dặn chủ nuôi, hẹn tái khám..." : "Enter clinical findings..."}
              className="w-full rounded-lg border border-border bg-background p-3 text-xs focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddNote}
              className="w-full min-h-10 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
            >
              {isVi ? "Lưu ghi chú vào bệnh án" : "Save clinical note"}
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted transition cursor-pointer"
          >
            {isVi ? "Quay lại danh sách" : "Back to queue"}
          </button>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {isVi ? "Mã hồ sơ:" : "Record #"} {patient.id.slice(0, 8)}
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl border border-border bg-secondary text-primary font-bold text-lg font-display">
                {patient.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold font-display text-foreground">{patient.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {patient.species === "dog" ? (isVi ? "Chó" : "Dog") : (isVi ? "Mèo" : "Cat")} ·{" "}
                  {patient.breed || (isVi ? "Giống hỗn hợp" : "Mixed breed")}
                </p>
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  {isVi ? "Chủ nuôi" : "Owner"}: <strong className="text-foreground">{patient.ownerName}</strong> ·{" "}
                  <span className="tabular-nums">{patient.ownerPhone}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${
                  patient.rabiesValid
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    : "bg-destructive/15 text-destructive"
                }`}
              >
                {patient.rabiesValid ? (isVi ? "Dại: Hợp lệ" : "Rabies: Valid") : (isVi ? "Hết hạn dại" : "Rabies expired")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
                Chip: {patient.microchip || (isVi ? "Chưa gắn" : "None")}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="sticky top-16 z-20 rounded-xl border border-border bg-card/95 p-2 backdrop-blur-md shadow-xs flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowVaxModal(true)}
            className="flex-1 min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
          >
            {isVi ? "+ Tiêm vắc-xin" : "+ Add vaccine"}
          </button>

          <button
            type="button"
            onClick={() => setShowNoteModal(true)}
            className="min-h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
          >
            {isVi ? "+ Ghi chú" : "+ Note"}
          </button>

          <a
            href={`/api/passport/${encodeURIComponent(patient.id)}/export?locale=${locale}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            {isVi ? "Xuất PDF" : "Export PDF"}
          </a>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
            <span>{isVi ? "Dòng thời gian y bạ" : "Clinical timeline"}</span>
            <span className="tabular-nums">
              {entries.length} {isVi ? "bản ghi" : "records"}
            </span>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{entry.title}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          entry.verified
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {entry.verified ? (isVi ? "Xác thực phòng khám" : "Clinic verified") : (isVi ? "Chủ khai" : "Owner entry")}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block tabular-nums">
                      {entry.date}
                      {entry.nextDue ? ` · ${isVi ? "Tái chủng:" : "Next due:"} ${entry.nextDue}` : ""}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed bg-muted/40 rounded-lg p-2.5">
                  {entry.details}
                </p>

                {entry.clinic && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span>{entry.clinic}</span>
                    {entry.vetName && <span>{entry.vetName}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
