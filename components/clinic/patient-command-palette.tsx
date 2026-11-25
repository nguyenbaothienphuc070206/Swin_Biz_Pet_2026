"use client";

import { useState, useEffect, useRef } from "react";

export interface PatientLookupResult {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed?: string;
  microchip?: string;
  ownerName: string;
  ownerPhone: string;
  lastVisit?: string;
  rabiesValid: boolean;
}

interface PatientCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: PatientLookupResult) => void;
  onOpenScanner: () => void;
  patients: PatientLookupResult[];
  locale?: string;
}

export function PatientCommandPalette({
  isOpen,
  onClose,
  onSelectPatient,
  onOpenScanner,
  patients,
  locale = "vi",
}: PatientCommandPaletteProps) {
  const isVi = locale === "vi";
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.ownerPhone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")) ||
          p.ownerName.toLowerCase().includes(q) ||
          (p.microchip && p.microchip.toLowerCase().includes(q)) ||
          (p.breed && p.breed.toLowerCase().includes(q))
        );
      })
    : patients.slice(0, 6);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectPatient(filtered[selectedIndex]);
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 sm:pt-24 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isVi
                ? "Tìm theo tên thú cưng, số điện thoại chủ, mã vi mạch... (Cmd+K)"
                : "Search pet name, owner phone, or microchip... (Cmd+K)"
            }
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              {isVi ? "Xóa" : "Clear"}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenScanner();
            }}
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted transition shrink-0 cursor-pointer"
          >
            {isVi ? "Quét QR" : "Scan QR"}
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <p>{isVi ? "Không tìm thấy thú cưng phù hợp." : "No matching pets found."}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {isVi ? "Quét mã QR để nhập hồ sơ mới" : "Scan QR to import new pet"}
              </button>
            </div>
          ) : (
            filtered.map((pet, idx) => (
              <div
                key={pet.id}
                onClick={() => {
                  onSelectPatient(pet);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between rounded-xl p-3 text-xs sm:text-sm cursor-pointer transition ${
                  selectedIndex === idx ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-secondary font-bold font-display text-sm text-secondary-foreground">
                    {pet.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate text-foreground">{pet.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({pet.species === "dog" ? (isVi ? "Chó" : "Dog") : (isVi ? "Mèo" : "Cat")})
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          pet.rabiesValid
                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {pet.rabiesValid ? (isVi ? "Dại: Hợp lệ" : "Rabies OK") : (isVi ? "Hết hạn dại" : "Rabies due")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {isVi ? "Chủ nuôi" : "Owner"}: {pet.ownerName} · {pet.ownerPhone}
                      {pet.microchip ? ` · Chip: ${pet.microchip}` : ""}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-medium text-muted-foreground shrink-0 pl-2">
                  {isVi ? "Mở hồ sơ" : "Open"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground bg-muted/30">
          <span>{isVi ? "Phím mũi tên để chọn, Enter để mở" : "Arrows to navigate, Enter to select"}</span>
          <span className="font-mono">{isVi ? "ESC để đóng" : "ESC to close"}</span>
        </div>
      </div>
    </div>
  );
}
