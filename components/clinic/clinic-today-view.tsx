"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PatientCommandPalette, type PatientLookupResult } from "./patient-command-palette";
import { CameraBarcodeScanner } from "./camera-barcode-scanner";
import { PatientTimelineView } from "./patient-timeline-view";
import { ClinicInsightsView } from "./clinic-insights-view";
import { useTranslations } from "next-intl";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface QueuePatient {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  ownerName: string;
  ownerPhone: string;
  microchip: string;
  appointmentTime: string;
  service: string;
  status: "waiting" | "in_consultation" | "completed";
  rabiesValid: boolean;
  notes?: string;
}

interface SosAlert {
  id: string;
  dispatchId: string;
  petName: string;
  species: string;
  ownerName: string;
  ownerPhone: string;
  emergencyType: string;
  distanceBand: string;
  urgency: string;
  distanceKm: number;
  etaMinutes: number;
  location: string;
  timeAgo: string;
  status: "pending" | "accepted" | "declined";
  arrivalStatus?: "accepted" | "on_the_way" | "arrived";
  photoUrl?: string | null;
}

const getInitialQueue = (isVi: boolean): QueuePatient[] => [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Mochi",
    species: "dog",
    breed: isVi ? "Corgi Wales Pembroke" : "Pembroke Welsh Corgi",
    ownerName: isVi ? "Trần Anh Khoa" : "Tran Anh Khoa",
    ownerPhone: "0912 345 678",
    microchip: "982000412345678",
    appointmentTime: "09:00",
    service: isVi ? "Tiêm phòng dại & 7 bệnh định kỳ" : "Routine Rabies & 5-in-1 Vaccine",
    status: "waiting",
    rabiesValid: true,
    notes: isVi ? "Đến hẹn tiêm nhắc lại hàng năm." : "Annual booster due.",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: isVi ? "Bơ" : "Bo",
    species: "cat",
    breed: isVi ? "Mèo Anh lông ngắn (Golden)" : "British Shorthair (Golden)",
    ownerName: isVi ? "Lê Hoàng Yến" : "Le Hoang Yen",
    ownerPhone: "0987 654 321",
    microchip: "982000499887766",
    appointmentTime: "09:30",
    service: isVi ? "Khám da liễu & tẩy giun" : "Dermatology Exam & Deworming",
    status: "in_consultation",
    rabiesValid: true,
    notes: isVi ? "Ngứa vùng cổ, rụng lông rải rác." : "Itching around neck.",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Lu",
    species: "dog",
    breed: isVi ? "Poodle Toy" : "Toy Poodle",
    ownerName: isVi ? "Phạm Minh Đức" : "Pham Minh Duc",
    ownerPhone: "0903 112 233",
    microchip: "982000411223344",
    appointmentTime: "10:15",
    service: isVi ? "Tiêm nhắc giun tim ProHeart 12" : "ProHeart 12 Heartworm Booster",
    status: "waiting",
    rabiesValid: false,
    notes: isVi ? "Kiểm tra trước khi tiêm phòng dại." : "Pre-vaccination checkup.",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    name: "Miu Miu",
    species: "cat",
    breed: isVi ? "Mèo Ta tam thể" : "Domestic Calico Cat",
    ownerName: isVi ? "Nguyễn Thu Trang" : "Nguyen Thu Trang",
    ownerPhone: "0934 889 900",
    microchip: "982000477665544",
    appointmentTime: "08:30",
    service: isVi ? "Tái khám sau triệt sản" : "Post-Neuter Follow-up Checkup",
    status: "completed",
    rabiesValid: true,
  },
];

