"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Stethoscope,
  CheckCircle2,
  Phone,
  X,
  AlertCircle,
  Users,
  ShieldCheck,
  Check,
  ChevronDown,
  Sparkles,
  Lock,
  Star,
  Search,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useOwnerPlan } from "@/lib/hooks/use-owner-plan";
import { getFallbackClinics, type ClinicDetail } from "@/modules/clinics/mock-clinics";
import {
  localizeAppointment,
  localizeBreed,
  localizeAge,
  formatBirthdate,
  localizeAllergy,
  localizeServiceName,
  localizeClinic,
} from "@/modules/i18n/localize-data";
import { getInitialSeedAppointments } from "@/modules/booking/seed-appointments";

export interface BookedPetDetail {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  age?: string;
  birthDate?: string;
  weightKg?: number;
  microchip?: string;
  allergies?: string[];
  service: string;
}

export interface Appointment {
  id: string;
  petName: string;
  petCount: number;
  pets: BookedPetDetail[];
  ownerName?: string;
  ownerPhone?: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  service: string;
  date: string;
  time: string;
  doctor: string;
  status: "confirmed" | "pending" | "completed" | "canceled";
  notes?: string;
  isPriority?: boolean;
}

interface AvailablePet {
  id: string;
  name: string;
  species?: string;
  breed?: string;
  gender?: string;
  age?: string;
  birthDate?: string;
  weightKg?: number;
  microchip?: string;
  allergies?: string[];
  isVaccinated?: boolean;
}

function getLocalizedDefaultCompanions(_isEn: boolean): AvailablePet[] {
  return [];
}

