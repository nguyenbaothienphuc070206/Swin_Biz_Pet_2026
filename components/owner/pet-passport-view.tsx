"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  Syringe,
  FileText,
  AlertTriangle,
  QrCode,
  Plus,
  CheckCircle2,
  Clock,
  Heart,
  CalendarCheck,
  Share2,
  X,
  Maximize2,
  Lock,
  Sparkles,
  Users,
  UploadCloud,
  ImageIcon,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Trash2,
} from "lucide-react";
import { AddPetForm } from "./add-pet-form";
import { BackButton } from "@/components/ui/back-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { localizePetRecord, localizeWeightNote } from "@/modules/i18n/localize-data";
import { useOwnerPlan } from "@/lib/hooks/use-owner-plan";
import { PetShareModal } from "@/components/passport/pet-share-modal";

export interface PetRecord {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed?: string;
  gender?: "male" | "female" | "neutered";
  birthDate?: string;
  weightKg?: number;
  microchip?: string;
  medicalHistory?: string;
  allergies?: string[];
  conditions?: string[];
  vaccinations: {
    name: string;
    date: string;
    nextDue: string;
    lot: string;
    clinic: string;
    status: "completed" | "due_soon" | "overdue";
  }[];
}

export interface WeightLogEntry {
  id: string;
  date: string;
  weightKg: number;
  note?: string;
  createdAt?: number;
}

function getLocalizedDefaultPets(_locale: string): PetRecord[] {
  return [];
}