export function ClinicTodayView({
  clinicName: propClinicName,
  locale = "vi",
}: {
  clinicName?: string;
  locale?: string;
}) {
  const isVi = locale === "vi";
  const clinicName =
    propClinicName ||
    (isVi ? "Phòng Khám Thú Y PawCare Partner" : "PawCare Partner Veterinary Clinic");
  const tSos = useTranslations("clinicSos");

  const [activeTab, setActiveTab] = useState<"today" | "insights">("today");
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [queue] = useState<QueuePatient[]>(() => getInitialQueue(isVi));
  const [queueFilter, setQueueFilter] = useState<"all" | "waiting" | "in_consultation" | "completed">("all");

  const [sosAlert, setSosAlert] = useState<SosAlert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sosError, setSosError] = useState(false);
  const [emergencyClinics, setEmergencyClinics] = useState<
    Array<{
      clinic_id: string;
      clinic_name: string;
      supports_24h: boolean;
      supports_24h_requested?: boolean;
      emergency_status: "online" | "offline" | "busy";
      latitude: number | null;
      longitude: number | null;
      is_admin: boolean;
    }>
  >([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [clinicLatitude, setClinicLatitude] = useState("");
  const [clinicLongitude, setClinicLongitude] = useState("");
  const [clinicSettingsError, setClinicSettingsError] = useState(false);
  const [sosRefreshVersion, setSosRefreshVersion] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/clinic/sos", { cache: "no-store" });
        if (!response.ok) throw new Error("inbox");
        const payload = (await response.json()) as {
          dispatches: Array<{
            request_id: string;
            dispatch_id: string;
            species: string;
            symptom_chips: string[];
            urgency: string | null;
            distance_band: string;
          }>;
        };
        if (!active) return;
        const item = payload.dispatches[0];
        setSosAlert(
          item
            ? {
                id: item.request_id,
                dispatchId: item.dispatch_id,
                petName: isVi ? "Bơ" : "Bo",
                species:
                  item.species === "cat"
                    ? isVi ? "Mèo" : "Cat"
                    : item.species === "dog"
                    ? isVi ? "Chó" : "Dog"
                    : item.species,
                ownerName: "Trần Bảo Nam",
                ownerPhone: "",
                emergencyType: item.symptom_chips
                  .map((c) => {
                    const dict: Record<string, string> = {
                      poisoning: isVi ? "Ngộ độc" : "Poisoning",
                      breathing: isVi ? "Khó thở" : "Breathing difficulty",
                      bleeding: isVi ? "Chảy máu" : "Bleeding",
                      seizure: isVi ? "Co giật" : "Seizure",
                      trauma: isVi ? "Chấn thương" : "Trauma",
                      heatstroke: isVi ? "Sốc nhiệt" : "Heatstroke",
                      other: isVi ? "Khẩn cấp khác" : "Other emergency",
                    };
                    return dict[c] || c;
                  })
                  .join(", "),
                distanceKm: 1.4,
                etaMinutes: 6,
                location: isVi ? "124-126 Pasteur, Quận 1" : "District 1, HCMC",
                timeAgo: isVi ? "Vừa xong" : "Just now",
                distanceBand:
                  item.distance_band === "within_2_km"
                    ? isVi ? "Trong bán kính < 2 km" : "within 2 km"
                    : item.distance_band === "within_5_km"
                    ? isVi ? "Trong bán kính < 5 km" : "within 5 km"
                    : item.distance_band,
                urgency:
                  item.urgency === "emergency"
                    ? isVi ? "Khẩn cấp" : "Emergency"
                    : item.urgency === "urgent"
                    ? isVi ? "Ưu tiên cao" : "Urgent"
                    : item.urgency ?? (isVi ? "Khẩn cấp" : "Urgent"),
                status: "pending",
              }
            : null
        );
        setSosError(false);
      } catch {
        if (active) setSosError(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isVi, sosRefreshVersion]);

  useEffect(() => {
    let client: ReturnType<typeof createSupabaseClient>;
    try {
      client = createSupabaseClient();
    } catch {
      return;
    }
    const channel = client
      .channel("clinic-sos-dispatches")
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_dispatches" }, () =>
        setSosRefreshVersion((value) => value + 1)
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const heartbeat = async () => {
      try {
        const response = await fetch("/api/clinic/sos/clinics", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { clinics: typeof emergencyClinics };
        if (active) {
          setEmergencyClinics(result.clinics);
          setSelectedClinicId((current) => current || result.clinics[0]?.clinic_id || "");
          if (!clinicLatitude && result.clinics[0]?.latitude !== null)
            setClinicLatitude(String(result.clinics[0]?.latitude ?? ""));
          if (!clinicLongitude && result.clinics[0]?.longitude !== null)
            setClinicLongitude(String(result.clinics[0]?.longitude ?? ""));
        }
        for (const clinic of result.clinics) {
          if (clinic.supports_24h && clinic.emergency_status !== "offline") {
            void fetch("/api/clinic/sos/heartbeat", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ clinicId: clinic.clinic_id, status: clinic.emergency_status }),
            });
          }
        }
      } catch {}
    };
    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [clinicLatitude, clinicLongitude]);

  const playSosChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(650, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const handleAcceptSos = async () => {
    if (!sosAlert) return;
    const response = await fetch(`/api/sos/${sosAlert.id}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dispatchId: sosAlert.dispatchId }),
    });
    if (response.status === 409) {
      setSosAlert(null);
      return;
    }
    if (!response.ok) {
      setSosError(true);
      return;
    }
    const result = (await response.json()) as {
      details: { latitude: number; longitude: number; owner_phone: string | null } | null;
      photoUrl?: string | null;
    };
    let details = result.details;
    let photoUrl = result.photoUrl ?? null;
    if (!details) {
      const retry = await fetch(`/api/sos/${sosAlert.id}/accepted-details`, { cache: "no-store" });
      if (retry.ok) {
        const retryData = (await retry.json()) as { details: typeof details; photoUrl?: string | null };
        details = retryData.details;
        photoUrl = retryData.photoUrl ?? null;
      }
    }
    setSosAlert({
      ...sosAlert,
      status: "accepted",
      arrivalStatus: "accepted",
      photoUrl,
      location: details ? `${details.latitude.toFixed(5)}, ${details.longitude.toFixed(5)}` : "",
      ownerPhone: details?.owner_phone ?? "",
    });
  };

  const updateSosArrival = async (status: "on_the_way" | "arrived") => {
    if (!sosAlert) return;
    const response = await fetch(`/api/clinic/sos/requests/${sosAlert.id}/progress`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setSosError(true);
      return;
    }
    setSosAlert((current) => (current ? { ...current, arrivalStatus: status } : null));
  };

  const handleDeclineSos = async () => {
    if (!sosAlert) return;
    const response = await fetch(`/api/clinic/sos/${sosAlert.dispatchId}/decline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.ok) setSosAlert(null);
    else setSosError(true);
  };

  const changeEmergencyStatus = async (status: "online" | "offline" | "busy") => {
    if (!selectedClinicId) return;
    const response = await fetch("/api/clinic/sos/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicId: selectedClinicId, status }),
    });
    if (!response.ok) {
      setClinicSettingsError(true);
      return;
    }
    setClinicSettingsError(false);
    setEmergencyClinics((items) =>
      items.map((clinic) =>
        clinic.clinic_id === selectedClinicId ? { ...clinic, emergency_status: status } : clinic
      )
    );
  };

  const saveEmergencySettings = async (supports24h: boolean) => {
    if (!selectedClinicId) return;
    const latitude = clinicLatitude === "" ? null : Number(clinicLatitude);
    const longitude = clinicLongitude === "" ? null : Number(clinicLongitude);
    const response = await fetch("/api/clinic/sos/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicId: selectedClinicId, supports24h, latitude, longitude }),
    });
    if (!response.ok) {
      setClinicSettingsError(true);
      return;
    }
    setClinicSettingsError(false);
    const refresh = await fetch("/api/clinic/sos/clinics", { cache: "no-store" });
    if (refresh.ok) {
      const result = (await refresh.json()) as { clinics: typeof emergencyClinics };
      setEmergencyClinics(result.clinics);
    }
  };

  const handleBarcodeOrQrDetected = (result: { code: string; catalogItem?: any }) => {
    const foundInQueue = queue.find(
      (p) => result.code.includes(p.id) || result.code.includes(p.microchip)
    );
    setSelectedPatient(foundInQueue || queue[0]);
  };

  const lookupPatients: PatientLookupResult[] = queue.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    microchip: p.microchip,
    ownerName: p.ownerName,
    ownerPhone: p.ownerPhone,
    rabiesValid: p.rabiesValid,
  }));

  const filteredQueue =
    queueFilter === "all" ? queue : queue.filter((p) => p.status === queueFilter);

  if (selectedPatient) {
    return (
      <PatientTimelineView
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
        locale={locale}
      />
    );
  }

  return (
    <>
      <PatientCommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onSelectPatient={(p) => {
          const match = queue.find((q) => q.id === p.id);
          if (match) setSelectedPatient(match);
          else {
            setSelectedPatient({
              id: p.id,
              name: p.name,
              species: p.species,
              breed: p.breed || "",
              ownerName: p.ownerName,
              ownerPhone: p.ownerPhone,
              microchip: p.microchip || "",
              appointmentTime: isVi ? "Vãng lai" : "Walk-in",
              service: isVi ? "Khám & tiêm chủng" : "Exam & Vaccination",
              status: "waiting",
              rabiesValid: p.rabiesValid,
            });
          }
        }}
        onOpenScanner={() => setShowScanner(true)}
        patients={lookupPatients}
        locale={locale}
      />

      {showScanner && (
        <CameraBarcodeScanner
          onDetected={handleBarcodeOrQrDetected}
          onClose={() => setShowScanner(false)}
          locale={locale}
        />
      )}

      <div className="space-y-5 max-w-5xl mx-auto pb-20">
        {/* Header Bar */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-bold text-xl sm:text-2xl text-foreground">
                  {clinicName}
                </h1>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  {isVi ? "Trực tuyến 24/7" : "Live 24/7"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isVi
                  ? "Tiếp nhận khám bệnh, tiêm chủng và điều phối cấp cứu trong ca trực."
                  : "Ready for patient intake, vaccinations, and 24/7 emergency dispatch."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPalette(true)}
                className="min-h-9 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
              >
                {isVi ? "Tìm nhanh (Cmd+K)" : "Search (Cmd+K)"}
              </button>

              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
              >
                {isVi ? "Quét mã" : "Scan"}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground font-medium">
                {isVi ? "Trạng thái SOS:" : "Station availability:"}
              </span>
              {emergencyClinics.length > 0 ? (
                <div className="flex items-center gap-2">
                  <select
                    aria-label={tSos("availability")}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
                    value={
                      emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                        ?.emergency_status ?? "online"
                    }
                    onChange={(event) =>
                      void changeEmergencyStatus(event.target.value as "online" | "offline" | "busy")
                    }
                  >
                    <option value="online">{isVi ? "Sẵn sàng (Online 24/7)" : "Online 24/7"}</option>
                    <option value="busy">{isVi ? "Đang bận (Busy)" : "Busy"}</option>
                    <option value="offline">{isVi ? "Tạm nghỉ (Offline)" : "Offline"}</option>
                  </select>
                  <details className="text-xs relative">
                    <summary className="cursor-pointer rounded-lg border border-border px-2.5 py-1 font-semibold text-[11px] text-muted-foreground hover:text-foreground">
                      {tSos("settings")}
                    </summary>
                    <div className="absolute z-20 mt-2 grid w-72 gap-2 rounded-xl border border-border bg-card p-3 shadow-lg">
                      <label className="flex items-center gap-2 text-[11px]">
                        <input
                          type="checkbox"
                          checked={Boolean(
                            emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                              ?.supports_24h ||
                              emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                                ?.supports_24h_requested
                          )}
                          disabled={
                            !emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                              ?.is_admin
                          }
                          onChange={(event) => void saveEmergencySettings(event.target.checked)}
                        />
                        {tSos("supports24h")}
                      </label>
                      <label className="grid gap-1 text-[11px]">
                        {tSos("latitude")}
                        <input
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          value={clinicLatitude}
                          disabled={
                            !emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                              ?.is_admin
                          }
                          onChange={(event) => setClinicLatitude(event.target.value)}
                          className="min-h-8 rounded-lg border border-border bg-background px-2"
                        />
                      </label>
                      <label className="grid gap-1 text-[11px]">
                        {tSos("longitude")}
                        <input
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          value={clinicLongitude}
                          disabled={
                            !emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                              ?.is_admin
                          }
                          onChange={(event) => setClinicLongitude(event.target.value)}
                          className="min-h-8 rounded-lg border border-border bg-background px-2"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={
                          !emergencyClinics.find((clinic) => clinic.clinic_id === selectedClinicId)
                            ?.is_admin
                        }
                        onClick={() =>
                          void saveEmergencySettings(
                            Boolean(
                              emergencyClinics.find(
                                (clinic) => clinic.clinic_id === selectedClinicId
                              )?.supports_24h
                            )
                          )
                        }
                        className="min-h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                      >
                        {tSos("save")}
                      </button>
                    </div>
                  </details>
                  {clinicSettingsError && (
                    <p role="alert" className="text-xs text-destructive">
                      {tSos("saveError")}
                    </p>
                  )}
                </div>
              ) : (
                <span className="rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold px-2 py-0.5 text-[11px]">
                  {isVi ? "Trực tiếp nhận 24/7" : "Active 24/7"}
                </span>
              )}
            </div>

            <Link
              href={`/${locale}/clinic/sos-settings`}
              className="font-semibold text-primary hover:underline text-xs"
            >
              {isVi ? "Cài đặt vị trí SOS" : "SOS location settings"}
            </Link>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "today"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {isVi ? "Hôm nay" : "Today"} ({queue.filter((q) => q.status !== "completed").length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("insights")}
            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeTab === "insights"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {isVi ? "Chỉ số giữ chân" : "Insights"}
          </button>
        </div>

        {activeTab === "today" ? (
          <div className="space-y-5">
            {sosError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs sm:text-sm text-foreground flex items-center justify-between gap-3"
              >
                <span>
                  {isVi
                    ? "Không thể kết nối hộp thư SOS. Đang thử lại..."
                    : "Could not connect to SOS inbox. Retrying..."}
                </span>
                <button
                  type="button"
                  onClick={() => setSosRefreshVersion((v) => v + 1)}
                  className="rounded-lg border border-destructive/30 bg-card px-3 py-1 text-xs font-semibold cursor-pointer"
                >
                  {isVi ? "Tải lại" : "Reload"}
                </button>
              </div>
            )}

            {sosAlert && sosAlert.status === "accepted" && (
              <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      {isVi ? "Đã tiếp nhận yêu cầu SOS" : tSos("acceptedTitle")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isVi ? "Bệnh nhân:" : "Patient:"} <strong>{sosAlert.petName}</strong> ({sosAlert.species}) · {sosAlert.emergencyType}
                    </p>
                  </div>

                  <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 self-start sm:self-auto">
                    {sosAlert.arrivalStatus === "arrived"
                      ? isVi ? "Đã đến cơ sở" : "Arrived"
                      : sosAlert.arrivalStatus === "on_the_way"
                      ? isVi ? "Đang di chuyển" : "On the way"
                      : isVi ? "Chờ chủ nuôi di chuyển" : "Waiting arrival"}
                  </span>
                </div>

                <div className="rounded-lg border border-border bg-card p-3.5 text-xs grid gap-1.5 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">{isVi ? "Điện thoại:" : "Phone:"}</span>{" "}
                    <strong className="text-foreground tabular-nums">{sosAlert.ownerPhone || "0912 345 678"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{isVi ? "Vị trí:" : "Location:"}</span>{" "}
                    <strong className="text-foreground">{sosAlert.location || "Quận 1"}</strong>
                  </div>
                </div>

                {sosAlert.photoUrl && (
                  <img
                    src={sosAlert.photoUrl}
                    alt={tSos("ownerPhotoAlt")}
                    className="max-h-56 rounded-xl object-contain border border-border"
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {sosAlert.arrivalStatus !== "arrived" && (
                    <button
                      type="button"
                      onClick={() =>
                        void updateSosArrival(
                          sosAlert.arrivalStatus === "on_the_way" ? "arrived" : "on_the_way"
                        )
                      }
                      className="min-h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 text-xs font-semibold text-white cursor-pointer"
                    >
                      {sosAlert.arrivalStatus === "on_the_way"
                        ? isVi ? "Đánh dấu đã đến" : tSos("markArrived")
                        : isVi ? "Đánh dấu đang trên đường" : tSos("markOnWay")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSosAlert(null)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold hover:underline cursor-pointer"
                  >
                    {isVi ? "Đóng ca" : "Close case"}
                  </button>
                </div>
              </div>
            )}

            {sosAlert && sosAlert.status === "pending" && (
              <div role="alert" aria-live="assertive" className="rounded-xl border-2 border-destructive/60 bg-destructive/5 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground uppercase">
                        {isVi ? "Yêu cầu SOS" : "Urgent SOS"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{sosAlert.distanceBand}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tSos("disclaimer")}</p>
                    <h3 className="font-display font-bold text-base text-foreground">
                      {sosAlert.petName} ({sosAlert.species}) · {sosAlert.emergencyType}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAcceptSos}
                      className="min-h-10 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground cursor-pointer"
                    >
                      {isVi ? "Tiếp nhận" : "Accept"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineSos}
                      className="min-h-10 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-muted-foreground cursor-pointer"
                    >
                      {isVi ? "Từ chối" : "Decline"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        if (!soundEnabled) playSosChime();
                      }}
                      className="min-h-10 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground cursor-pointer"
                    >
                      {soundEnabled ? (isVi ? "Chuông: Bật" : "Sound: On") : (isVi ? "Chuông: Tắt" : "Sound: Off")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!sosAlert && (
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground">
                    {isVi ? "Hộp thư tiếp nhận SOS 24/7" : "24/7 SOS Inbox"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isVi
                      ? "Sẵn sàng nhận yêu cầu khẩn cấp trong bán kính 5 km. Hiện chưa có ca đang chờ."
                      : "Ready to receive emergency requests within 5 km. No pending requests."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSosRefreshVersion((v) => v + 1)}
                  className="min-h-9 rounded-lg border border-border bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shrink-0"
                >
                  {isVi ? "Tải lại" : "Refresh"}
                </button>
              </div>
            )}

            {/* Today's Queue */}
            <Card className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-foreground">
                    {isVi ? "Hàng đợi khám trong ngày" : "Today's patient queue"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isVi ? "Chọn bệnh nhân để mở dòng thời gian y bạ và tiêm chủng." : "Select a patient to view timeline."}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto">
                  {(["all", "waiting", "in_consultation", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setQueueFilter(st)}
                      className={`rounded-lg px-3 py-1.5 transition cursor-pointer shrink-0 ${
                        queueFilter === st
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st === "all"
                        ? isVi ? "Tất cả" : "All"
                        : st === "waiting"
                        ? isVi ? "Chờ khám" : "Waiting"
                        : st === "in_consultation"
                        ? isVi ? "Đang khám" : "Consulting"
                        : isVi ? "Hoàn tất" : "Done"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-border">
                {filteredQueue.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-semibold tabular-nums text-primary shrink-0">
                        {patient.appointmentTime}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{patient.name}</span>
                          <span className="text-xs text-muted-foreground">({patient.breed})</span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              patient.rabiesValid
                                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {patient.rabiesValid ? (isVi ? "Dại: Hợp lệ" : "Rabies OK") : (isVi ? "Cần tiêm dại" : "Rabies due")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {patient.service} · {patient.ownerName} ·{" "}
                          <span className="tabular-nums">{patient.ownerPhone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(patient)}
                        className="min-h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
                      >
                        {isVi ? "Khám bệnh" : "Consult"}
                      </button>
                      <Link
                        href={`/${locale}/clinic/records`}
                        className="inline-flex min-h-8 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary transition"
                      >
                        {isVi ? "Hồ sơ" : "Records"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <ClinicInsightsView locale={locale} />
        )}
      </div>
    </>
  );
}
