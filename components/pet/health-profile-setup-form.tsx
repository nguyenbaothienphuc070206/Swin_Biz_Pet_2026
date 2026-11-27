"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ensureOwnerSessionAction } from "@/app/actions/owner";
import { PortalSyncBridge } from "@/components/shell/portal-sync-bridge";
import {
  PawPrint,
  CheckCircle2,
  AlertCircle,
  Syringe,
  FileText,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  ShieldCheck,
  HeartPulse,
  RotateCcw,
  Check,
  Search,
  Edit3,
} from "lucide-react";
import {
  getBreedsForSpecies,
  filterBreeds,
  BreedItem,
} from "@/modules/domain/pet-breeds";
import {
  validatePetHealthProfile,
  isFoodAllergyTag,
  isDrugAllergyTag,
} from "@/modules/domain/pet-health-validation";
import { formatBirthdate } from "@/modules/i18n/localize-data";

export interface PetHealthProfile {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  gender: "male" | "female" | "neutered";
  age: string;
  birthDate?: string;
  weightKg: number;
  microchip: string;
  medicalHistory: string;
  allergies: string[];
  conditions: string[];
  isVaccinated: boolean;
  vaccinations: {
    name: string;
    date: string;
    nextDue: string;
    lot: string;
    clinic: string;
    status: "completed" | "due_soon" | "overdue";
  }[];
  notes?: string;
  createdAt: string;
}

interface CustomVax {
  id: string;
  name: string;
  date: string;
}