export function PetPassportView({ locale }: { locale: string }) {
  const tOwner = useTranslations("owner");
  const tP = useTranslations("ownerPassport");

  const [pets, setPets] = useState<PetRecord[]>(() => getLocalizedDefaultPets(locale));
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [showCreatedBanner, setShowCreatedBanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewPetPhoto, setPreviewPetPhoto] = useState<PetRecord | null>(null);
  const { isFree, isPremium } = useOwnerPlan();
  const [showPetLimitModal, setShowPetLimitModal] = useState(false);

  // Weight tracking state
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newLogWeight, setNewLogWeight] = useState("");
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newLogNote, setNewLogNote] = useState("");

  const loadPets = useCallback(() => {
    let list = getLocalizedDefaultPets(locale);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-user-pets");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: PetRecord[] = parsed.map((p: any) => ({
              id: p.id || `pet-${Math.random()}`,
              name: p.name,
              species: p.species || "dog",
              breed: p.breed,
              gender: p.gender,
              birthDate: p.birthDate,
              weightKg: p.weightKg,
              microchip: p.microchip,
              medicalHistory: p.medicalHistory,
              allergies: p.allergies || [],
              conditions: p.conditions || (p.medicalHistory ? [p.medicalHistory] : []),
              vaccinations: Array.isArray(p.vaccinations) ? p.vaccinations : [],
            }));
            list = [...mapped, ...list];
          }
        }
      } catch {}

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("created") === "1") {
        setShowCreatedBanner(true);
      }
      const targetPetId =
        urlParams.get("petId") ||
        (typeof window !== "undefined"
          ? localStorage.getItem("pawcare_active_pet_id")
          : null);
      if (targetPetId && list.some((p) => p.id === targetPetId)) {
        setSelectedPetId(targetPetId);
      } else if (list.length > 0) {
        setSelectedPetId(list[0].id);
      }
      list = list.map((p) => localizePetRecord(p, locale === "en"));
    }
    setPets(list);
  }, [locale]);

  useEffect(() => {
    loadPets();

    const handlePetsUpdated = () => {
      loadPets();
    };
    window.addEventListener("pawcare-pets-updated", handlePetsUpdated);
    return () => window.removeEventListener("pawcare-pets-updated", handlePetsUpdated);
  }, [loadPets]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
        setShowShareModal(false);
        setPreviewPetPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentPet = pets.find((p) => p.id === selectedPetId) ?? pets[0];

  // Weight tracking persistence & initialization for currentPet
  useEffect(() => {
    if (!currentPet?.id) return;
    try {
      const stored = localStorage.getItem(`pawcare-weight-history-${currentPet.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored records were the old 4 dummy records with fabricated decreases, reset to initial baseline
          const isOldDummySet =
            parsed.length === 4 &&
            parsed.some((p: any) => p.note === "Khởi tạo hồ sơ" || p.note === "Initial health profile") &&
            parsed.some((p: any) => p.note === "Recent routine check" || p.note === "Khám định kỳ gần nhất");
          if (!isOldDummySet) {
            setWeightLogs(
              parsed.map((item: WeightLogEntry) => ({
                ...item,
                note: item.note ? localizeWeightNote(item.note, locale === "en") : item.note,
              }))
            );
            return;
          }
        }
      }
      // For newly created pet profiles, default the initial weight mark to the user-entered weight!
      const initialWeight = currentPet.weightKg || (currentPet.species === "cat" ? 4.0 : 8.5);
      const initialLog: WeightLogEntry[] = [
        {
          id: `w-init-${currentPet.id}`,
          date: new Date().toISOString().split("T")[0],
          weightKg: initialWeight,
          note: locale === "en" ? "Initial weight at registration" : "Cân nặng ban đầu khi tạo hồ sơ",
          createdAt: 1,
        },
      ];
      setWeightLogs(initialLog);
      localStorage.setItem(`pawcare-weight-history-${currentPet.id}`, JSON.stringify(initialLog));
    } catch {
      setWeightLogs([]);
    }
  }, [currentPet?.id, currentPet?.weightKg, locale]);

  const handleSaveWeightLog = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newLogWeight);
    if (isNaN(val) || val <= 0 || !currentPet) return;

    const newEntry: WeightLogEntry = {
      id: `w-${Date.now()}`,
      date: newLogDate || new Date().toISOString().split("T")[0],
      weightKg: Math.round(val * 10) / 10,
      note: newLogNote.trim() || undefined,
      createdAt: Date.now(),
    };

    const updated = [newEntry, ...weightLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setWeightLogs(updated);

    try {
      localStorage.setItem(`pawcare-weight-history-${currentPet.id}`, JSON.stringify(updated));

      // Also update current pet's weightKg if this is the newest entry
      if (updated[0].id === newEntry.id) {
        const storedPets = localStorage.getItem("pawcare-user-pets");
        if (storedPets) {
          const parsed = JSON.parse(storedPets);
          if (Array.isArray(parsed)) {
            const updatedPets = parsed.map((p: any) =>
              p.id === currentPet.id ? { ...p, weightKg: newEntry.weightKg } : p
            );
            localStorage.setItem("pawcare-user-pets", JSON.stringify(updatedPets));
            window.dispatchEvent(new Event("pawcare-pets-updated"));
          }
        }
        setPets((prev) =>
          prev.map((p) => (p.id === currentPet.id ? { ...p, weightKg: newEntry.weightKg } : p))
        );
      }
    } catch {}

    setShowAddWeightModal(false);
    setNewLogWeight("");
    setNewLogNote("");
    setNewLogDate(new Date().toISOString().split("T")[0]);
  };

  const handleDeleteWeightLog = (id: string) => {
    if (!currentPet) return;
    const updated = weightLogs.filter((w) => w.id !== id);
    setWeightLogs(updated);
    try {
      localStorage.setItem(`pawcare-weight-history-${currentPet.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Sorted chronologically (oldest to newest) for chart: Initial registration point always first
  const sortedChronological = [...weightLogs].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const createdA = a.createdAt ?? (a.id.includes("init") ? 1 : 2);
    const createdB = b.createdAt ?? (b.id.includes("init") ? 1 : 2);
    if (createdA !== createdB) return createdA - createdB;
    return a.id.localeCompare(b.id);
  });

  const latestWeight = weightLogs[0]?.weightKg ?? currentPet?.weightKg ?? 0;
  const prevWeight = weightLogs[1]?.weightKg ?? latestWeight;
  const weightDiff = +(latestWeight - prevWeight).toFixed(1);

  // Body condition score evaluation
  const isCat = currentPet?.species === "cat";
  const bodyCondition = isCat
    ? latestWeight < 3.2
      ? {
          label: locale === "en" ? "Underweight (BCS 3/9)" : "Hơi gầy (BCS 3/9)",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/25",
        }
      : latestWeight <= 5.2
      ? {
          label: locale === "en" ? "Ideal Weight (BCS 5/9)" : "Thể trạng lý tưởng (BCS 5/9)",
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/25",
        }
      : {
          label: locale === "en" ? "Slightly Overweight (BCS 6/9)" : "Thừa cân nhẹ (BCS 6/9)",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/25",
        }
    : latestWeight < 5.0
    ? {
        label: locale === "en" ? "Small Canine Body" : "Thể trạng chó nhỏ",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/25",
      }
    : {
        label: locale === "en" ? "Ideal Condition (BCS 5/9)" : "Thể trạng lý tưởng (BCS 5/9)",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/25",
      };

  // SVG points computation: starts with a point as the initial weight, then lines as weight goes up or down
  let svgLinePoints = "";
  let svgAreaPoints = "";
  const chartDots: {
    x: number;
    y: number;
    val: number;
    date: string;
    diffFromPrev?: number;
    isInitial: boolean;
  }[] = [];

  if (sortedChronological.length >= 2) {
    const weights = sortedChronological.map((w) => w.weightKg);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const delta = maxW - minW;
    const padding = delta === 0 ? 0.6 : Math.max(0.4, delta * 0.25);
    const yMin = minW - padding;
    const yMax = maxW + padding;
    const yRange = Math.max(0.6, yMax - yMin);

    const count = sortedChronological.length;
    const xStart = 50;
    const xEnd = 455;
    sortedChronological.forEach((entry, idx) => {
      const x = Math.round(xStart + (idx / (count - 1)) * (xEnd - xStart));
      const norm = (entry.weightKg - yMin) / yRange;
      const y = Math.round(92 - norm * 67);
      const prev = idx > 0 ? sortedChronological[idx - 1].weightKg : undefined;
      const diffFromPrev = prev !== undefined ? +(entry.weightKg - prev).toFixed(1) : undefined;
      chartDots.push({
        x,
        y,
        val: entry.weightKg,
        date: entry.date,
        diffFromPrev,
        isInitial: idx === 0,
      });
    });

    svgLinePoints = chartDots.map((d) => `${d.x},${d.y}`).join(" ");
    const firstX = chartDots[0].x;
    const lastX = chartDots[chartDots.length - 1].x;
    svgAreaPoints = `${firstX},115 ${svgLinePoints} ${lastX},115`;
  } else if (sortedChronological.length === 1) {
    const single = sortedChronological[0];
    const x = 55; // Initial point on the far left of the timeline
    const y = 60; // Centered vertically
    chartDots.push({
      x,
      y,
      val: single.weightKg,
      date: single.date,
      isInitial: true,
    });
    // Starts strictly as a single point with no solid line or filled area until new weigh-ins are added
    svgLinePoints = "";
    svgAreaPoints = "";
  }

  const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return "";
    const birth = new Date(birthDateString);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 12) {
      return tP("ageMonths", { count: totalMonths });
    }
    const remMonths = totalMonths % 12;
    if (remMonths > 0) {
      return tP("ageYears", {
        years: Math.floor(totalMonths / 12),
        months: `${remMonths}${locale === "en" ? "m" : "th"}`,
      });
    }
    return tP("ageYearsOnly", { years: Math.floor(totalMonths / 12) });
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Exit / Back button */}
      <div className="flex items-center justify-between">
        <BackButton
          fallbackHref={`/${locale}/owner`}
          label={locale === "en" ? "Pet Information" : "Thông tin thú cưng"}
          variant="pill"
        />
        {previewPetPhoto && (
          <button
            type="button"
            onClick={() => setPreviewPetPhoto(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition cursor-pointer"
          >
            <X className="size-3.5" />
            <span>{locale === "en" ? "Exit photo preview" : "Thoát xem ảnh"}</span>
          </button>
        )}
      </div>

      {/* Newly Created Pet Health Profile Success Banner */}
      {showCreatedBanner && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/20 p-4 text-emerald-950 dark:text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-xs sm:text-sm font-bold">
                {locale === "en"
                  ? `🎉 Health profile for ${currentPet?.name || "your pet"} has been established successfully!`
                  : `🎉 Hồ sơ sức khỏe của bé ${currentPet?.name || "thú cưng"} đã được thiết lập thành công!`}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                {locale === "en"
                  ? "Digital medical passport, microchip ID, and vaccine records are now securely stored here in the health overview."
                  : "Sổ y bạ điện tử, mã số vi mạch và lịch tiêm chủng đã được lưu trữ an toàn tại trang tổng quan này."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatedBanner(false)}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <ShieldCheck className="size-3.5 shrink-0" />
              {tP("badge")}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {tOwner("myPets")} &amp; {tP("title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {tP("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isFree && pets.length >= 1 ? (
            <button
              type="button"
              onClick={() => setShowPetLimitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer sm:text-sm"
            >
              <Lock className="size-4 shrink-0 text-amber-600" />
              <span>{locale === "en" ? "Add Pet (Premium)" : "Thêm thú cưng (Gói Premium)"}</span>
            </button>
          ) : (
            <Link
              href={`/${locale}/pet-health-setup`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 sm:text-sm"
            >
              <Plus className="size-4 shrink-0" />
              <span>{locale === "en" ? "Add Pet Profile" : "Thêm thú cưng"}</span>
            </Link>
          )}
        </div>
      </div>

      {pets.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto border-dashed border-border bg-card">
          <div className="grid size-16 place-items-center rounded-3xl bg-primary/10 mx-auto shadow-inner">
            <Heart className="size-8 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold">
              {locale === "en" ? "No pets in passport yet" : "Chưa có thú cưng trong sổ y bạ"}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              {locale === "en"
                ? "Add your companion to create their cloud medical passport, track vaccinations, and log health records."
                : "Thêm thú cưng của bạn để bắt đầu tạo sổ y bạ đám mây, theo dõi lịch tiêm vắc-xin và cấp phát mã định danh y tế."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/pet-health-setup`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 cursor-pointer"
            >
              <Plus className="size-4 shrink-0" />
              <span>{locale === "en" ? "Set up Pet Profile" : "Thiết lập hồ sơ thú cưng"}</span>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Pet Selector Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
        {pets.map((pet) => {
          const isSelected = pet.id === (currentPet?.id ?? selectedPetId);
          return (
            <button
              key={pet.id}
              onClick={() => {
                setSelectedPetId(pet.id);
                try {
                  localStorage.setItem("pawcare_active_pet_id", pet.id);
                } catch {}
              }}
              className={`flex shrink-0 items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
                {pet.species === "cat" ? "🐱" : pet.species === "dog" ? "🐶" : "🐾"}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{pet.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {pet.breed ?? (pet.species === "cat" ? tOwner("cat") : tOwner("dog"))}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Pet Detail Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main Section: Health Timeline & Vax Passport */}
        <div className="space-y-6">
          {/* Pet Basic Information Card */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setPreviewPetPhoto(currentPet)}
                  className="group relative grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl shadow-inner transition hover:ring-2 hover:ring-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                  title={locale === "en" ? "Click to view photo & details" : "Bấm để xem ảnh & thông tin chi tiết"}
                  aria-label={locale === "en" ? "View enlarged pet photo" : "Xem ảnh phóng to"}
                >
                  <span>
                    {currentPet.species === "cat"
                      ? "🐱"
                      : currentPet.species === "dog"
                      ? "🐶"
                      : "🐾"}
                  </span>
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-xs group-hover:scale-110 transition">
                    <Maximize2 className="size-3" />
                  </span>
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold truncate">{currentPet.name}</h2>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {tP("microchipBadge")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPet.breed}
                    {currentPet.gender && (
                      <span>
                        {" "}·{" "}
                        {currentPet.gender === "male"
                          ? locale === "en"
                            ? "Male"
                            : "Đực"
                          : currentPet.gender === "female"
                          ? locale === "en"
                            ? "Female"
                            : "Cái"
                          : locale === "en"
                          ? "Neutered"
                          : "Đã triệt sản"}
                      </span>
                    )}
                    {currentPet.birthDate && (
                      <span>
                        {" "}· {locale === "en" ? "Born: " : "Ngày sinh: "}
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          new Date(currentPet.birthDate)
                        )}
                      </span>
                    )}
                    {currentPet.weightKg ? (
                      <span>
                        {" "}· <strong>{currentPet.weightKg} kg</strong>
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`/api/passport/${encodeURIComponent(currentPet.id)}/export?locale=${locale}&snapshot=${encodeURIComponent(
                    JSON.stringify(currentPet)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-accent"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span>{tP("exportPdf")}</span>
                </a>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary px-3.5 py-2 text-xs font-bold transition hover:bg-primary/20"
                >
                  <QrCode className="size-4 text-primary" />
                  <span>{tP("shareWithDoctor")}</span>
                </button>
              </div>
            </div>

            {/* Quick Badges */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{tP("birthDate")}</p>
                <p className="mt-1 font-semibold text-sm truncate">
                  {currentPet.birthDate
                    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(currentPet.birthDate)
                      )
                    : tP("unknown")}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{tP("weight")}</p>
                <p className="mt-1 font-semibold text-sm truncate">{currentPet.weightKg} kg</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{tP("microchip")}</p>
                <p className="mt-1 font-mono text-xs font-bold text-primary truncate">
                  {currentPet.microchip ?? tP("notChipped")}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{tP("vaxStatus")}</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>{tP("vaxUpToDate")}</span>
                </p>
              </div>
            </div>

            {/* Medical Alerts (Allergies / Special Conditions) */}
            {(currentPet.allergies?.length || currentPet.conditions?.length) && (
              <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {tP("medicalAlert")}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                  {currentPet.allergies?.map((allergy) => (
                    <span
                      key={allergy}
                      className="rounded-lg bg-destructive/10 px-2.5 py-1 font-semibold text-destructive"
                    >
                      {tP("allergyLabel")}: {allergy}
                    </span>
                  ))}
                  {currentPet.conditions?.map((cond) => (
                    <span
                      key={cond}
                      className="rounded-lg bg-warning/20 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-300"
                    >
                      {tP("conditionLabel")}: {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medical History & Health Background */}
            {currentPet.medicalHistory && (
              <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <FileText className="size-3.5 text-primary" />
                  <span>{locale === "en" ? "Medical History & Health Background:" : "Tiền sử bệnh án & Sức khỏe:"}</span>
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {currentPet.medicalHistory}
                </p>
              </div>
            )}
          </Card>

          {/* ========================================================================= */}
          {/* THEO DÕI CÂN NẶNG & THỂ TRẠNG (WEIGHT TRACKING & BODY CONDITION)           */}
          {/* ========================================================================= */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <Scale className="size-5 text-primary shrink-0" />
                  <span>{locale === "en" ? "Weight Tracking & Growth" : "Theo Dõi Cân Nặng & Thể Trạng"}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === "en"
                    ? "Monitor weight changes over time, body condition score, and historical logs"
                    : "Biểu đồ biến động thể trọng, đánh giá thể trạng chuẩn y khoa và lịch sử cân"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddWeightModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90 transition cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus className="size-3.5" />
                <span>{locale === "en" ? "Log Weight" : "Ghi cân nặng mới"}</span>
              </button>
            </div>

            {/* Quick KPI stats row */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {locale === "en" ? "Current Weight" : "Cân nặng hiện tại"}
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-foreground">
                    {latestWeight}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">kg</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {locale === "en" ? "Weight Trend" : "Biến động gần nhất"}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  {weightLogs.length <= 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <Sparkles className="size-3.5 shrink-0" />
                      {locale === "en" ? "Initial baseline" : "Mốc ban đầu"}
                    </span>
                  ) : weightDiff > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-4 shrink-0" />
                      +{weightDiff} kg
                    </span>
                  ) : weightDiff < 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                      <TrendingDown className="size-4 shrink-0" />
                      {weightDiff} kg
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground">
                      <Minus className="size-4 shrink-0" />
                      0.0 kg ({locale === "en" ? "Stable" : "Ổn định"})
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 col-span-2">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {locale === "en" ? "Body Condition Score (BCS)" : "Đánh giá thể trạng"}
                </span>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${bodyCondition.bg} ${bodyCondition.color}`}>
                    <Activity className="size-3.5 shrink-0" />
                    <span>{bodyCondition.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Trend Chart */}
            {sortedChronological.length >= 1 && (
              <div className="mt-5 rounded-2xl border border-border/70 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold flex items-center gap-1 text-foreground">
                    <TrendingUp className="size-3.5 text-primary shrink-0" />
                    <span>{locale === "en" ? "Weight Progression Curve" : "Đồ thị tiến trình cân nặng"}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-primary rounded-full bg-primary/10 px-2.5 py-0.5">
                    {sortedChronological.length === 1
                      ? (locale === "en" ? "Initial Baseline (1 point)" : "Mốc ban đầu khi tạo hồ sơ")
                      : `${sortedChronological.length} ${locale === "en" ? "data points" : "lần cân"}`}
                  </span>
                </div>

                <div className="pt-2">
                  <svg
                    viewBox="0 0 500 125"
                    className="w-full h-32 overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Reference horizontal gridlines */}
                    <line x1="20" y1="25" x2="480" y2="25" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                    <line x1="20" y1="60" x2="480" y2="60" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 4" />
                    <line x1="20" y1="95" x2="480" y2="95" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />

                    {/* When only 1 initial point: subtle guide timeline to the right */}
                    {sortedChronological.length === 1 && (
                      <g>
                        <line
                          x1="55"
                          y1="60"
                          x2="465"
                          y2="60"
                          stroke="var(--primary)"
                          strokeOpacity="0.25"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="260"
                          y="52"
                          textAnchor="middle"
                          className="fill-muted-foreground text-[10px] font-medium select-none"
                        >
                          {locale === "en"
                            ? "Log new weigh-ins to plot growth curve →"
                            : "Ghi thêm cân nặng để vẽ đường tăng trưởng →"}
                        </text>
                      </g>
                    )}

                    {/* Area fill (only when 2+ points making a line) */}
                    {Boolean(svgAreaPoints) && (
                      <polygon
                        points={svgAreaPoints}
                        fill="url(#weightAreaGrad)"
                      />
                    )}

                    {/* Line curve connecting points as weight goes up or down */}
                    {Boolean(svgLinePoints) && (
                      <polyline
                        points={svgLinePoints}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {chartDots.map((d, i) => {
                      const isLatest = i === chartDots.length - 1 && chartDots.length > 1;
                      const hasDelta = d.diffFromPrev !== undefined;

                      return (
                        <g key={i}>
                          {/* Pulse halo on single initial point or on latest weigh-in */}
                          {((d.isInitial && chartDots.length === 1) || isLatest) && (
                            <circle
                              cx={d.x}
                              cy={d.y}
                              r="12"
                              className="fill-primary/20 animate-pulse pointer-events-none"
                            />
                          )}

                          {/* Outer point circle */}
                          <circle
                            cx={d.x}
                            cy={d.y}
                            r={d.isInitial && chartDots.length === 1 ? "6" : isLatest ? "5.5" : "4.5"}
                            className="fill-background stroke-primary stroke-[2.5]"
                          />

                          {/* Weight value above point */}
                          <text
                            x={d.x}
                            y={d.y - 10}
                            textAnchor={chartDots.length === 1 ? "start" : i === 0 ? "start" : i === chartDots.length - 1 ? "end" : "middle"}
                            className="fill-foreground text-[11px] font-extrabold select-none"
                          >
                            {d.val} kg
                          </text>

                          {/* Up/Down delta badge if changed from previous */}
                          {hasDelta && d.diffFromPrev !== 0 && (
                            <text
                              x={d.x}
                              y={d.y - 22}
                              textAnchor={i === chartDots.length - 1 ? "end" : "middle"}
                              className={`text-[9px] font-bold select-none ${
                                (d.diffFromPrev ?? 0) > 0
                                  ? "fill-emerald-600 dark:fill-emerald-400"
                                  : "fill-amber-600 dark:fill-amber-400"
                              }`}
                            >
                              {(d.diffFromPrev ?? 0) > 0 ? `▲ +${d.diffFromPrev}` : `▼ ${d.diffFromPrev}`}
                            </text>
                          )}

                          {/* Sub-label under point */}
                          {d.isInitial ? (
                            <text
                              x={d.x}
                              y={d.y + 18}
                              textAnchor={chartDots.length === 1 ? "start" : "middle"}
                              className="fill-primary text-[10px] font-bold select-none"
                            >
                              {locale === "en" ? "Initial" : "Ban đầu"}
                            </text>
                          ) : (
                            <text
                              x={d.x}
                              y={118}
                              textAnchor="middle"
                              className="fill-muted-foreground text-[9px] font-medium select-none"
                            >
                              {d.date.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}

            {/* Historical Logs List */}
            <div className="mt-5 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                {locale === "en" ? "Recent Weigh-in Logs" : "Nhật ký các lần cân gần nhất"}
              </span>

              <div className="space-y-2">
                {weightLogs.map((entry, idx) => {
                  const prev = weightLogs[idx + 1]?.weightKg;
                  const diff = prev ? +(entry.weightKg - prev).toFixed(1) : 0;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3 text-xs transition hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                          <Scale className="size-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">
                              {entry.weightKg} kg
                            </span>
                            {idx === weightLogs.length - 1 ? (
                              <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5 bg-primary/10 text-primary">
                                {locale === "en" ? "Initial baseline" : "Mốc ban đầu"}
                              </span>
                            ) : prev ? (
                              <span
                                className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${
                                  diff > 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : diff < 0
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff} kg
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {entry.note || (locale === "en" ? "Recorded entry" : "Ghi nhận")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {entry.date}
                        </span>
                        {weightLogs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWeightLog(entry.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer"
                            title={locale === "en" ? "Delete entry" : "Xóa dòng này"}
                          >
                            <Trash2 className="size-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Vaccination Schedule & Records */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <Syringe className="size-5 text-primary shrink-0" />
                  {tP("vaxScheduleTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tP("vaxScheduleSubtitle")}
                </p>
              </div>
              <Link
                href={`/${locale}/owner/appointments`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
              >
                <span>{tP("bookBooster")}</span>
                <span>→</span>
              </Link>
            </div>

            <div className="mt-5 space-y-3.5">
              {currentPet.vaccinations.map((vax, idx) => {
                const isDueSoon = vax.status === "due_soon";
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{vax.name}</span>
                        {isDueSoon ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <Clock className="size-3" /> {tP("dueSoon")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> {tP("completed")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tP("lot")}: <code className="font-mono">{vax.lot}</code> · {vax.clinic}
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs shrink-0">
                      <p className="text-muted-foreground">{tP("vaxDate")}: {vax.date}</p>
                      <p className="font-semibold text-primary">{tP("nextDue")}: {vax.nextDue}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* LAB & IMAGE STORAGE (Free: Locked preview · Premium: Unlocked with records) */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <FileText className="size-5 text-primary shrink-0" />
                  <span>{locale === "en" ? "Lab Test Records & Diagnostic Imaging" : "Lưu trữ xét nghiệm & Chẩn đoán hình ảnh"}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === "en"
                    ? "Blood work (CBC), biochemistry, ultrasound scans, and digital X-rays"
                    : "Xét nghiệm máu, sinh hóa, kết quả siêu âm ổ bụng và phim chụp X-quang kỹ thuật số"}
                </p>
              </div>

              {isPremium && (
                <button
                  type="button"
                  onClick={() => alert(locale === "en" ? "Upload lab result / DICOM image feature ready!" : "Đã mở cổng tải tệp kết quả xét nghiệm / ảnh X-quang!")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:opacity-90 transition cursor-pointer shrink-0"
                >
                  <UploadCloud className="size-3.5" />
                  <span>{locale === "en" ? "Upload Record" : "Tải lên kết quả"}</span>
                </button>
              )}
            </div>

            {isFree ? (
              <div className="mt-5 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto">
                  <Lock className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {locale === "en"
                      ? "Lab & Image Storage is a Premium Feature"
                      : "Lưu trữ xét nghiệm & hình ảnh dành riêng cho gói Premium"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {locale === "en"
                      ? "Free tier includes current vaccines and prescriptions. Upgrade to Premium (89k/mo) to store unlimited diagnostic scans, blood tests, and medical records."
                      : "Gói Miễn phí lưu trữ vắc-xin và đơn thuốc hiện tại. Nâng cấp Premium (89k/tháng) để lưu trữ không giới hạn kết quả xét nghiệm, siêu âm và phim chụp X-quang."}
                  </p>
                </div>
                <Link
                  href={`/${locale}/owner/billing`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition"
                >
                  <Sparkles className="size-3.5" />
                  <span>{locale === "en" ? "Unlock with Premium (89k/mo)" : "Mở khóa với gói Premium (89k/tháng)"}</span>
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-foreground">
                        {locale === "en" ? "Complete Blood Count (CBC) Panel" : "Xét nghiệm tổng phân tích tế bào máu (CBC)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        15/10/2026 · {locale === "en" ? "PetCare District 1 Hospital" : "Bệnh viện Thú Y PetCare Q.1"} · <span className="text-emerald-600 font-semibold">{locale === "en" ? "Normal parameters" : "Chỉ số bình thường"}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                    {locale === "en" ? "View PDF" : "Xem PDF"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <ImageIcon className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-foreground">
                        {locale === "en" ? "Abdominal Ultrasound & Digital Thorax X-Ray" : "Siêu âm ổ bụng & X-quang lồng ngực kỹ thuật số"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        02/09/2026 · {locale === "en" ? "Dr. Nguyen Van Cuong (DVM)" : "BS. Nguyễn Văn Cường"} · <span className="text-emerald-600 font-semibold">{locale === "en" ? "Clear" : "Tốt, không tổn thương"}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                    {locale === "en" ? "View Image" : "Xem ảnh"}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* FAMILY SHARING (Free: Locked preview · Premium: Unlocked with member management) */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <Users className="size-5 text-primary shrink-0" />
                  <span>{locale === "en" ? "Family Sharing" : "Chia sẻ hồ sơ gia đình"}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {locale === "en"
                    ? "Sync pet health passport with your household members"
                    : "Đồng bộ sổ y bạ của bé cho các thành viên trong gia đình cùng theo dõi"}
                </p>
              </div>
            </div>

            {isFree ? (
              <div className="mt-5 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto">
                  <Lock className="size-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {locale === "en" ? "Family Sharing is a Premium Feature" : "Chia sẻ gia đình dành riêng cho gói Premium"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {locale === "en"
                      ? "Upgrade to Premium to invite co-owners and family members to view and update your pet's passport together."
                      : "Nâng cấp Premium để mời người thân, vợ/chồng hoặc người cùng chăm sóc cùng xem và cập nhật lịch sức khỏe của bé."}
                  </p>
                </div>
                <Link
                  href={`/${locale}/owner/billing`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition"
                >
                  <Sparkles className="size-3.5" />
                  <span>{locale === "en" ? "Activate Family Sharing with Premium" : "Kích hoạt chia sẻ gia đình với Premium"}</span>
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 font-bold text-xs">
                        {currentPet.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">chunoitruong@gmail.com</p>
                        <p className="text-[10px] text-muted-foreground">{locale === "en" ? "Primary Owner · Full access" : "Chủ nuôi chính · Toàn quyền quản trị"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5">
                      {locale === "en" ? "Active" : "Đã kết nối"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        FM
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">nguoithan.pawcare@gmail.com</p>
                        <p className="text-[10px] text-muted-foreground">{locale === "en" ? "Family Member · View & log care" : "Thành viên gia đình · Theo dõi & ghi chép"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5">
                      {locale === "en" ? "Invited" : "Đã đồng bộ"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <input
                    type="email"
                    placeholder={locale === "en" ? "Enter family member email..." : "Nhập email người thân..."}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => alert(locale === "en" ? "Family invitation sent!" : "Đã gửi lời mời tham gia quản lý gia đình!")}
                    className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition cursor-pointer shrink-0"
                  >
                    {locale === "en" ? "Invite" : "Mời người thân"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Quick Actions & Sharing QR */}
        <div className="space-y-6">
          {/* Digital Pet Card / Medical Passport Badge */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-card to-secondary/30 p-6 border-primary/30">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-primary">PawCare ID</span>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Vietnam Pet Care
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 border-2 border-primary/25 text-3xl shadow-xs">
                {currentPet.species === "cat"
                  ? "🐱"
                  : currentPet.species === "dog"
                  ? "🐶"
                  : "🐾"}
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-xl font-bold truncate">{currentPet.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{currentPet.breed}</p>
                <p className="font-mono text-xs text-primary font-semibold">{currentPet.id}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border/80 bg-card p-3 text-xs shadow-2xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{tP("ownerLabel")}:</span>
                <span className="font-semibold truncate">{tP("verifiedAccount")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{tP("passportStatus")}:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">{tP("validStatus")}</span>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-95 cursor-pointer"
            >
              <QrCode className="size-4 shrink-0" />
              <span>{tP("generateQr")}</span>
            </button>
          </Card>

          {/* Quick Care Guidelines */}
          <Card className="p-5 hidden lg:block">
            <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <CalendarCheck className="size-4 text-primary shrink-0" />
              {tP("routineCare")}
            </h4>
            <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>{tP("careItem1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>{tP("careItem2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>{tP("careItem3")}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
        </>
      )}

      {/* Modal: Ghi nhận cân nặng mới */}
      {showAddWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Scale className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {locale === "en" ? "Log Pet Weight" : "Ghi nhận cân nặng"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {currentPet?.name} ({currentPet?.breed})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWeightModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWeightLog} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {locale === "en" ? "Weight (kg)" : "Cân nặng (kg)"} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="150"
                    required
                    value={newLogWeight}
                    onChange={(e) => setNewLogWeight(e.target.value)}
                    placeholder="e.g. 4.5"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {locale === "en" ? "Measurement Date" : "Ngày cân"} *
                </label>
                <input
                  type="date"
                  required
                  value={newLogDate}
                  onChange={(e) => setNewLogDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  {locale === "en" ? "Notes (optional)" : "Ghi chú (tùy chọn)"}
                </label>
                <input
                  type="text"
                  value={newLogNote}
                  onChange={(e) => setNewLogNote(e.target.value)}
                  placeholder={
                    locale === "en"
                      ? "e.g. After vet visit, diet change, morning fasting"
                      : "Ví dụ: Sau khám thú y, đổi thức ăn hạt, cân lúc sáng sớm"
                  }
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWeightModal(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  {locale === "en" ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:opacity-95 cursor-pointer"
                >
                  {locale === "en" ? "Save Record" : "Lưu dữ liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      {showShareModal && currentPet && (
        <PetShareModal
          petId={currentPet.id}
          petName={currentPet.name}
          locale={locale}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Pet Limit Upgrade Modal for Free Tier */}
      {showPetLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <Lock className="size-5" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    <Sparkles className="size-3" /> 89.000 ₫/tháng
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {locale === "en" ? "1 Pet Limit Reached" : "Đã đạt giới hạn 1 thú cưng"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPetLimitModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "en"
                ? "The Free Tier supports up to 1 pet profile. Upgrade to PawCare Premium to unlock unlimited pets, lab tests, X-ray imaging storage, and family passport sharing!"
                : "Gói Miễn phí chỉ hỗ trợ tối đa 1 hồ sơ thú cưng. Nâng cấp lên PawCare Premium để quản lý không giới hạn số bé, mở khóa lưu trữ kết quả xét nghiệm, chẩn đoán hình ảnh và chia sẻ y bạ cho gia đình!"}
            </p>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-xs">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                <span>{locale === "en" ? "Exclusive Premium Benefits" : "Đặc quyền gói Premium"}</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{locale === "en" ? "Unlimited pets & full medical records" : "Không giới hạn số lượng thú cưng"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{locale === "en" ? "Store CBC lab results, ultrasound & X-rays" : "Lưu trữ bảng xét nghiệm & chẩn đoán hình ảnh"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{locale === "en" ? "Family Sharing sync for all members" : "Chia sẻ sổ y bạ cho cả gia đình (Family Sharing)"}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Link
                href={`/${locale}/owner/billing`}
                onClick={() => setShowPetLimitModal(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition text-center shadow-md shadow-primary/25 cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>{locale === "en" ? "Upgrade Premium (89k/mo)" : "Nâng cấp Premium (89k/tháng)"}</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowPetLimitModal(false)}
                className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                {locale === "en" ? "Close" : "Để sau"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Photo / Full Profile Lightbox */}
      <ImageLightbox
        isOpen={Boolean(previewPetPhoto)}
        onClose={() => setPreviewPetPhoto(null)}
        title={`${previewPetPhoto?.name} — ${previewPetPhoto?.breed ?? (previewPetPhoto?.species === "cat" ? tOwner("cat") : tOwner("dog"))}`}
        subtitle={previewPetPhoto?.microchip ? `Microchip: ${previewPetPhoto.microchip}` : undefined}
        locale={locale}
      >
        {previewPetPhoto && (
          <div className="flex flex-col items-center text-center p-4 max-w-md w-full">
            <div className="grid size-32 place-items-center rounded-3xl bg-secondary text-6xl shadow-md border border-border">
              {previewPetPhoto.species === "cat" ? "🐱" : "🐶"}
            </div>
            <h4 className="mt-4 font-display text-2xl font-bold text-foreground">
              {previewPetPhoto.name}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {previewPetPhoto.breed}
              {previewPetPhoto.birthDate && (
                <>
                  {" "}· {locale === "en" ? "Born: " : "Ngày sinh: "}
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(previewPetPhoto.birthDate)
                  )}
                </>
              )}
              {" "}· <strong>{previewPetPhoto.weightKg} kg</strong>
            </p>

            <div className="mt-4 w-full rounded-2xl border border-border bg-card p-3.5 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tP("microchip")}:</span>
                <span className="font-mono font-bold text-primary">{previewPetPhoto.microchip ?? tP("notChipped")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tP("vaxStatus")}:</span>
                <span className="font-semibold text-emerald-600">
                  {tP("vaxUpToDate")} ({previewPetPhoto.vaccinations.length}{" "}
                  {locale === "en" ? "doses" : "liều"})
                </span>
              </div>
              {Boolean(previewPetPhoto.allergies?.length) && (
                <div className="flex justify-between text-destructive">
                  <span>{tP("allergyLabel")}:</span>
                  <span className="font-semibold">{previewPetPhoto.allergies?.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </ImageLightbox>
    </div>
  );
}