export function AppointmentsManager({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const tOwner = useTranslations("owner");
  const tA = useTranslations("ownerAppointments");
  const common = useTranslations("common");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availablePets, setAvailablePets] = useState<AvailablePet[]>([]);
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { isFree, isPremium } = useOwnerPlan();

  const PRIORITY_SLOTS = ["08:00", "11:30", "18:00"];

  // Load available user pets and persistent appointments
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Load user pets
      try {
        const storedPets = localStorage.getItem("pawcare-user-pets");
        if (storedPets) {
          const parsed = JSON.parse(storedPets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((p: any) => ({
              ...p,
              name: isEn ? (p.name === "Bơ" ? "Bo" : p.name) : (p.name === "Bo" ? "Bơ" : p.name),
              breed: localizeBreed(p.breed, p.species, isEn),
              birthDate: p.birthDate || (p.age && p.age.match(/^\d{4}-\d{2}-\d{2}$/) ? p.age : undefined),
              age: p.birthDate ? formatBirthdate(p.birthDate, isEn) : localizeAge(p.age, isEn),
              allergies: (p.allergies || []).map((al: string) => localizeAllergy(al, isEn)),
            }));
            setAvailablePets(normalized);
            setSelectedPetSlots([{ petId: normalized[0].id, service: tA("serviceGeneral") }]);
          } else {
            setAvailablePets([]);
            setSelectedPetSlots([]);
          }
        } else {
          setAvailablePets([]);
          setSelectedPetSlots([]);
        }
      } catch {
        setAvailablePets([]);
        setSelectedPetSlots([]);
      }

      // 2. Load stored appointments
      try {
        const storedApts = localStorage.getItem("pawcare-appointments");
        if (storedApts) {
          const parsed = JSON.parse(storedApts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((a: Appointment) => localizeAppointment(a, isEn));
            setAppointments(normalized);
            return;
          }
        }
      } catch {}

      // Fallback to initial seed appointments so owner and clinic sides stay in sync
      const seed = getInitialSeedAppointments(isEn);
      const normalizedSeed = seed.map((a: any) => localizeAppointment(a as Appointment, isEn));
      setAppointments(normalizedSeed);
      try {
        localStorage.setItem("pawcare-appointments", JSON.stringify(seed));
      } catch {}
    }

    const handleStorageUpdate = () => {
      try {
        const storedApts = localStorage.getItem("pawcare-appointments");
        if (storedApts) {
          const parsed = JSON.parse(storedApts);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((a: Appointment) => localizeAppointment(a, isEn));
            setAppointments(normalized);
          }
        }
      } catch {}
    };

    window.addEventListener("pawcare-appointments-updated", handleStorageUpdate);
    window.addEventListener("storage", handleStorageUpdate);
    return () => {
      window.removeEventListener("pawcare-appointments-updated", handleStorageUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [locale, isEn, tA]);

  // Sync appointments to localStorage
  const saveAppointments = (updated: Appointment[]) => {
    setAppointments(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-appointments", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("pawcare-appointments-updated"));
      } catch {}
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowBookingModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Multi-Pet Booking State
  const maxPetQuantity = Math.max(1, availablePets.length);
  const [petQuantity, setPetQuantity] = useState<number>(1);
  const [selectedPetSlots, setSelectedPetSlots] = useState<
    Array<{ petId: string; service: string }>
  >([]);

  // General Booking Form Fields
  const [clinicName, setClinicName] = useState(
    isEn
      ? "PetCare Veterinary Clinic · District 1"
      : "Phòng khám Thú Y PetCare · Quận 1"
  );
  const [clinicAddress, setClinicAddress] = useState(
    isEn
      ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC"
      : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM"
  );
  const [clinicPhone, setClinicPhone] = useState("028 3823 4567");
  const [clinicSearchQuery, setClinicSearchQuery] = useState("");

  const allClinics: ClinicDetail[] = useMemo(() => {
    const list = getFallbackClinics(locale).map((c) => localizeClinic(c, isEn));
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-registered-clinic");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.name && !list.some((c) => c.name.toLowerCase() === parsed.name.toLowerCase())) {
            const customServices = Array.isArray(parsed.services)
              ? parsed.services.map((s: string) => ({
                  name: s,
                  description: isEn
                    ? "Specialized veterinary service offered by clinic"
                    : "Dịch vụ thú y chuyên khoa do cơ sở cung cấp",
                  price_vnd: 150000,
                  duration_minutes: 30,
                }))
              : [];

            list.unshift({
              id: "registered-clinic-custom",
              name: parsed.name,
              address: parsed.address || (isEn ? "Central Practice" : "Cơ sở trung tâm"),
              district: parsed.city || "",
              phone: parsed.phone || "028 3823 4567",
              distanceKm: 0.5,
              facilityType: (parsed.facilityType as any) || "clinic",
              rating: 5.0,
              reviewCount: 1,
              specialties: parsed.services || [],
              languages: isEn ? ["English", "Vietnamese"] : ["Tiếng Việt"],
              is_24_7: Boolean(parsed.is247),
              verified: true,
              description: "",
              services: customServices,
              hours: [],
            });
          }
        }
      } catch {}
    }
    return list;
  }, [locale, isEn]);

  const filteredClinics = useMemo(() => {
    if (!clinicSearchQuery.trim()) return allClinics;
    const q = clinicSearchQuery.toLowerCase();
    return allClinics.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchAddr = c.address.toLowerCase().includes(q);
      const matchDist = c.district.toLowerCase().includes(q);
      const matchType = c.facilityType?.toLowerCase().includes(q);
      return matchName || matchAddr || matchDist || matchType;
    });
  }, [allClinics, clinicSearchQuery]);

  // Currently selected clinic object
  const currentSelectedClinic = useMemo(() => {
    if (!allClinics || allClinics.length === 0) return null;
    return (
      allClinics.find(
        (c) =>
          c.name.trim().toLowerCase() === clinicName.trim().toLowerCase() ||
          c.address.trim().toLowerCase() === clinicAddress.trim().toLowerCase()
      ) || allClinics[0]
    );
  }, [allClinics, clinicName, clinicAddress]);

  // Derived offered services of the selected clinic
  const offeredServices = useMemo(() => {
    if (!currentSelectedClinic) return [];
    if (currentSelectedClinic.services && currentSelectedClinic.services.length > 0) {
      return currentSelectedClinic.services;
    }
    if (currentSelectedClinic.specialties && currentSelectedClinic.specialties.length > 0) {
      return currentSelectedClinic.specialties.map((spec) => ({
        name: spec,
        description: isEn
          ? "Specialized clinical service provided by certified staff"
          : "Dịch vụ thú y chuyên khoa do đội ngũ bác sĩ cơ sở thực hiện",
        price_vnd: 150000,
        duration_minutes: 30,
      }));
    }
    return [
      {
        name: isEn ? "General Wellness Exam" : "Khám sức khỏe tổng quát",
        description: isEn
          ? "Clinical physical examination and vital checks"
          : "Khám thể trạng tổng quát và kiểm tra sinh hiệu",
        price_vnd: 150000,
        duration_minutes: 30,
      },
    ];
  }, [currentSelectedClinic, isEn]);

  // Synchronize pet slot services if clinic changes or service is not offered
  useEffect(() => {
    if (!offeredServices || offeredServices.length === 0) return;
    const fallbackService = offeredServices[0].name;

    setSelectedPetSlots((prev) => {
      let hasChange = false;
      const updated = prev.map((slot) => {
        const isOffered = offeredServices.some((srv) => srv.name === slot.service);
        if (!isOffered) {
          hasChange = true;
          return { ...slot, service: fallbackService };
        }
        return slot;
      });
      return hasChange ? updated : prev;
    });
  }, [offeredServices]);

  const handleClinicSelect = (c: ClinicDetail) => {
    setClinicName(c.name);
    setClinicAddress(c.address);
    setClinicPhone(c.phone);

    const clinicServices =
      c.services && c.services.length > 0
        ? c.services
        : c.specialties && c.specialties.length > 0
        ? c.specialties.map((spec) => ({
            name: spec,
            description: "",
            price_vnd: 150000,
            duration_minutes: 30,
          }))
        : [
            {
              name: isEn ? "General Wellness Exam" : "Khám sức khỏe tổng quát",
              description: "",
              price_vnd: 150000,
              duration_minutes: 30,
            },
          ];

    const fallbackFirst =
      clinicServices[0]?.name || (isEn ? "General Wellness Exam" : "Khám sức khỏe tổng quát");

    setSelectedPetSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        service: clinicServices.some((srv) => srv.name === slot.service)
          ? slot.service
          : fallbackFirst,
      }))
    );
  };

  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");

  // When pet quantity changes, adjust selection slots
  const handleQuantityChange = (newQty: number) => {
    setPetQuantity(newQty);
    const updatedSlots = [...selectedPetSlots];
    const defaultServiceName =
      offeredServices[0]?.name || (isEn ? "General Wellness Exam" : "Khám sức khỏe tổng quát");

    if (newQty > updatedSlots.length) {
      // Add more slots with distinct pets if possible
      for (let i = updatedSlots.length; i < newQty; i++) {
        const nextPet = availablePets[i] || availablePets[0];
        updatedSlots.push({
          petId: nextPet.id,
          service: defaultServiceName,
        });
      }
    } else if (newQty < updatedSlots.length) {
      // Truncate to new quantity
      updatedSlots.splice(newQty);
    }
    setSelectedPetSlots(updatedSlots);
  };

  // Change pet selected in a specific slot
  const handleSlotPetChange = (slotIndex: number, newPetId: string) => {
    const updated = [...selectedPetSlots];
    updated[slotIndex].petId = newPetId;
    setSelectedPetSlots(updated);
  };

  // Change specific service for a specific slot
  const handleSlotServiceChange = (slotIndex: number, newService: string) => {
    const updated = [...selectedPetSlots];
    updated[slotIndex].service = newService;
    setSelectedPetSlots(updated);
  };

  const handleTimeSlotChange = (slot: string) => {
    if (PRIORITY_SLOTS.includes(slot) && isFree) {
      setShowPriorityModal(true);
      return;
    }
    setBookingTime(slot);
  };

  // Create Appointment
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const isPriority = PRIORITY_SLOTS.includes(bookingTime);
    if (isPriority && isFree) {
      setShowPriorityModal(true);
      return;
    }

    // Collect details for each chosen pet slot
    const bookedPets: BookedPetDetail[] = selectedPetSlots.map((slot) => {
      const pet = availablePets.find((p) => p.id === slot.petId) || availablePets[0];
      return {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
        age: pet.age,
        birthDate: pet.birthDate,
        weightKg: pet.weightKg,
        microchip: pet.microchip,
        allergies: pet.allergies,
        service: slot.service,
      };
    });

    // Pet names summary string (e.g. "Bơ & Miu")
    const namesSummary =
      bookedPets.length === 1
        ? bookedPets[0].name
        : bookedPets.length === 2
        ? `${bookedPets[0].name} & ${bookedPets[1].name}`
        : `${bookedPets.map((p) => p.name).slice(0, -1).join(", ")} & ${bookedPets[bookedPets.length - 1].name}`;

    // Services summary string
    const distinctServices = Array.from(new Set(bookedPets.map((p) => p.service)));
    const serviceSummary =
      distinctServices.length === 1
        ? distinctServices[0]
        : isEn
        ? `Comprehensive Care (${distinctServices.join(", ")})`
        : `Gói khám kết hợp (${distinctServices.join(", ")})`;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      petName: namesSummary,
      petCount: bookedPets.length,
      pets: bookedPets,
      clinicName,
      clinicAddress,
      clinicPhone,
      service: serviceSummary,
      date: bookingDate,
      time: bookingTime,
      doctor: isEn ? "Attending Specialist" : "Bác sĩ phụ trách ca",
      status: "pending",
      notes: bookingNotes,
      isPriority,
    };

    const updatedList = [newApt, ...appointments];
    saveAppointments(updatedList);
    setShowBookingModal(false);
    setBookingNotes("");
    setNotice(
      isEn
        ? `Appointment request submitted for ${namesSummary}! Awaiting confirmation from ${clinicName}.`
        : `Đã gửi yêu cầu đặt lịch khám cho ${namesSummary}! Đang chờ ${clinicName} xác nhận.`
    );
    setTimeout(() => setNotice(null), 5000);
  };

  const handleCancel = (id: string) => {
    if (confirm(tA("cancelConfirm"))) {
      const updated = appointments.map((a) =>
        a.id === id ? { ...a, status: "canceled" as const } : a
      );
      saveAppointments(updated);
    }
  };

  const upcoming = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "pending"
  );
  const history = appointments.filter(
    (a) => a.status === "completed" || a.status === "canceled"
  );
  const displayList = tab === "upcoming" ? upcoming : history;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Exit / Back button */}
      <div>
        <BackButton
          fallbackHref={`/${locale}/owner`}
          label={isEn ? "Back to Main" : "Quay về Trang chính"}
          variant="pill"
        />
      </div>

      {/* Header Row */}
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-foreground">
            {tA("title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {tA("subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowBookingModal(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 sm:text-sm"
        >
          <Plus className="size-4 shrink-0" />
          <span>{tA("bookNew")}</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/20 p-4 text-xs font-medium text-emerald-950 dark:text-emerald-300 sm:text-sm animate-in fade-in"
        >
          <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0 flex-1 text-center sm:text-left">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="break-words">{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 hover:opacity-75 shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center sm:justify-start gap-2 border-b border-border pb-1">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm cursor-pointer ${
            tab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{tA("tabUpcoming")}</span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary font-bold">
            {upcoming.length}
          </span>
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm cursor-pointer ${
            tab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{tA("tabHistory")}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-bold">
            {history.length}
          </span>
        </button>
      </div>

      {/* Appointment Cards List */}
      {!displayList.length ? (
        <Card className="p-8 text-center space-y-3 border-dashed border-border">
          <Calendar className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-bold text-foreground">
            {tA("emptyTitle")}
          </h3>
          <p className="text-xs text-muted-foreground sm:text-sm max-w-md mx-auto">
            {tab === "upcoming" ? tA("emptyUpcoming") : tA("emptyHistory")}
          </p>
          {tab === "upcoming" && (
            <button
              onClick={() => setShowBookingModal(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:text-sm shadow"
            >
              <Plus className="size-4 shrink-0" />
              <span>{tA("bookNow")}</span>
            </button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayList.map((apt) => {
            const isConfirmed = apt.status === "confirmed";
            const isPending = apt.status === "pending";
            const isCompleted = apt.status === "completed";
            const isCanceled = apt.status === "canceled";

            return (
              <Card
                key={apt.id}
                className="relative flex flex-col justify-between p-6 rounded-3xl border-border bg-card shadow-xs hover:border-primary/40 transition"
              >
                <div>
                  <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between items-center sm:items-start text-center sm:text-left">
                    <div className="min-w-0 space-y-1 flex flex-col items-center sm:items-start">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {tA("patient")}: 🐾 <strong>{apt.petName}</strong>
                        </span>
                        {apt.petCount > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            <Users className="size-3" />
                            <span>
                              {isEn
                                ? `${apt.petCount} Pets`
                                : `${apt.petCount} bé khám`}
                            </span>
                          </span>
                        )}
                        {(apt.isPriority || PRIORITY_SLOTS.includes(apt.time)) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <Sparkles className="size-3" />
                            <span>{isEn ? "Priority Slot" : "Ưu tiên Premium"}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-lg font-bold text-foreground text-center sm:text-left">
                        {apt.service}
                      </h3>

                      {/* Display individual booked pet badges if present */}
                      {apt.pets && apt.pets.length > 0 && (
                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-1">
                          {apt.pets.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/80 border border-border/60 px-2 py-1 text-xs font-medium text-foreground"
                            >
                              <span>{p.species === "cat" ? "🐱" : "🐶"}</span>
                              <strong>{p.name}</strong>
                              {p.service && (
                                <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                  ({p.service})
                                </span>
                              )}
                              {p.allergies && p.allergies.length > 0 && (
                                <span
                                  title={
                                    isEn
                                      ? `Allergies: ${p.allergies.join(", ")}`
                                      : `Dị ứng: ${p.allergies.join(", ")}`
                                  }
                                  className="text-[10px] text-destructive font-bold"
                                >
                                  ⚠️
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex justify-center sm:justify-end">
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="size-3.5 shrink-0" />{" "}
                          {tA("statusConfirmed")}
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Clock className="size-3.5 shrink-0" />{" "}
                          {tA("statusPending")}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {tA("statusCompleted")}
                        </span>
                      )}
                      {isCanceled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          {tA("statusCanceled")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5 font-semibold text-foreground">
                      <Calendar className="size-4 text-primary shrink-0" />
                      <span>
                        {new Intl.DateTimeFormat(locale, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(apt.date))}
                        {" · "}
                        <strong className="text-primary">{apt.time}</strong>
                      </span>
                    </div>

                    <div className="flex items-start justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground text-center sm:text-left">
                      <MapPin className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {apt.clinicName}
                        </p>
                        <p className="line-clamp-2">{apt.clinicAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground">
                      <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                      <span>
                        {tA("assignedDoctor")}: {apt.doctor}
                      </span>
                    </div>

                    {apt.notes && (
                      <p className="mt-2 rounded-xl bg-muted/40 p-2.5 text-xs italic text-muted-foreground text-center sm:text-left">
                        &quot;{apt.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-between gap-3 border-t border-border pt-4 text-xs">
                  <a
                    href={`tel:${apt.clinicPhone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline shrink-0"
                  >
                    <Phone className="size-3.5 shrink-0" />
                    <span>{apt.clinicPhone}</span>
                  </a>

                  {(isConfirmed || isPending) && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="rounded-lg px-2.5 py-1.5 font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                      >
                        {tA("cancel")}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Booking Modal Dialog */}
      {showBookingModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBookingModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in"
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {tA("modalTitle")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Book appointment with partner veterinary clinics"
                    : "Đặt lịch thăm khám thú y tại các phòng khám liên kết"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-muted transition cursor-pointer"
                aria-label={isEn ? "Exit booking" : "Thoát đặt lịch"}
              >
                <X className="size-3.5" />
                <span>{isEn ? "Exit" : "Thoát"}</span>
              </button>
            </div>

            {availablePets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-4">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary text-xl">
                  🐾
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-base">
                    {isEn ? "No Pet Profiles Found" : "Chưa có hồ sơ thú cưng"}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {isEn
                      ? "Please create a health passport profile for your pet before booking an appointment."
                      : "Vui lòng thiết lập hồ sơ sức khỏe cho thú cưng trước khi tiến hành đặt lịch khám."}
                  </p>
                </div>
                <Link
                  href={`/${locale}/pet-health-setup`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                >
                  <Plus className="size-4" />
                  <span>{isEn ? "Create Pet Profile" : "Thiết lập hồ sơ thú cưng"}</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {isEn
                      ? "Choose Clinic / Spa / Shop:"
                      : "Chọn phòng khám, spa hoặc cửa hàng:"}
                  </label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {isEn
                      ? `${filteredClinics.length} venues found`
                      : `${filteredClinics.length} cơ sở có sẵn`}
                  </span>
                </div>

                {/* Search Bar for Clinic Name */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={clinicSearchQuery}
                    onChange={(e) => setClinicSearchQuery(e.target.value)}
                    placeholder={
                      isEn
                        ? "Search clinic / spa / shop by name or district..."
                        : "Tìm kiếm tên phòng khám, spa, shop hoặc quận..."
                    }
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-8 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                  />
                  {clinicSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setClinicSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold size-5 grid place-items-center rounded-full hover:bg-muted"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Scrollable List of All Available Clinics in the System */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-border/80 rounded-2xl p-2 bg-muted/20">
                  {filteredClinics.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      {isEn
                        ? "No clinics found matching your search."
                        : "Không tìm thấy phòng khám phù hợp với từ khóa."}
                    </p>
                  ) : (
                    filteredClinics.map((c) => {
                      const isSelected = clinicName.trim() === c.name.trim();
                      const isShop = c.facilityType === "shop";
                      const isSpa = c.facilityType === "spa";

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleClinicSelect(c)}
                          className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition cursor-pointer text-left ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                              : "border-border/60 bg-card hover:border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.2 text-[9px] font-black border shrink-0 ${
                                  isShop
                                    ? "bg-amber-100 dark:bg-amber-900/40 border-amber-500 text-amber-950 dark:text-amber-200"
                                    : isSpa
                                    ? "bg-purple-100 dark:bg-purple-900/40 border-purple-500 text-purple-950 dark:text-purple-200"
                                    : "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-950 dark:text-emerald-200"
                                }`}
                              >
                                {isShop
                                  ? isEn
                                    ? "Pet Shop"
                                    : "Cửa hàng Pet Shop"
                                  : isSpa
                                  ? isEn
                                    ? "Pet Spa & Hotel"
                                    : "Spa & Khách sạn thú cưng"
                                  : isEn
                                  ? "Vet Clinic"
                                  : "Phòng khám"}
                              </span>

                              <span className="font-bold text-xs text-foreground truncate">
                                {c.name}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate">
                              <MapPin className="size-3 inline mr-1 text-primary" />
                              {c.address}
                            </p>

                            <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="size-3 fill-amber-400 text-amber-400" />
                                <span>{c.rating.toFixed(1)}</span>
                              </span>
                              <span>
                                ({c.reviewCount} {isEn ? "reviews" : "đánh giá"})
                              </span>
                              {c.distanceKm !== undefined && (
                                <span>
                                  · {c.distanceKm} km {isEn ? "away" : "cách đây"}
                                </span>
                              )}
                              {c.is_24_7 && (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  · {isEn ? "24/7 ER" : "Cấp cứu 24/7"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pt-1">
                            <span
                              className={`grid size-5 place-items-center rounded-full border ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background"
                              }`}
                            >
                              {isSelected && <Check className="size-3" />}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <label className="text-xs font-bold text-foreground">
                    {isEn
                      ? "Number of Pets to Book:"
                      : "Số lượng thú cưng muốn đặt khám:"}
                  </label>

                  <span className="text-[11px] font-semibold text-primary">
                    {isEn
                      ? `${availablePets.length} pet profile${availablePets.length > 1 ? "s" : ""} registered`
                      : `Hồ sơ có sẵn: ${availablePets.length} bé`}
                  </span>
                </div>

                {/* Number selector buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {Array.from({ length: maxPetQuantity }, (_, i) => i + 1).map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleQuantityChange(qty)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                        petQuantity === qty
                          ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                          : "border border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span>
                        {isEn ? `${qty} Pet${qty > 1 ? "s" : ""}` : `${qty} bé`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 3: INDIVIDUAL PET SELECTION SLOTS BASED ON SELECTED QUANTITY */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>
                    {isEn
                      ? `Companion Profiles & Offered Services (${petQuantity} Slot${petQuantity > 1 ? "s" : ""}):`
                      : `Hồ sơ & Dịch vụ của từng bé (${petQuantity} bé):`}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {isEn
                      ? "Only services offered by this clinic are available"
                      : "Dịch vụ do cơ sở này cung cấp & đối chiếu an toàn từng bé"}
                  </span>
                </label>

                <div className="space-y-3">
                  {selectedPetSlots.map((slot, index) => {
                    const currentPet =
                      availablePets.find((p) => p.id === slot.petId) ||
                      availablePets[0];

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs transition hover:border-primary/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">
                            {isEn
                              ? `Companion #${index + 1}`
                              : `Bé thú cưng #${index + 1}`}
                          </span>

                          {currentPet?.microchip && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/60">
                              {currentPet.microchip}
                            </span>
                          )}
                        </div>

                        {/* Pet Picker Dropdown */}
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                            {isEn ? "Select Pet from Profiles:" : "Chọn bé từ hồ sơ:"}
                          </label>
                          <select
                            value={slot.petId}
                            onChange={(e) => handleSlotPetChange(index, e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-hidden"
                          >
                            {availablePets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (
                                {p.breed ||
                                  (isEn ? "Companion Pet" : "Thú cưng")}
                                {p.age ? ` · ${p.age}` : ""})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Pet Details Snapshot with Allergy Alerts */}
                        {currentPet && (
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-2.5 text-xs space-y-1">
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                              <span>
                                {isEn ? "Breed:" : "Giống:"}{" "}
                                <strong className="text-foreground">
                                  {currentPet.breed ||
                                    (isEn ? "Not specified" : "Chưa cập nhật")}
                                </strong>
                              </span>
                              <span>·</span>
                              <span>
                                {isEn ? "Birthdate:" : "Ngày sinh:"}{" "}
                                <strong className="text-foreground">
                                  {formatBirthdate(currentPet.birthDate || currentPet.age, isEn)}
                                </strong>
                              </span>
                              {currentPet.weightKg && (
                                <>
                                  <span>·</span>
                                  <span>
                                    {isEn ? "Weight:" : "Cân nặng:"}{" "}
                                    <strong className="text-foreground">
                                      {currentPet.weightKg} kg
                                    </strong>
                                  </span>
                                </>
                              )}
                            </div>

                            {currentPet.allergies && currentPet.allergies.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-bold text-destructive">
                                  {isEn ? "Allergy Warning:" : "Cảnh báo dị ứng:"}
                                </span>
                                {currentPet.allergies.map((al, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive"
                                  >
                                    {al}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Service for this pet - DYNAMIC CLINIC OFFERINGS */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-muted-foreground">
                              {isEn
                                ? `Service offered by ${currentSelectedClinic?.name || "venue"}:`
                                : `Dịch vụ tại ${currentSelectedClinic?.name || "cơ sở"}:`}
                            </label>
                            <span className="text-[10px] font-semibold text-primary">
                              {offeredServices.length} {isEn ? "available" : "dịch vụ có sẵn"}
                            </span>
                          </div>

                          <select
                            value={slot.service}
                            onChange={(e) =>
                              handleSlotServiceChange(index, e.target.value)
                            }
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
                          >
                            {offeredServices.map((srv) => (
                              <option key={srv.name} value={srv.name}>
                                {srv.name} ({srv.duration_minutes} {isEn ? "mins" : "phút"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    {tA("date")}
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">
                      {tA("timeSlot")}
                    </label>
                    {isFree && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Giờ vàng Premium
                      </span>
                    )}
                  </div>
                  <select
                    value={bookingTime}
                    onChange={(e) => handleTimeSlotChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="08:00" className="font-semibold text-amber-600">
                      08:00 - {isEn ? "Priority Early Slot (Premium)" : "Ưu tiên sáng sớm (Premium)"}
                    </option>
                    <option value="08:30">08:30 - {tA("timeMorning")}</option>
                    <option value="09:30">09:30 - {tA("timeMorning")}</option>
                    <option value="10:30">10:30 - {tA("timeMorning")}</option>
                    <option value="11:30" className="font-semibold text-amber-600">
                      11:30 - {isEn ? "Priority Golden Slot (Premium)" : "Ưu tiên trưa vàng (Premium)"}
                    </option>
                    <option value="14:00">14:00 - {tA("timeAfternoon")}</option>
                    <option value="15:30">15:30 - {tA("timeAfternoon")}</option>
                    <option value="17:00">17:00 - {tA("timeEvening")}</option>
                    <option value="18:00" className="font-semibold text-amber-600">
                      18:00 - {isEn ? "Priority Evening Slot (Premium)" : "Ưu tiên tối vàng (Premium)"}
                    </option>
                  </select>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {tA("notesLabel")}
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  placeholder={tA("notesPlaceholder")}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs sm:text-sm font-semibold hover:bg-muted transition cursor-pointer"
                >
                  <X className="size-4 text-muted-foreground" />
                  <span>{isEn ? "Exit / Cancel" : "Thoát / Huỷ"}</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow hover:opacity-90 transition cursor-pointer"
                >
                  <Check className="size-4" />
                  <span>{tA("confirmBooking")}</span>
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      )}

      {/* Priority Slot Upgrade Modal for Free Tier */}
      {showPriorityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  <Star className="size-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    <Sparkles className="size-3" /> 89.000 ₫/tháng
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {isEn ? "Priority Slot - Premium Only" : "Khung giờ vàng ưu tiên (Premium)"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPriorityModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {isEn
                ? "Early (08:00), Lunchtime (11:30), and Evening prime slots (18:00) are reserved exclusively for PawCare Premium members. Upgrade to get instant priority booking without waiting!"
                : "Khung giờ sớm (08:00), giờ trưa vàng (11:30) và giờ tối cao điểm (18:00) là đặc quyền giữ chỗ riêng cho thành viên PawCare Premium. Nâng cấp ngay để đặt lịch ưu tiên không phải chờ đợi!"}
            </p>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
              <div className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                <span>{isEn ? "Priority Booking Benefits" : "Quyền lợi đặt lịch Premium"}</span>
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{isEn ? "Access to all peak and early-morning slots" : "Tiếp cận mọi khung giờ cao điểm và sáng sớm"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{isEn ? "Direct assignment to chief duty veterinarians" : "Ưu tiên xếp bác sĩ chuyên khoa trưởng ca"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{isEn ? "Zero waiting time at clinic reception" : "Thủ tục tiếp nhận nhanh, không chờ đợi"}</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Link
                href={`/${locale}/owner/billing`}
                onClick={() => setShowPriorityModal(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition text-center shadow-md shadow-primary/25 cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>{isEn ? "Upgrade Premium (89k/mo)" : "Nâng cấp Premium (89k/tháng)"}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowPriorityModal(false);
                  setBookingTime("09:30");
                }}
                className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                {isEn ? "Use Standard Slot" : "Chọn giờ thường"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