export function HealthProfileSetupForm({
  locale: propLocale,
  redirectTo,
  onCompleted,
  submitLabel,
  onBack,
}: {
  locale?: string;
  redirectTo?: string;
  onCompleted?: (newPet: PetHealthProfile) => void;
  submitLabel?: string;
  onBack?: () => void;
} = {}) {
  const currentLocale = useLocale();
  const locale = propLocale || currentLocale || "vi";
  const t = useTranslations("petHealthSetup");
  const isEn = locale === "en";

  // Form Fields State
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [breed, setBreed] = useState("");
  const [isCustomBreed, setIsCustomBreed] = useState(false);
  const [customBreedInput, setCustomBreedInput] = useState("");
  const [breedSearchQuery, setBreedSearchQuery] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "neutered">("male");
  const [ageYears, setAgeYears] = useState("1");
  const [ageMonths, setAgeMonths] = useState("0");
  const [birthDate, setBirthDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [weight, setWeight] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isVaccinated, setIsVaccinated] = useState<boolean>(true);
  const [selectedVaxes, setSelectedVaxes] = useState<string[]>([]);
  const [vaxDates, setVaxDates] = useState<Record<string, string>>({});
  const [customVaxes, setCustomVaxes] = useState<CustomVax[]>([]);
  const [newVaxName, setNewVaxName] = useState("");
  const [newVaxDate, setNewVaxDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [lastVaxDate, setLastVaxDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [foodAllergyDetails, setFoodAllergyDetails] = useState("");
  const [drugAllergyDetails, setDrugAllergyDetails] = useState("");

  // Validation & Submission State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [savedPet, setSavedPet] = useState<PetHealthProfile | null>(null);

  // Master breed list for current species
  const allSpeciesBreeds = useMemo(() => getBreedsForSpecies(species), [species]);

  // Filtered breeds based on search query
  const filteredBreeds = useMemo(
    () => filterBreeds(allSpeciesBreeds, breedSearchQuery, isEn),
    [allSpeciesBreeds, breedSearchQuery, isEn]
  );

  const handleSelectSpecies = (newSpecies: "dog" | "cat" | "other") => {
    setSpecies(newSpecies);
    setBreed("");
    setIsCustomBreed(false);
    setCustomBreedInput("");
    setBreedSearchQuery("");
    setErrorMsg(null);
  };

  const handleSelectPredefinedBreed = (b: BreedItem) => {
    const breedName = isEn ? b.nameEn : b.nameVi;
    setBreed(breedName);
    setIsCustomBreed(false);
    setCustomBreedInput("");
    setBreedSearchQuery("");
    setErrorMsg(null);
  };

  const handleSelectCustomOther = () => {
    setIsCustomBreed(true);
    setBreed("");
    setBreedSearchQuery("");
    setErrorMsg(null);
  };

  const handleClearBreed = () => {
    setBreed("");
    setIsCustomBreed(false);
    setCustomBreedInput("");
    setBreedSearchQuery("");
  };

  // Quick select medical condition tags
  const quickTags = [
    { id: "healthy", label: t("healthyTag") },
    { id: "food_allergy", label: t("foodAllergyTag") },
    { id: "drug_allergy", label: t("drugAllergyTag") },
    { id: "surgery", label: t("surgeryTag") },
    { id: "chronic", label: t("chronicTag") },
  ];

  const handleToggleTag = (tagLabel: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagLabel)) {
        return prev.filter((item) => item !== tagLabel);
      } else {
        return [...prev, tagLabel];
      }
    });
  };

  const handleToggleVax = (vaxName: string) => {
    setSelectedVaxes((prev) => {
      if (prev.includes(vaxName)) {
        return prev.filter((v) => v !== vaxName);
      } else {
        setVaxDates((dates) => ({
          ...dates,
          [vaxName]: dates[vaxName] || new Date().toISOString().split("T")[0],
        }));
        return [...prev, vaxName];
      }
    });
  };

  const handleAddCustomVax = () => {
    if (!newVaxName.trim()) return;
    const vaxDate = newVaxDate || new Date().toISOString().split("T")[0];
    setCustomVaxes((prev) => [
      ...prev,
      {
        id: `vax-${Date.now()}`,
        name: newVaxName.trim(),
        date: vaxDate,
      },
    ]);
    setNewVaxName("");
    setNewVaxDate(new Date().toISOString().split("T")[0]);
  };

  const handleRemoveCustomVax = (id: string) => {
    setCustomVaxes((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateCustomVaxDate = (id: string, date: string) => {
    setCustomVaxes((prev) =>
      prev.map((cv) => (cv.id === id ? { ...cv, date } : cv))
    );
  };

  const formatAgeString = () => {
    const y = parseInt(ageYears, 10) || 0;
    const m = parseInt(ageMonths, 10) || 0;
    if (y === 0 && m === 0) {
      return isEn ? "Under 1 year" : "Dưới 1 tuổi";
    }
    if (y > 0 && m > 0) {
      return isEn
        ? `${y} year${y > 1 ? "s" : ""} ${m} month${m > 1 ? "s" : ""}`
        : `${y} tuổi ${m} tháng`;
    }
    if (y > 0) {
      return isEn ? `${y} year${y > 1 ? "s" : ""} old` : `${y} tuổi`;
    }
    return isEn ? `${m} month${m > 1 ? "s" : ""} old` : `${m} tháng tuổi`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const effectiveBreed = isCustomBreed ? customBreedInput.trim() : breed.trim();

    // Comprehensive validation for mandatory fields:
    // Name, Breed, Weight (>0), Medical history/Allergies, and Vaccines (>=1)
    const validation = validatePetHealthProfile({
      name,
      breed: effectiveBreed,
      weight,
      selectedTags,
      medicalHistory,
      foodAllergyDetails,
      drugAllergyDetails,
      isVaccinated,
      selectedVaxes,
      customVaxes,
    });

    if (!validation.isValid && validation.errorKey) {
      setErrorMsg(t(validation.errorKey));
      return;
    }

    setIsSubmitting(true);

    try {
      // Collect allergy items with specific details
      const allergiesList: string[] = [];
      const hasFoodAllergy = selectedTags.some(isFoodAllergyTag);
      const hasDrugAllergy = selectedTags.some(isDrugAllergyTag);

      if (hasFoodAllergy) {
        allergiesList.push(
          foodAllergyDetails.trim()
            ? `${t("foodAllergyTag")}: ${foodAllergyDetails.trim()}`
            : t("foodAllergyTag")
        );
      }
      if (hasDrugAllergy) {
        allergiesList.push(
          drugAllergyDetails.trim()
            ? `${t("drugAllergyTag")}: ${drugAllergyDetails.trim()}`
            : t("drugAllergyTag")
        );
      }

      // Other non-allergy selected tags (surgeries, chronic, etc.)
      const otherTags = selectedTags.filter(
        (tg) => !isFoodAllergyTag(tg) && !isDrugAllergyTag(tg)
      );

      // Build final medical history summary
      const notesParts: string[] = [];
      if (otherTags.length > 0) notesParts.push(otherTags.join(", "));
      if (allergiesList.length > 0) notesParts.push(allergiesList.join("; "));
      if (medicalHistory.trim()) notesParts.push(medicalHistory.trim());

      let finalMedicalHistory = notesParts.join(". ");
      if (!finalMedicalHistory) {
        finalMedicalHistory = isEn
          ? "Healthy, no chronic conditions recorded."
          : "Khỏe mạnh, chưa ghi nhận bệnh nền.";
      }

      // Build vaccine items
      const allVaccines = isVaccinated
        ? [
            ...selectedVaxes.map((v) => {
              const itemDate = vaxDates[v] || lastVaxDate || new Date().toISOString().split("T")[0];
              const parsedDate = new Date(itemDate);
              const validTime = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
              const nextDueDate = new Date(validTime + 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

              return {
                name: v,
                date: itemDate,
                nextDue: nextDueDate,
                lot: `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
                clinic: isEn
                  ? "PawCare Partner Veterinary Clinic"
                  : "Phòng khám thú y đối tác PawCare",
                status: "completed" as const,
              };
            }),
            ...customVaxes.map((cv) => {
              const itemDate = cv.date || lastVaxDate || new Date().toISOString().split("T")[0];
              const parsedDate = new Date(itemDate);
              const validTime = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
              const nextDueDate = new Date(validTime + 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

              return {
                name: cv.name,
                date: itemDate,
                nextDue: nextDueDate,
                lot: `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
                clinic: isEn
                  ? "PawCare Partner Veterinary Clinic"
                  : "Phòng khám thú y đối tác PawCare",
                status: "completed" as const,
              };
            }),
          ]
        : [];

      const newPet: PetHealthProfile = {
        id: `pet-${Date.now()}`,
        name: name.trim(),
        species,
        breed: effectiveBreed,
        gender,
        age: birthDate ? formatBirthdate(birthDate, isEn) : formatAgeString(),
        birthDate: birthDate || undefined,
        weightKg: parseFloat(weight) || (species === "cat" ? 4.0 : 8.5),
        microchip: `VN-PC-${Math.floor(100000 + Math.random() * 900000)}`,
        medicalHistory: finalMedicalHistory,
        allergies: allergiesList,
        conditions: otherTags,
        isVaccinated,
        vaccinations: allVaccines,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          const rawExisting = localStorage.getItem("pawcare-user-pets");
          const existingList: PetHealthProfile[] = rawExisting
            ? JSON.parse(rawExisting)
            : [];
          const updatedList = [newPet, ...existingList];
          localStorage.setItem("pawcare-user-pets", JSON.stringify(updatedList));
          localStorage.setItem("pawcare_active_pet_id", newPet.id);

          // Seed the initial weight baseline log with user-entered weight for the chart
          const initialWeight = newPet.weightKg;
          const initialWeightLog = [
            {
              id: `w-${Date.now()}-init`,
              date: new Date().toISOString().split("T")[0],
              weightKg: initialWeight,
              note: isEn ? "Initial weight at registration" : "Cân nặng ban đầu khi tạo hồ sơ",
            },
          ];
          localStorage.setItem(
            `pawcare-weight-history-${newPet.id}`,
            JSON.stringify(initialWeightLog)
          );

          // Dispatch event to inform other active components (e.g., Settings, Passport)
          window.dispatchEvent(
            new CustomEvent("pawcare-pets-updated", { detail: updatedList })
          );
        } catch {
          // localStorage fallback
        }
      }

      // Call completion callback if provided
      if (onCompleted) {
        try {
          onCompleted(newPet);
        } catch {}
      }

      // Automatically redirect to the target page or pet passports page
      setIsRedirecting(true);

      // Ensure owner session is established so /owner is fully authorized
      await ensureOwnerSessionAction((locale as any) || "vi").catch(() => {});

      // Target redirect URL
      const targetUrl =
        redirectTo ||
        `/${locale}/owner/pets?created=1&petId=${encodeURIComponent(newPet.id)}`;
      window.location.assign(targetUrl);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isEn
            ? "An error occurred while saving the profile."
            : "Đã xảy ra lỗi khi lưu thông tin.")
      );
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName("");
    setSpecies("dog");
    setBreed("");
    setIsCustomBreed(false);
    setCustomBreedInput("");
    setBreedSearchQuery("");
    setGender("male");
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    setBirthDate(d.toISOString().split("T")[0]);
    setAgeYears("1");
    setAgeMonths("0");
    setWeight("");
    setMedicalHistory("");
    setSelectedTags([]);
    setFoodAllergyDetails("");
    setDrugAllergyDetails("");
    setIsVaccinated(true);
    setSelectedVaxes([]);
    setCustomVaxes([]);
    setNotes("");
    setSavedPet(null);
    setErrorMsg(null);
  };

  // REDIRECTING TRANSITION STATE
  if (isRedirecting) {
    return (
      <div className="mx-auto max-w-xl text-center py-16 space-y-5 rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
          <CheckCircle2 className="size-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold">
            {isEn ? "Health Profile Established!" : "Hồ Sơ Sức Khỏe Đã Được Kích Hoạt!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Navigating to your Pet Passports..."
              : "Đang chuyển về Sổ y bạ thú cưng của bé..."}
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (savedPet) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-10 text-center space-y-6">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-10" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>{isEn ? "Verified & Active" : "Đã xác thực & Kích hoạt"}</span>
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">
              {t("successTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              {t("successSubtitle")}
            </p>
          </div>

          {/* Pet Passport Card Preview */}
          <div className="rounded-2xl border border-border bg-muted/20 p-5 md:p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3.5">
                <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-3xl shadow-inner">
                  {savedPet.species === "cat"
                    ? "🐱"
                    : savedPet.species === "dog"
                    ? "🐶"
                    : "🐾"}
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    {savedPet.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {savedPet.breed} •{" "}
                    {savedPet.gender === "male"
                      ? t("male")
                      : savedPet.gender === "female"
                      ? t("female")
                      : t("neutered")}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("passportCode")}
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {savedPet.microchip}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <span className="block text-muted-foreground">{t("birthDate")}</span>
                <strong className="block text-foreground mt-0.5">
                  {formatBirthdate(savedPet.birthDate || savedPet.age, isEn)}
                </strong>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <span className="block text-muted-foreground">{t("gender")}</span>
                <strong className="block text-foreground mt-0.5">
                  {savedPet.gender === "male"
                    ? t("male")
                    : savedPet.gender === "female"
                    ? t("female")
                    : t("neutered")}
                </strong>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <span className="block text-muted-foreground">{t("weight")}</span>
                <strong className="block text-foreground mt-0.5">
                  {savedPet.weightKg} kg
                </strong>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <span className="block text-muted-foreground">
                  {t("sectionVaccine")}
                </span>
                <strong className="block text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {savedPet.isVaccinated
                    ? isEn
                      ? `${savedPet.vaccinations.length} vaccines`
                      : `${savedPet.vaccinations.length} mũi tiêm`
                    : isEn
                    ? "Pending"
                    : "Chưa tiêm"}
                </strong>
              </div>
            </div>

            {/* Medical History */}
            <div className="rounded-xl border border-border/60 bg-card p-3.5 text-xs space-y-1">
              <span className="font-semibold text-foreground block flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                <span>{t("medicalHistory")}:</span>
              </span>
              <p className="text-muted-foreground leading-relaxed">
                {savedPet.medicalHistory}
              </p>
            </div>

            {/* Vaccination list preview */}
            {savedPet.isVaccinated && savedPet.vaccinations.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-card p-3.5 text-xs space-y-2">
                <span className="font-semibold text-foreground block flex items-center gap-1.5">
                  <Syringe className="size-3.5 text-primary" />
                  <span>{t("vaxListTitle")}</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {savedPet.vaccinations.map((vx, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 font-bold text-primary text-[11px]"
                    >
                      <Check className="size-3" />
                      {vx.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <Link
              href={`/${locale}/owner/pets`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-95"
            >
              <span>{t("btnViewPassport")}</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href={`/${locale}/settings`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-xs transition hover:bg-muted"
            >
              <span>{t("btnViewSettings")}</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <RotateCcw className="size-3.5" />
              <span>{t("btnCreateAnother")}</span>
            </button>
            <span>•</span>
            <Link
              href={`/${locale}`}
              className="font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {t("btnBackHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // MAIN FORM SCREEN
  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-8">
      {/* SECTION 1: Basic Pet Info */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <div className="flex items-center gap-2.5 text-primary">
            <PawPrint className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t("sectionBasic")}
            </span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold">
            {t("sectionBasic")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionBasicDesc")}
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/20 p-3.5 text-xs font-semibold text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pet Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="pet-name"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            {t("petName")} <span className="text-destructive">*</span>
          </label>
          <input
            id="pet-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("petNamePlaceholder")}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Species Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("species")} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: "dog", label: t("dog"), icon: "🐶" },
              { id: "cat", label: t("cat"), icon: "🐱" },
              { id: "other", label: t("other"), icon: "🐾" },
            ].map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => handleSelectSpecies(sp.id as any)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3.5 text-xs font-bold transition cursor-pointer ${
                  species === sp.id
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                    : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted/40"
                }`}
              >
                <span className="text-2xl">{sp.icon}</span>
                <span>{sp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Breed Selection Section (Bắt buộc chọn hoặc nhập) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="pet-breed-search"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
            >
              <span>{t("breed")}</span>
              <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              {isEn ? "Select or search breed" : "Chọn hoặc tìm kiếm giống"}
            </span>
          </div>

          {/* Legal Notice for "Other" species in Vietnam */}
          {species === "other" && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:text-emerald-200">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <p className="leading-relaxed font-medium">
                {t("legalNoticeOther")}
              </p>
            </div>
          )}

          {/* Case 1: Predefined Breed is Selected */}
          {!isCustomBreed && breed ? (
            <div className="flex items-center justify-between rounded-2xl border-2 border-primary/50 bg-primary/10 p-4 transition shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xs">
                  ✓
                </span>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {t("selectedBreed")}
                  </span>
                  <strong className="text-sm font-bold text-foreground">
                    {breed}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearBreed}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition shadow-2xs cursor-pointer"
              >
                <Edit3 className="size-3.5 text-primary" />
                <span>{t("changeBreed")}</span>
              </button>
            </div>
          ) : isCustomBreed ? (
            /* Case 2: User Selected "Khác" - Custom Input Field */
            <div className="space-y-2 rounded-2xl border-2 border-primary/50 bg-card p-4 transition shadow-xs">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="custom-breed-input"
                  className="text-xs font-bold text-foreground flex items-center gap-1.5"
                >
                  <Edit3 className="size-3.5 text-primary" />
                  <span>{t("customBreedLabel")}</span>
                  <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleClearBreed}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  {t("changeBreed")}
                </button>
              </div>

              <input
                id="custom-breed-input"
                type="text"
                value={customBreedInput}
                onChange={(e) => setCustomBreedInput(e.target.value)}
                placeholder={t("customBreedPlaceholder")}
                required
                autoFocus
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Enter the specific variety, mixed breed, or domestic pet name."
                  : "Nhập giống lai, dòng thú cưng hoặc tên loài cụ thể bạn đang nuôi."}
              </p>
            </div>
          ) : (
            /* Case 3: Breed Search & Selection Tool */
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
              {/* Search input tool */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
                <input
                  id="pet-breed-search"
                  type="text"
                  value={breedSearchQuery}
                  onChange={(e) => setBreedSearchQuery(e.target.value)}
                  placeholder={
                    species === "dog"
                      ? isEn
                        ? "Search dog breeds (e.g. Corgi, Poodle, Husky)..."
                        : "Tìm kiếm giống chó (VD: Corgi, Poodle, Phú Quốc)..."
                      : species === "cat"
                      ? isEn
                        ? "Search cat breeds (e.g. British Shorthair, Persian)..."
                        : "Tìm kiếm giống mèo (VD: Anh lông ngắn, Tai cụp, Ba Tư)..."
                      : isEn
                      ? "Search legal pet species (e.g. Minilop, Hamster, Budgie)..."
                      : "Tìm kiếm loài/giống hợp pháp (VD: Thỏ Minilop, Hamster, Bọ ú)..."
                  }
                  className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {breedSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBreedSearchQuery("")}
                    className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable Breeds Grid / List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1">
                  <span>
                    {isEn ? "Select from catalog:" : "Chọn giống trong danh sách:"}
                  </span>
                  <span>
                    {filteredBreeds.length} {isEn ? "options" : "lựa chọn"}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scroll-smooth">
                  {/* Matching breeds buttons */}
                  {filteredBreeds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {filteredBreeds.map((b) => {
                        const breedName = isEn ? b.nameEn : b.nameVi;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectPredefinedBreed(b)}
                            className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary transition shadow-2xs cursor-pointer"
                          >
                            <span>{breedName}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      {t("noBreedsFound")}
                    </p>
                  )}

                  {/* Option "Khác (Tự nhập)" button */}
                  <div className="pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={handleSelectCustomOther}
                      className="w-full inline-flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/15 transition cursor-pointer"
                    >
                      <span>{t("otherBreedOption")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("gender")} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: "male", label: t("male") },
              { id: "female", label: t("female") },
              { id: "neutered", label: t("neutered") },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGender(g.id as any)}
                className={`rounded-2xl border py-2.5 px-3 text-xs font-bold text-center transition ${
                  gender === g.id
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Birthdate and Weight */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Birthdate */}
          <div className="space-y-1.5">
            <label
              htmlFor="pet-birthdate"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
            >
              <span className="flex items-center gap-1">
                <span>{t("birthDate")}</span>
                <span className="text-destructive">*</span>
              </span>
              {birthDate && (
                <span className="text-[11px] font-semibold text-primary lowercase">
                  ({formatAgeString()})
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="pet-birthdate"
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                value={birthDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setBirthDate(val);
                  if (val) {
                    const b = new Date(val);
                    const now = new Date();
                    let y = now.getFullYear() - b.getFullYear();
                    let m = now.getMonth() - b.getMonth();
                    if (m < 0) {
                      y--;
                      m += 12;
                    }
                    if (y >= 0) {
                      setAgeYears(String(y));
                      setAgeMonths(String(Math.max(0, m)));
                    }
                  }
                }}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEn ? "Display: " : "Hiển thị y bạ: "}
              <strong className="text-foreground">
                {formatBirthdate(birthDate, isEn)}
              </strong>
            </p>
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <label
              htmlFor="pet-weight"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"
            >
              <span>{t("weight")}</span>
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                id="pet-weight"
                type="number"
                step="0.1"
                min="0.1"
                max="120"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t("weightPlaceholder")}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-10 text-sm font-semibold transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Medical History & Allergies */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <div className="flex items-center gap-2.5 text-accent">
            <HeartPulse className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t("sectionMedical")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="font-display text-xl font-bold">
              {t("sectionMedical")}
            </h2>
            <span className="text-destructive font-bold text-lg">*</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionMedicalDesc")}
          </p>
        </div>

        {/* Quick select tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{t("quickTags")}</span>
            <span className="text-[11px] text-destructive">
              {isEn ? "(Select tags or write notes below)*" : "(Chọn nhãn hoặc ghi mô tả)*"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.label);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.label)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                      : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isSelected && <Check className="size-3" />}
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Allergy Detail Inputs */}
        {selectedTags.some(isFoodAllergyTag) && (
          <div className="space-y-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 animate-in fade-in duration-200">
            <label
              htmlFor="food-allergy-detail"
              className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{t("foodAllergyDetail")}</span>
              <span className="text-destructive">*</span>
            </label>
            <input
              id="food-allergy-detail"
              type="text"
              required
              value={foodAllergyDetails}
              onChange={(e) => setFoodAllergyDetails(e.target.value)}
              placeholder={t("foodAllergyPlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {selectedTags.some(isDrugAllergyTag) && (
          <div className="space-y-1.5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 animate-in fade-in duration-200">
            <label
              htmlFor="drug-allergy-detail"
              className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{t("drugAllergyDetail")}</span>
              <span className="text-destructive">*</span>
            </label>
            <input
              id="drug-allergy-detail"
              type="text"
              required
              value={drugAllergyDetails}
              onChange={(e) => setDrugAllergyDetails(e.target.value)}
              placeholder={t("drugAllergyPlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Detailed Medical History */}
        <div className="space-y-1.5">
          <label
            htmlFor="medical-history"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
          >
            <span>{t("medicalHistory")}</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {selectedTags.length === 0
                ? isEn
                  ? "(If no tags selected above)*"
                  : "(Nếu chưa chọn gợi ý)*"
                : isEn
                ? "(Optional additional details)"
                : "(Ghi chú thêm nếu có)"}
            </span>
          </label>
          <textarea
            id="medical-history"
            rows={3}
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            placeholder={t("medicalHistoryPlaceholder")}
            className="w-full rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* SECTION 3: Vaccination Status */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <div className="flex items-center gap-2.5 text-primary">
            <Syringe className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t("sectionVaccine")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="font-display text-xl font-bold">
              {t("sectionVaccine")}
            </h2>
            <span className="text-destructive font-bold text-lg">*</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sectionVaccineDesc")}
          </p>
        </div>

        {/* Vaccinated Yes / No Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("vaxStatusQuestion")} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsVaccinated(true)}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition cursor-pointer ${
                isVaccinated
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>{t("vaxYes")}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsVaccinated(false)}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition cursor-pointer ${
                !isVaccinated
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <AlertCircle className="size-4" />
              <span>{t("vaxNo")}</span>
            </button>
          </div>
        </div>

        {/* When Vaccinated: List of Core Vaccines */}
        {isVaccinated ? (
          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                <span>{t("vaxListTitle")}</span>
                <span className="text-destructive">*</span>
              </span>
              <span
                className={`text-[11px] font-bold ${
                  selectedVaxes.length + customVaxes.length >= 1
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {isEn
                  ? `${selectedVaxes.length + customVaxes.length} selected (min 1)`
                  : `Đã chọn: ${selectedVaxes.length + customVaxes.length} mũi (tối thiểu 1)`}
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  name: t("vaxRabies"),
                  note: isEn ? "Mandatory annual rabies protection" : "Phòng bệnh Dại bắt buộc hàng năm",
                },
                species === "cat"
                  ? {
                      name: t("vaxCoreCat"),
                      note: isEn ? "Core 4-way feline protection" : "Phòng 4 bệnh cốt lõi ở mèo",
                    }
                  : {
                      name: t("vaxCoreDog"),
                      note: isEn ? "Core multi-agent puppy protection" : "Phòng 5 bệnh / 7 bệnh cốt lõi ở chó",
                    },
                {
                  name: t("vaxDeworm"),
                  note: isEn ? "Quarterly parasite protocol" : "Quy trình sổ giun & phòng rận định kỳ",
                },
              ].map((vaxItem, idx) => {
                const checked = selectedVaxes.includes(vaxItem.name);
                const itemDate = vaxDates[vaxItem.name] || new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 transition ${
                      checked
                        ? "border-primary/50 bg-primary/5 text-foreground shadow-2xs"
                        : "border-border/60 bg-card text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleVax(vaxItem.name)}
                        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-foreground block">
                          {vaxItem.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          {vaxItem.note}
                        </span>
                      </div>
                    </label>

                    {/* Ask for vaccination date immediately when selected */}
                    {checked && (
                      <div
                        className="mt-2.5 pt-2 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label
                          htmlFor={`vax-date-${idx}`}
                          className="text-[11px] font-bold text-primary flex items-center gap-1.5 shrink-0"
                        >
                          <Calendar className="size-3.5 text-primary shrink-0" />
                          <span>{isEn ? "Vaccination date:" : "Ngày tiêm vắc-xin:"}</span>
                        </label>
                        <input
                          id={`vax-date-${idx}`}
                          type="date"
                          max={new Date().toISOString().split("T")[0]}
                          value={itemDate}
                          onChange={(e) =>
                            setVaxDates((prev) => ({
                              ...prev,
                              [vaxItem.name]: e.target.value,
                            }))
                          }
                          className="rounded-lg border border-primary/30 bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom Vaccines Added */}
              {customVaxes.map((cv) => (
                <div
                  key={cv.id}
                  className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                      <span className="font-bold text-foreground">
                        {cv.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomVax(cv.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded-md transition"
                      aria-label={isEn ? "Remove vaccine" : "Xóa mũi tiêm"}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="pt-2 border-t border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label
                      htmlFor={`custom-vax-date-${cv.id}`}
                      className="text-[11px] font-bold text-primary flex items-center gap-1.5 shrink-0"
                    >
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>{isEn ? "Vaccination date:" : "Ngày tiêm vắc-xin:"}</span>
                    </label>
                    <input
                      id={`custom-vax-date-${cv.id}`}
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={cv.date}
                      onChange={(e) => handleUpdateCustomVaxDate(cv.id, e.target.value)}
                      className="rounded-lg border border-primary/30 bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Vaccine Input */}
            <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newVaxName}
                onChange={(e) => setNewVaxName(e.target.value)}
                placeholder={t("vaxNamePlaceholder")}
                className="w-full flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:border-primary focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={newVaxDate}
                  onChange={(e) => setNewVaxDate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  title={isEn ? "Vaccination date" : "Ngày tiêm vắc-xin"}
                />
                <button
                  type="button"
                  onClick={handleAddCustomVax}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition"
                >
                  <Plus className="size-3.5" />
                  <span>{t("addCustomVax")}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive space-y-2">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {isEn
                  ? "Vaccination Information Needed"
                  : "Yêu cầu thông tin vắc-xin"}
              </span>
            </span>
            <p className="leading-relaxed">
              {t("vaxRequiredNotice")}
            </p>
            <button
              type="button"
              onClick={() => setIsVaccinated(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-bold hover:opacity-95 transition cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{isEn ? "Select Vaccinations Now" : "Chọn mũi tiêm ngay"}</span>
            </button>
          </div>
        )}

        {/* Additional Notes */}
        <div className="space-y-1.5 pt-2">
          <label
            htmlFor="pet-notes"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            {t("notes")}
          </label>
          <input
            id="pet-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Submit Button & Optional Back Button */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition cursor-pointer active:scale-98"
          >
            {isEn ? "← Back to User Info" : "← Quay lại thông tin chủ nuôi"}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex flex-1 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-50 cursor-pointer active:scale-98"
        >
          {isSubmitting ? (
            <span>{isEn ? "Saving..." : "Đang lưu hồ sơ..."}</span>
          ) : (
            <>
              <Sparkles className="size-5" />
              <span>{submitLabel || t("submitBtn")}</span>
            </>
          )}
        </button>
      </div>
      <PortalSyncBridge role="owner" />
    </form>
  );
}
