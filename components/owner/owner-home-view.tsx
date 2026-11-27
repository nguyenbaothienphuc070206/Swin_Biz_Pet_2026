"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  HeartPulse,
  CalendarDays,
  UsersRound,
  MapPin,
  ShieldCheck,
  Heart,
  Syringe,
  Activity,
  CheckCircle2,
  Building2,
  ArrowRight,
  Shield,
  Clock,
  AlertCircle,
  AlertTriangle,
  PlusCircle,
  Pencil,
  Trash2,
  X,
  Check,
  ClipboardCheck,
  ReceiptText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  localizeBreed,
  localizeAge,
  formatBirthdate,
  localizeAllergy,
} from "@/modules/i18n/localize-data";
import { useOwnerPlan } from "@/lib/hooks/use-owner-plan";

interface PetSummary {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  age?: string;
  birthDate?: string;
  weightKg?: number;
  microchip?: string;
  medicalHistory?: string;
  allergies?: string[];
  isVaccinated?: boolean;
}

export function OwnerHomeView({
  userName = "Chủ nuôi PawCare",
  initialPlan = "free",
}: {
  userName?: string;
  initialPlan?: "free" | "premium";
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [pets, setPets] = useState<PetSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { plan: currentPlan, isPremium, isFree } = useOwnerPlan();
  const [displayName, setDisplayName] = useState(userName);
  const [activeOwnerEmail, setActiveOwnerEmail] = useState<string>("yen.le@pawcare.vn");
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);

  const pairedPremiumAccounts = [
    {
      id: "owner-premium-01",
      email: "yen.le@pawcare.vn",
      name: isEn ? "Le Hoang Yen" : "Lê Hoàng Yến",
      petLabel: isEn ? "Bo (British Shorthair)" : "Bé Bơ (Mèo Anh lông ngắn)",
      district: isEn ? "District 1" : "Quận 1",
    },
    {
      id: "owner-premium-02",
      email: "khoa.tran@pawcare.vn",
      name: isEn ? "Tran Anh Khoa" : "Trần Anh Khoa",
      petLabel: isEn ? "Mochi (Toy Poodle)" : "Bé Mochi (Toy Poodle)",
      district: isEn ? "District 1" : "Quận 1",
    },
    {
      id: "owner-premium-03",
      email: "duc.pham@pawcare.vn",
      name: isEn ? "Pham Minh Duc" : "Phạm Minh Đức",
      petLabel: isEn ? "Lu (Poodle Toy)" : "Bé Lu (Poodle Toy)",
      district: isEn ? "Binh Thanh" : "Bình Thạnh",
    },
    {
      id: "owner-premium-04",
      email: "trang.nguyen@pawcare.vn",
      name: isEn ? "Nguyen Thu Trang" : "Nguyễn Thu Trang",
      petLabel: isEn ? "Miu Miu (Calico Cat)" : "Bé Miu Miu (Mèo Tam thể)",
      district: isEn ? "District 10" : "Quận 10",
    },
  ];

  const handleSwitchPremiumAccount = async (targetEmail: string, targetName: string) => {
    if (switchingAccount) return;
    setSwitchingAccount(targetEmail);
    try {
      const res = await fetch("/api/portal/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "switch_account",
          targetEmail,
          role: "owner",
        }),
      });
      if (res.ok) {
        setActiveOwnerEmail(targetEmail);
        setDisplayName(targetName);
        window.dispatchEvent(new Event("pawcare-force-portal-sync"));
        showToast(
          isEn
            ? `Switched to Premium account: ${targetName} (Synced with Clinic Portal)`
            : `Đã chuyển sang tài khoản Premium: ${targetName} (Đồng bộ trực tiếp với Cổng Phòng Khám)`
        );
      }
    } catch {
    } finally {
      setSwitchingAccount(null);
    }
  };

  useEffect(() => {
    const updateNameFromStorage = () => {
      try {
        const storedName = localStorage.getItem("pawcare-owner-name");
        if (storedName && storedName.trim()) {
          setDisplayName(storedName.trim());
        }
        const storedProfile = localStorage.getItem("pawcare-user-profile");
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed?.email) setActiveOwnerEmail(parsed.email);
        }
      } catch {}
    };

    updateNameFromStorage();
    window.addEventListener("pawcare-user-profile-updated", updateNameFromStorage);
    window.addEventListener("storage", updateNameFromStorage);
    return () => {
      window.removeEventListener("pawcare-user-profile-updated", updateNameFromStorage);
      window.removeEventListener("storage", updateNameFromStorage);
    };
  }, []);

  // Edit Pet State
  const [editingPet, setEditingPet] = useState<PetSummary | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    species: string;
    breed: string;
    gender: string;
    birthDate: string;
    age: string;
    weightKg: string;
    microchip: string;
    allergies: string;
    medicalHistory: string;
    isVaccinated: boolean;
  }>({
    name: "",
    species: "dog",
    breed: "",
    gender: "male",
    birthDate: "",
    age: "",
    weightKg: "",
    microchip: "",
    allergies: "",
    medicalHistory: "",
    isVaccinated: true,
  });

  // Delete Pet State
  const [deletingPet, setDeletingPet] = useState<PetSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPets = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-user-pets");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((p) => ({
              ...p,
              name: isEn
                ? p.name === "Bơ"
                  ? "Bo"
                  : p.name
                : p.name === "Bo"
                ? "Bơ"
                : p.name,
              breed: localizeBreed(p.breed, p.species, isEn),
              birthDate: p.birthDate || (p.age && p.age.match(/^\d{4}-\d{2}-\d{2}$/) ? p.age : undefined),
              age: p.birthDate ? formatBirthdate(p.birthDate, isEn) : localizeAge(p.age, isEn),
              allergies: (p.allergies || []).map((al: string) =>
                localizeAllergy(al, isEn)
              ),
            }));
            setPets(normalized);
            setIsLoaded(true);
            return;
          }
        }
      } catch {}
      setPets([]);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadPets();

    const handleUpdate = () => loadPets();
    window.addEventListener("pawcare-pets-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pawcare-pets-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [locale, isEn]);

  const savePetsList = (updated: PetSummary[]) => {
    setPets(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-user-pets", JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent("pawcare-pets-updated", { detail: updated })
        );
      } catch {}
    }
  };

  // Start Editing Pet
  const handleStartEdit = (pet: PetSummary) => {
    setEditingPet(pet);
    const initialBirthDate =
      pet.birthDate ||
      (pet.age && pet.age.match(/^\d{4}-\d{2}-\d{2}$/) ? pet.age : "");
    setEditFormData({
      name: pet.name || "",
      species: pet.species || "dog",
      breed: pet.breed || "",
      gender: pet.gender || "male",
      birthDate: initialBirthDate,
      age: pet.age || initialBirthDate,
      weightKg: pet.weightKg ? String(pet.weightKg) : "",
      microchip: pet.microchip || "",
      allergies: pet.allergies ? pet.allergies.join(", ") : "",
      medicalHistory: pet.medicalHistory || "",
      isVaccinated: Boolean(pet.isVaccinated),
    });
  };

  // Submit Pet Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    const allergiesArray = editFormData.allergies
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedList = pets.map((p) => {
      if (p.id !== editingPet.id) return p;
      return {
        ...p,
        name: editFormData.name.trim() || p.name,
        species: editFormData.species,
        breed: editFormData.breed.trim(),
        gender: editFormData.gender,
        birthDate: editFormData.birthDate,
        age: editFormData.birthDate || editFormData.age.trim(),
        weightKg: parseFloat(editFormData.weightKg) || p.weightKg,
        microchip: editFormData.microchip.trim(),
        allergies: allergiesArray,
        medicalHistory: editFormData.medicalHistory.trim(),
        isVaccinated: editFormData.isVaccinated,
      };
    });

    savePetsList(updatedList);
    setEditingPet(null);
    showToast(
      isEn
        ? `Information for ${editFormData.name} updated successfully!`
        : `Đã cập nhật thông tin của bé ${editFormData.name} thành công!`
    );
  };

  // Confirm Delete Pet
  const handleConfirmDelete = () => {
    if (!deletingPet) return;
    const petName = deletingPet.name;
    const updatedList = pets.filter((p) => p.id !== deletingPet.id);
    savePetsList(updatedList);
    setDeletingPet(null);
    showToast(
      isEn
        ? `Removed ${petName} from registered pets.`
        : `Đã loại bỏ hồ sơ của bé ${petName}.`
    );
  };

  // Weight Unit Sync
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    const updateUnit = () => {
      try {
        const u = localStorage.getItem("pawcare-weight-unit") as "kg" | "lbs";
        if (u === "lbs" || u === "kg") setWeightUnit(u);
      } catch {}
    };
    updateUnit();
    window.addEventListener("pawcare-weight-unit-changed", updateUnit);
    window.addEventListener("storage", updateUnit);
    return () => {
      window.removeEventListener("pawcare-weight-unit-changed", updateUnit);
      window.removeEventListener("storage", updateUnit);
    };
  }, []);

  const formatWeight = (kg?: number) => {
    if (!kg) return "—";
    if (weightUnit === "lbs") {
      return `${(kg * 2.20462).toFixed(1)} lbs`;
    }
    return `${kg} kg`;
  };

  // Mobile Pet Card Stack State & Gestures
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingHorizontalRef = useRef<boolean | null>(null);
  const mouseStartXRef = useRef<number | null>(null);

  // Sync active index whenever pets list updates or when newly added pet is selected
  useEffect(() => {
    if (pets.length === 0) {
      setActivePetIndex(0);
      return;
    }
    try {
      const activeId = localStorage.getItem("pawcare_active_pet_id");
      if (activeId) {
        const foundIdx = pets.findIndex((p) => p.id === activeId);
        if (foundIdx !== -1) {
          setActivePetIndex(foundIdx);
          return;
        }
      }
    } catch {}
    if (activePetIndex >= pets.length) {
      setActivePetIndex(0);
    }
  }, [pets]);

  const goToNextPet = () => {
    if (pets.length <= 1) return;
    setActivePetIndex((prev) => {
      const next = (prev + 1) % pets.length;
      try {
        localStorage.setItem("pawcare_active_pet_id", pets[next].id);
      } catch {}
      return next;
    });
  };

  const goToPrevPet = () => {
    if (pets.length <= 1) return;
    setActivePetIndex((prev) => {
      const next = (prev - 1 + pets.length) % pets.length;
      try {
        localStorage.setItem("pawcare_active_pet_id", pets[next].id);
      } catch {}
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (pets.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingHorizontalRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (isSwipingHorizontalRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isSwipingHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isSwipingHorizontalRef.current) {
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && isSwipingHorizontalRef.current) {
      if (dragOffset < -40) {
        goToNextPet();
      } else if (dragOffset > 40) {
        goToPrevPet();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingHorizontalRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pets.length <= 1) return;
    mouseStartXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartXRef.current === null || !isDragging) return;
    const deltaX = e.clientX - mouseStartXRef.current;
    setDragOffset(deltaX);
  };

  const handleMouseUp = () => {
    if (mouseStartXRef.current !== null && isDragging) {
      if (dragOffset < -40) {
        goToNextPet();
      } else if (dragOffset > 40) {
        goToPrevPet();
      }
    }
    mouseStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const currentPet = pets.length > 0 ? (pets[activePetIndex] || pets[0]) : null;
  const nextPet = pets.length > 1 ? pets[(activePetIndex + 1) % pets.length] : null;
  const nextNextPet = pets.length > 2 ? pets[(activePetIndex + 2) % pets.length] : null;

  const renderPetCard = (pet?: PetSummary | null, isMobileStack = false) => {
    if (!pet) return null;
    return (
      <Card
        key={pet.id}
        className="group relative flex flex-col justify-between p-5 border-border hover:border-primary/50 transition hover:shadow-md bg-card rounded-3xl"
      >
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/${locale}/owner/pets?petId=${encodeURIComponent(
              pet.id
            )}`}
            onClick={(e) => {
              if (isMobileStack && Math.abs(dragOffset) > 8) {
                e.preventDefault();
              }
            }}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary shadow-xs shrink-0">
              {pet.species === "cat"
                ? "🐱"
                : pet.species === "dog"
                ? "🐶"
                : "🐾"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-base group-hover:text-primary transition truncate">
                {pet.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {pet.breed ||
                  (pet.species === "cat"
                    ? isEn
                      ? "Domestic Cat"
                      : "Mèo nhà"
                    : isEn
                    ? "Domestic Dog"
                    : "Chó nhà")}
                {pet.gender &&
                  ` · ${
                    pet.gender === "female"
                      ? isEn
                        ? "Female"
                        : "Cái"
                      : isEn
                      ? "Male"
                      : "Đực"
                  }`}
              </p>
            </div>
          </Link>

          {/* Action buttons at top-right: Edit & Delete */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartEdit(pet);
              }}
              title={isEn ? "Edit Pet Details" : "Tùy chỉnh thông tin"}
              className="grid size-8 sm:size-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer active:scale-95"
            >
              <Pencil className="size-4 sm:size-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeletingPet(pet);
              }}
              title={isEn ? "Remove Pet" : "Loại bỏ thú cưng"}
              className="grid size-8 sm:size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition cursor-pointer active:scale-95"
            >
              <Trash2 className="size-4 sm:size-3.5" />
            </button>
          </div>
        </div>

        <Link
          href={`/${locale}/owner/pets?petId=${encodeURIComponent(
            pet.id
          )}`}
          onClick={(e) => {
            if (isMobileStack && Math.abs(dragOffset) > 8) {
              e.preventDefault();
            }
          }}
          className="block space-y-2 pt-2.5 hover:opacity-95 transition"
        >
          <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/50">
            <div>
              <span className="text-muted-foreground/70 block text-[10px]">
                {isEn ? "Birthdate" : "Ngày sinh"}
              </span>
              <strong className="text-foreground font-semibold text-xs truncate block">
                {formatBirthdate(pet.birthDate || pet.age, isEn)}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground/70 block text-[10px]">
                {isEn ? "Weight" : "Cân nặng"}
              </span>
              <strong className="text-foreground font-semibold text-xs truncate block">
                {formatWeight(pet.weightKg)}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground/70 block text-[10px]">
                {isEn ? "Vaccines" : "Tiêm ngừa"}
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1 truncate">
                <Syringe className="size-3 shrink-0" />
                <span className="truncate">
                  {pet.isVaccinated
                    ? isEn
                      ? "Protected"
                      : "Đã tiêm"
                    : isEn
                    ? "Pending"
                    : "Cần tiêm"}
                </span>
              </strong>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
        <Link
          href={`/${locale}/owner/pets?petId=${encodeURIComponent(
            pet.id
          )}`}
          onClick={(e) => {
            if (isMobileStack && Math.abs(dragOffset) > 8) {
              e.preventDefault();
            }
          }}
          className="flex-1 flex items-center justify-between rounded-xl bg-secondary/80 px-3.5 py-2.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary transition group-hover:bg-primary group-hover:text-primary-foreground active:scale-[0.99]"
        >
          <span>
            {isEn ? "View Medical Passport" : "Xem Sổ Y Bạ Chi Tiết"}
          </span>
          <ArrowRight className="size-3.5" />
        </Link>

        <button
          type="button"
          onClick={() => handleStartEdit(pet)}
          className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer active:scale-95"
        >
          {isEn ? "Edit" : "Tùy chỉnh"}
        </button>
      </div>
    </Card>
  );
};

  const petCount = pets.length;
  const vaccinatedCount = pets.filter((p) => p.isVaccinated).length;

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== 1. MOBILE-FIRST APP HEADER (< sm) ==================== */}
      <div className="sm:hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/15 via-card to-emerald-500/10 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground truncate">
              {displayName}
            </h1>
          </div>

          <Link
            href={`/${locale}/owner/billing`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary active:scale-95 transition"
          >
            <Shield className="size-3 text-primary" />
            <span>{currentPlan === "premium" ? "Premium" : "Free"}</span>
          </Link>
        </div>
      </div>

      {/* ==================== 2. DESKTOP HERO BANNER (>= sm) ==================== */}
      <div className="hidden sm:block relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/20 via-card to-emerald-500/20 p-8 md:p-10 shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {isEn ? `Welcome, ${displayName}` : `Xin chào, ${displayName}`}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Heart className="size-4 text-rose-500" />
              <span>
                {isEn
                  ? `${petCount} pet${petCount === 1 ? "" : "s"}`
                  : `${petCount} thú cưng`}
              </span>
            </span>

            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Shield className="size-4 text-primary" />
              <span>
                {currentPlan === "premium"
                  ? isEn
                    ? "Premium Plan"
                    : "Gói Premium"
                  : isEn
                  ? "Free Plan"
                  : "Gói Free"}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href={`/${locale}/owner/pets`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow transition hover:opacity-95 text-center active:scale-[0.98]"
            >
              <HeartPulse className="size-4 shrink-0" />
              <span>{isEn ? "Open Pet Passport" : "Mở Sổ Y Bạ Thú Cưng"}</span>
            </Link>

            <Link
              href={`/${locale}/owner/appointments`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition hover:bg-muted text-center active:scale-[0.98]"
            >
              <CalendarDays className="size-4 text-primary shrink-0" />
              <span>{isEn ? "Book Vet Appointment" : "Đặt lịch khám thú y"}</span>
            </Link>

            <Link
              href={`/${locale}/owner/care-plans`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition hover:bg-muted text-center active:scale-[0.98]"
            >
              <ClipboardCheck className="size-4 text-primary shrink-0" />
              <span>{isEn ? "Care Plans" : "Kế hoạch chăm sóc"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== 2.5. PAIRED PORTALS & 4 PREMIUM ACCOUNTS SWITCHER ==================== */}
      <Card className="p-4 sm:p-6 rounded-3xl border border-primary/25 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                {isEn ? "2-Portal Backend Paired" : "Đã kết nối & lưu dữ liệu 2 Portal"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <ShieldCheck className="size-3.5" />
                {isEn ? "4 Premium Accounts" : "4 Tài khoản Premium"}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-sm sm:text-base font-bold text-foreground">
              {isEn
                ? "Switch Paired Premium Owner Account (Live Sync with PetCare Clinic · Dist 1)"
                : "Chuyển đổi 4 Tài khoản Chủ nuôi Premium (Đồng bộ thời gian thực với Phòng Khám PetCare · Quận 1)"}
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            clinic@pawcare.vn ↔ 4 owners
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {pairedPremiumAccounts.map((acc) => {
            const isCurrent =
              activeOwnerEmail.toLowerCase() === acc.email.toLowerCase() ||
              displayName.toLowerCase() === acc.name.toLowerCase();
            return (
              <button
                key={acc.id}
                type="button"
                disabled={Boolean(switchingAccount)}
                onClick={() => handleSwitchPremiumAccount(acc.email, acc.name)}
                className={`text-left rounded-2xl border p-3 transition cursor-pointer ${
                  isCurrent
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-display font-bold text-xs sm:text-sm text-foreground truncate">
                    {acc.name}
                  </span>
                  <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
                    PREMIUM
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-foreground/90 truncate">
                  {acc.petLabel}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">
                  {acc.email}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ==================== 3. SECTION: THÚ CƯNG CỦA BẠN (YOUR COMPANIONS) ==================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="size-4.5 sm:size-5 text-rose-500" />
              <span>{isEn ? "Your Companions" : "Thú cưng của bạn"}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                {petCount}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {isEn
                ? "Digital passports, medical status, and microchips for registered pets"
                : "Hồ sơ y bạ số, tình trạng tiêm ngừa và thông tin y tế của các bé"}
            </p>
          </div>

          <Link
            href={`/${locale}/pet-health-setup`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/25 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition active:scale-95"
          >
            <PlusCircle className="size-3.5" />
            <span>{isEn ? "+ Add Pet" : "+ Thêm bé"}</span>
          </Link>
        </div>

        {!isLoaded ? (
          <div className="p-8 text-center animate-pulse space-y-3 rounded-3xl border border-border/80 bg-card">
            <div className="mx-auto size-12 rounded-2xl bg-muted" />
            <div className="h-4 w-40 mx-auto bg-muted rounded-full" />
          </div>
        ) : pets.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed border-border/80 bg-card rounded-3xl">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/10 text-4xl shadow-inner">
              🐾
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <p className="font-display font-bold text-lg text-foreground">
                {isEn ? "No pets registered yet" : "Bạn chưa thêm hồ sơ bé nào"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "Set up your pet's digital health passport to record vaccinations, allergies, and microchip IDs."
                  : "Khởi tạo ngay hồ sơ y bạ điện tử đầu tiên để quản lý lịch tiêm phòng, cảnh báo dị ứng thuốc và cấp mã thẻ y bạ chính thức."}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/${locale}/pet-health-setup`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-md hover:opacity-95 transition active:scale-98"
              >
                <PlusCircle className="size-4" />
                <span>{isEn ? "Set Up Your Pet Profile Now" : "Thiết lập hồ sơ thú cưng ngay"}</span>
              </Link>
            </div>
          </Card>
        ) : (
          <div>
            {/* 1. MOBILE VIEW: Interactive Pet Card Stack (< sm) */}
            <div className="sm:hidden">
              {pets.length === 1 ? (
                // Only 1 pet: display clean single card
                <div>{renderPetCard(pets[0])}</div>
              ) : currentPet ? (
                // 2+ pets: Stacked Cards Deck with Swipe & Arrow Buttons
                <div className="space-y-2">
                  {/* Stack Deck Area */}
                  <div className="relative pt-1 pb-4 select-none">
                    {/* Layer 2: 3rd card in stack (if 3+ pets) */}
                    {nextNextPet && (
                      <div
                        className="absolute inset-x-5 bottom-0 top-5 rounded-3xl bg-muted/40 border border-border/40 -z-20 shadow-2xs pointer-events-none transition-all duration-300"
                        style={{ transform: "scale(0.91) translateY(12px)" }}
                      />
                    )}

                    {/* Layer 1: 2nd card in stack */}
                    {nextPet && (
                      <div
                        className="absolute inset-x-2.5 bottom-1 top-3 rounded-3xl bg-muted/70 border border-border/60 -z-10 shadow-xs pointer-events-none transition-all duration-300 flex items-end justify-center pb-1.5"
                        style={{ transform: "scale(0.96) translateY(6px)" }}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground/60 tracking-wider">
                          {nextPet.name} · {nextPet.breed || (nextPet.species === "cat" ? (isEn ? "Cat" : "Mèo") : (isEn ? "Dog" : "Chó"))}
                        </span>
                      </div>
                    )}

                    {/* Floating Side Left Arrow Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevPet();
                      }}
                      aria-label={isEn ? "Previous Pet" : "Bé trước"}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 grid size-8 place-items-center rounded-full bg-background/90 backdrop-blur-md border border-border shadow-md text-foreground hover:bg-muted active:scale-90 transition cursor-pointer"
                    >
                      <ChevronLeft className="size-4.5" />
                    </button>

                    {/* Floating Side Right Arrow Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextPet();
                      }}
                      aria-label={isEn ? "Next Pet" : "Bé tiếp theo"}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 grid size-8 place-items-center rounded-full bg-background/90 backdrop-blur-md border border-border shadow-md text-foreground hover:bg-muted active:scale-90 transition cursor-pointer"
                    >
                      <ChevronRight className="size-4.5" />
                    </button>

                    {/* Active Front Card with Swipe & Drag handlers */}
                    <div
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{
                        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.035}deg)`,
                        transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        cursor: isDragging ? "grabbing" : "grab",
                      }}
                      className="relative z-10 touch-pan-y"
                    >
                      {renderPetCard(currentPet, true)}
                    </div>
                  </div>

                  {/* Bottom Pagination Dots & Swipe Hint */}
                  <div className="flex flex-col items-center gap-1.5 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      {pets.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setActivePetIndex(idx);
                            try {
                              localStorage.setItem("pawcare_active_pet_id", p.id);
                            } catch {}
                          }}
                          aria-label={`Pet ${idx + 1}: ${p.name}`}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            idx === activePetIndex
                              ? "w-6 h-2 bg-primary shadow-xs"
                              : "w-2 h-2 bg-border hover:bg-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isEn
                        ? "Swipe left/right or tap arrows to switch companion"
                        : "Kéo qua lại hoặc bấm mũi tên để chuyển đổi bé"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 2. DESKTOP VIEW: Multi-column Grid (>= sm) */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pets.map((pet) => renderPetCard(pet, false))}
            </div>
          </div>
        )}
      </div>

      {/* ==================== 4. MOBILE COMPREHENSIVE SERVICE DOCK (< sm) ==================== */}
      <div className="grid grid-cols-4 gap-2 sm:hidden text-center">
        {/* 1. Phòng khám */}
        <Link
          href={`/${locale}/clinics`}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card p-2 text-center transition active:scale-95 shadow-2xs group hover:border-primary/50"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs">
            <MapPin className="size-5" />
          </div>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate w-full">
            {isEn ? "Clinics" : "Phòng khám"}
          </span>
        </Link>

        {/* 2. Kế hoạch */}
        <Link
          href={`/${locale}/owner/care-plans`}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card p-2 text-center transition active:scale-95 shadow-2xs group hover:border-primary/50"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-2xs">
            <ClipboardCheck className="size-5" />
          </div>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate w-full">
            {isEn ? "Plans" : "Kế hoạch"}
          </span>
        </Link>

        {/* 3. Cộng đồng */}
        <Link
          href={`/${locale}/owner/community`}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card p-2 text-center transition active:scale-95 shadow-2xs group hover:border-primary/50"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-2xs">
            <UsersRound className="size-5" />
          </div>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate w-full">
            {isEn ? "Community" : "Cộng đồng"}
          </span>
        </Link>

        {/* 4. Gói hội viên */}
        <Link
          href={`/${locale}/owner/billing`}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card p-2 text-center transition active:scale-95 shadow-2xs group hover:border-primary/50"
        >
          <div className="grid size-10 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-2xs">
            <ReceiptText className="size-5" />
          </div>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate w-full">
            {isEn ? "Billing" : "Gói cước"}
          </span>
        </Link>
      </div>

      {/* ==================== 5. MOBILE 24/7 SUPPORT & SOS REASSURANCE (< sm) ==================== */}
      <div className="sm:hidden rounded-3xl border border-destructive/25 bg-destructive/5 p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-destructive uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              <span>{isEn ? "24/7 Emergency Support" : "Hỗ trợ y tế & Cấp cứu 24/7"}</span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isEn
                ? "Immediate clinical triage guidance and nearest 24/7 partner hospital routing."
                : "Hướng dẫn xử trí khẩn cấp và điều phối tức thì tới bệnh viện thú y 24/7 gần bạn nhất."}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/owner/sos`}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-destructive py-2.5 px-3 text-xs font-bold text-destructive-foreground shadow-xs active:scale-98 transition"
        >
          <HeartPulse className="size-3.5" />
          <span>{isEn ? "Open Emergency SOS 24/7" : "Yêu cầu cấp cứu SOS 24/7"}</span>
        </Link>
      </div>

      {/* Edit Pet Modal */}
      {editingPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Pencil className="size-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {isEn ? "Edit Pet Details" : "Tùy Chỉnh Thông Tin Thú Cưng"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? `Update records for ${editingPet.name}`
                      : `Cập nhật thông tin cho bé ${editingPet.name}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingPet(null)}
                className="grid size-8 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Pet Name *" : "Tên bé *"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    required
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Species" : "Loài"}
                  </label>
                  <select
                    value={editFormData.species}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        species: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="dog">{isEn ? "Dog 🐶" : "Chó 🐶"}</option>
                    <option value="cat">{isEn ? "Cat 🐱" : "Mèo 🐱"}</option>
                    <option value="other">
                      {isEn ? "Other Pet 🐾" : "Khác 🐾"}
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Breed" : "Giống loài"}
                  </label>
                  <input
                    type="text"
                    value={editFormData.breed}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        breed: e.target.value,
                      })
                    }
                    placeholder={
                      isEn ? "e.g. Corgi, Golden, Poodle" : "VD: Corgi, Mèo Anh lông ngắn"
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Gender" : "Giới tính"}
                  </label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        gender: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="male">{isEn ? "Male" : "Đực"}</option>
                    <option value="female">{isEn ? "Female" : "Cái"}</option>
                    <option value="neutered">
                      {isEn ? "Neutered / Spayed" : "Đã triệt sản"}
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Birthdate" : "Ngày sinh"}
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={editFormData.birthDate}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        birthDate: e.target.value,
                        age: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                  {editFormData.birthDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isEn ? "Display: " : "Hiển thị: "}
                      <strong className="text-foreground">
                        {formatBirthdate(editFormData.birthDate, isEn)}
                      </strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {isEn ? "Weight (kg)" : "Cân nặng (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFormData.weightKg}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        weightKg: e.target.value,
                      })
                    }
                    placeholder={isEn ? "e.g. 5.5" : "VD: 5.5"}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {isEn ? "Microchip Code" : "Mã vi mạch (Microchip)"}
                </label>
                <input
                  type="text"
                  value={editFormData.microchip}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      microchip: e.target.value,
                    })
                  }
                  placeholder={isEn ? "e.g. VN-PC-128490" : "VD: VN-PC-128490"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {isEn
                    ? "Allergies (comma-separated)"
                    : "Cảnh báo dị ứng (cách nhau bằng dấu phẩy)"}
                </label>
                <input
                  type="text"
                  value={editFormData.allergies}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      allergies: e.target.value,
                    })
                  }
                  placeholder={
                    isEn
                      ? "e.g. Beef, Penicillin, Seafood"
                      : "VD: Dị ứng thịt bò, Dị ứng kháng sinh Penicillin..."
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {isEn ? "Medical History / Notes" : "Tiền sử bệnh lý / Ghi chú"}
                </label>
                <textarea
                  rows={2}
                  value={editFormData.medicalHistory}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      medicalHistory: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isVaccinated}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        isVaccinated: e.target.checked,
                      })
                    }
                    className="size-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>
                    {isEn
                      ? "Vaccination profile updated & on track"
                      : "Đã tiêm phòng vắc-xin đầy đủ"}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-95 transition"
                >
                  <Check className="size-4" />
                  <span>{isEn ? "Save Changes" : "Lưu thay đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="size-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display text-base font-bold text-foreground">
                {isEn ? "Remove Pet Profile?" : "Xác nhận loại bỏ thú cưng?"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? `Are you sure you want to remove ${deletingPet.name}? This action cannot be undone.`
                  : `Bạn có chắc chắn muốn xóa hồ sơ của bé ${deletingPet.name} không? Dữ liệu y bạ trên thiết bị sẽ bị gỡ bỏ.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPet(null)}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                {isEn ? "Cancel" : "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition shadow-xs"
              >
                {isEn ? "Confirm Delete" : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
