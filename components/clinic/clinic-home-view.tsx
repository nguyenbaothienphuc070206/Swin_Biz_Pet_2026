"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  localizeAppointment,
  localizePersonName,
  localizeBreed,
  localizeServiceName,
  localizePetName,
} from "@/modules/i18n/localize-data";

interface StoredClinic {
  name: string;
  licenseNumber: string;
  chiefVet: string;
  facilityType: string;
  address: string;
  city: string;
  phone: string;
  hotline?: string;
  openHours: string;
  closeHours: string;
  is247: boolean;
  services: string[];
}

interface SchedulePreviewItem {
  id: string;
  time: string;
  petName: string;
  breed: string;
  ownerName: string;
  service: string;
  status: "pending" | "confirmed" | "waiting" | "in_progress" | "completed" | "canceled";
}

export function ClinicHomeView({
  clinicName,
}: {
  clinicName?: string;
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [clinic, setClinic] = useState<StoredClinic | null>(null);
  const [dutyStatus, setDutyStatus] = useState<"online" | "busy" | "offline">("online");

  const [sosCase, setSosCase] = useState<{
    id: string;
    time: string;
    petName: string;
    ownerName: string;
    phone: string;
    distanceKm: number;
    symptoms: string;
    status: "pending" | "accepted";
    hasAllergy: string;
    vaccines: string;
    address: string;
  }>({
    id: "SOS-8821",
    time: isEn ? "23:42 (Night shift)" : "23:42 (Ca trực đêm)",
    petName: isEn ? "Bo (Poodle, 3.8 kg)" : "Bé Bơ (Poodle, 3.8 kg)",
    ownerName: isEn ? "Nguyen Van An" : "Nguyễn Văn An",
    phone: "090 912 3456",
    distanceKm: 1.2,
    symptoms: isEn
      ? "Suspected chemical ingestion, repeated vomiting, tremors"
      : "Nghi nuốt chất tẩy rửa, nôn liên tục, run giật",
    status: "pending",
    hasAllergy: isEn ? "Penicillin sensitivity" : "Dị ứng Penicillin",
    vaccines: isEn ? "Rabies & core vaccines valid" : "Đã tiêm đủ Dại & 7 bệnh",
    address: isEn
      ? "150 Nguyen Thi Minh Khai, District 1"
      : "150 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1",
  });

  const [sosNotice, setSosNotice] = useState<string | null>(null);
  const [todayQueue, setTodayQueue] = useState<SchedulePreviewItem[]>([
    {
      id: "q-1",
      time: "09:00",
      petName: "Mochi",
      breed: isEn ? "Pembroke Welsh Corgi" : "Corgi Wales",
      ownerName: isEn ? "Tran Anh Khoa" : "Trần Anh Khoa",
      service: isEn ? "Annual Rabies & 5-in-1 booster" : "Tiêm nhắc Dại & 7 bệnh định kỳ",
      status: "waiting",
    },
    {
      id: "q-2",
      time: "09:30",
      petName: isEn ? "Bo" : "Bơ",
      breed: isEn ? "British Shorthair" : "Mèo Anh lông ngắn",
      ownerName: isEn ? "Le Hoang Yen" : "Lê Hoàng Yến",
      service: isEn ? "Dermatology exam & deworming" : "Khám da liễu & tẩy giun",
      status: "in_progress",
    },
    {
      id: "q-3",
      time: "10:15",
      petName: "Lu",
      breed: isEn ? "Toy Poodle" : "Poodle Toy",
      ownerName: isEn ? "Pham Minh Duc" : "Phạm Minh Đức",
      service: isEn ? "ProHeart 12 heartworm prevention" : "Tiêm phòng giun tim ProHeart 12",
      status: "pending",
    },
    {
      id: "q-4",
      time: "11:00",
      petName: "Miu Miu",
      breed: isEn ? "Domestic Calico" : "Mèo Ta tam thể",
      ownerName: isEn ? "Nguyen Thu Trang" : "Nguyễn Thu Trang",
      service: isEn ? "Post-spay follow-up check" : "Tái khám sau triệt sản",
      status: "completed",
    },
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedProfile =
        localStorage.getItem("pawcare-clinic-profile") ||
        localStorage.getItem("pawcare-registered-clinic");
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        if (parsed?.name) setClinic(parsed);
      }
    } catch {}

    const syncQueue = () => {
      try {
        const storedApts = localStorage.getItem("pawcare-appointments");
        if (storedApts) {
          const parsed = JSON.parse(storedApts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTodayQueue(
              parsed.slice(0, 4).map((rawApt: any) => {
                const apt = localizeAppointment(rawApt, isEn);
                return {
                  id: apt.id,
                  time: apt.time || "09:30",
                  petName: localizePetName(apt.petName || "Bơ", isEn),
                  breed: localizeBreed(
                    apt.pets?.[0]?.breed || (rawApt as any).breed,
                    apt.pets?.[0]?.species,
                    isEn
                  ),
                  ownerName: localizePersonName(
                    apt.ownerName || (isEn ? "Pet owner" : "Chủ nuôi"),
                    isEn
                  ),
                  service: localizeServiceName(
                    apt.service || (isEn ? "General checkup" : "Khám tổng quát"),
                    isEn
                  ),
                  status: apt.status || "confirmed",
                };
              })
            );
          }
        }
      } catch {}
    };
    syncQueue();
    window.addEventListener("pawcare-appointments-updated", syncQueue);
    window.addEventListener("storage", syncQueue);
    return () => {
      window.removeEventListener("pawcare-appointments-updated", syncQueue);
      window.removeEventListener("storage", syncQueue);
    };
  }, [isEn]);

  // Sync with incoming live SOS dispatches
  useEffect(() => {
    const syncSos = () => {
      try {
        const stored = localStorage.getItem("pawcare-active-sos-lead");
        if (stored) {
          const lead = JSON.parse(stored);
          setSosCase({
            id: lead.id || "SOS-LIVE",
            time: lead.timestamp || (isEn ? "Just now" : "Vừa tiếp nhận"),
            petName: lead.petName || (isEn ? "Bo (Poodle, 3.8 kg)" : "Bé Bơ (Poodle, 3.8 kg)"),
            ownerName: lead.ownerName || (isEn ? "Nguyen Van An" : "Nguyễn Văn An"),
            phone: lead.ownerPhone || "090 912 3456",
            distanceKm: lead.distanceKm || 1.2,
            symptoms: lead.symptoms || (isEn ? "Acute poisoning signs" : "Dấu hiệu ngộ độc cấp"),
            status: lead.status === "accepted" ? "accepted" : "pending",
            hasAllergy: isEn ? "Penicillin sensitivity" : "Dị ứng Penicillin",
            vaccines: isEn ? "Rabies & core vaccines valid" : "Đã tiêm đủ Dại & 7 bệnh",
            address: lead.address || (isEn ? "District 1, HCMC" : "Quận 1, TP. HCM"),
          });
        }
      } catch {}
    };

    syncSos();
    window.addEventListener("pawcare-sos-dispatched", syncSos);
    window.addEventListener("storage", syncSos);
    return () => {
      window.removeEventListener("pawcare-sos-dispatched", syncSos);
      window.removeEventListener("storage", syncSos);
    };
  }, [isEn]);

  const defaultClinicName = isEn
    ? "PawCare Partner Veterinary Clinic"
    : "Phòng khám Thú y PawCare Partner";
  const activeName = clinic?.name || clinicName || defaultClinicName;

  const handleAcceptSos = () => {
    setSosCase((prev) => ({ ...prev, status: "accepted" }));
    setSosNotice(
      isEn
        ? "Case accepted. Treatment room #2 is assigned and the pet owner has been notified."
        : "Đã tiếp nhận ca cấp cứu. Đã phân buồng điều trị số 2 và thông báo cho chủ nuôi."
    );

    try {
      const stored = localStorage.getItem("pawcare-active-sos-lead");
      const lead = stored ? JSON.parse(stored) : {};
      lead.status = "accepted";
      lead.acceptedBy = activeName;
      lead.dutyVet = isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường";
      localStorage.setItem("pawcare-active-sos-lead", JSON.stringify(lead));
      window.dispatchEvent(new CustomEvent("pawcare-sos-lead-accepted"));
    } catch {}

    setTimeout(() => setSosNotice(null), 6000);
  };

  const getStatusLabel = (status: SchedulePreviewItem["status"]) => {
    switch (status) {
      case "pending":
        return isEn ? "Pending review" : "Chờ xác nhận";
      case "in_progress":
        return isEn ? "In exam" : "Đang khám";
      case "completed":
        return isEn ? "Completed" : "Hoàn tất";
      case "canceled":
        return isEn ? "Declined" : "Đã từ chối";
      default:
        return isEn ? "Confirmed" : "Đã xác nhận";
    }
  };

  const getStatusClass = (status: SchedulePreviewItem["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25";
      case "in_progress":
        return "bg-primary/10 text-primary border-primary/25";
      case "completed":
        return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25";
      case "canceled":
        return "bg-destructive/10 text-destructive border-destructive/25";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {clinic?.licenseNumber
                ? `${isEn ? "License" : "GP"}: ${clinic.licenseNumber}`
                : isEn
                ? "License: GVP-8842/VET-HCM"
                : "GP: GP-8842/TY-TPHCM"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {clinic?.chiefVet
                ? `${isEn ? "Chief vet" : "BS phụ trách"}: ${clinic.chiefVet}`
                : isEn
                ? "Chief vet: Dr. Nguyen Van Cuong"
                : "BS phụ trách: BS. Nguyễn Văn Cường"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {clinic?.is247
                ? isEn ? "Open 24/7" : "Trực 24/7"
                : clinic?.openHours && clinic?.closeHours
                ? `${clinic.openHours} – ${clinic.closeHours}`
                : isEn
                ? "07:30 – 21:00 (24/7 emergency)"
                : "07:30 – 21:00 (Cấp cứu 24/7)"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{clinic?.hotline || clinic?.phone || "028 3823 4567"}</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {activeName}
          </h1>
        </div>

        {/* Duty Status & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <label className="sr-only" htmlFor="clinic-duty-status">
            {isEn ? "Emergency duty status" : "Trạng thái trực SOS"}
          </label>
          <select
            id="clinic-duty-status"
            value={dutyStatus}
            onChange={(e) => setDutyStatus(e.target.value as "online" | "busy" | "offline")}
            className="min-h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden"
          >
            <option value="online">{isEn ? "SOS Duty: Available" : "Trực SOS: Sẵn sàng"}</option>
            <option value="busy">{isEn ? "SOS Duty: Busy" : "Trực SOS: Đang bận"}</option>
            <option value="offline">{isEn ? "SOS Duty: Offline" : "Trực SOS: Tạm ngưng"}</option>
          </select>

          <Link
            href={`/${locale}/clinic/records`}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            {isEn ? "Pet records" : "Tra cứu hồ sơ"}
          </Link>

          <Link
            href={`/${locale}/clinic/appointments`}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-95 transition"
          >
            {isEn ? "Manage appointments" : "Lịch khám hôm nay"}
          </Link>
        </div>
      </header>

      {/* Quiet Operational Metrics Strip */}
      <section aria-label={isEn ? "Daily practice summary" : "Tóm tắt vận hành hôm nay"}>
        <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card lg:grid-cols-4">
          <Link href={`/${locale}/clinic/appointments`} className="block p-4 hover:bg-secondary/40 transition">
            <span className="text-xs font-medium text-muted-foreground">
              {isEn ? "Appointments today" : "Lịch khám hôm nay"}
            </span>
            <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-foreground">8</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEn ? "6 confirmed · 2 pending" : "6 đã xác nhận · 2 chờ duyệt"}
            </p>
          </Link>

          <Link href={`/${locale}/clinic/records`} className="block p-4 hover:bg-secondary/40 transition">
            <span className="text-xs font-medium text-muted-foreground">
              {isEn ? "Active inpatients" : "Lưu viện theo dõi"}
            </span>
            <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-foreground">5</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEn ? "3 post-op · 2 observation" : "3 hậu phẫu · 2 theo dõi"}
            </p>
          </Link>

          <Link href={`/${locale}/clinic/rescue`} className="block p-4 hover:bg-secondary/40 transition">
            <span className="text-xs font-medium text-muted-foreground">
              {isEn ? "Rescue cases" : "Ca cứu hộ"}
            </span>
            <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-foreground">2</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEn ? "1 awaiting estimate" : "1 chờ gửi dự toán"}
            </p>
          </Link>

          <Link href={`/${locale}/clinic/billing`} className="block p-4 hover:bg-secondary/40 transition min-w-0">
            <span className="text-xs font-medium text-muted-foreground">
              {isEn ? "Settled billing" : "Doanh thu đối soát"}
            </span>
            <p className="mt-1.5 font-display text-lg sm:text-2xl font-bold tabular-nums text-foreground truncate">
              24.500.000 ₫
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isEn ? "Current period ledger" : "Kỳ đối soát hiện tại"}
            </p>
          </Link>
        </div>
      </section>

      {/* Main Two-Column Workbench */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] items-start">
        {/* Left Column: Urgent SOS Intake + Today's Schedule */}
        <div className="space-y-6 min-w-0">
          {/* Urgent SOS Triage Intake */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {isEn ? "Incoming SOS triage" : "Tiếp nhận cấp cứu SOS"}
                  </h2>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      sosCase.status === "accepted"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {sosCase.status === "accepted"
                      ? isEn ? "Accepted" : "Đã tiếp nhận"
                      : isEn ? "Waiting intake" : "Chờ tiếp nhận"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEn
                    ? "Triage and routing details only. Does not replace in-person veterinary examination."
                    : "Thông tin sàng lọc hỗ trợ điều phối tiếp nhận, không thay thế thăm khám trực tiếp."}
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                #{sosCase.id} · {sosCase.time}
              </span>
            </div>

            {sosNotice && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-900 dark:text-emerald-200"
              >
                <span>{sosNotice}</span>
                <button
                  type="button"
                  onClick={() => setSosNotice(null)}
                  className="text-xs font-semibold hover:underline cursor-pointer shrink-0"
                >
                  {isEn ? "Dismiss" : "Đóng"}
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {sosCase.petName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isEn ? "Owner" : "Chủ nuôi"}: <span className="font-medium text-foreground">{sosCase.ownerName}</span> ·{" "}
                    <span className="tabular-nums">{sosCase.phone}</span>
                  </p>
                </div>
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground tabular-nums">
                  {sosCase.distanceKm} km ({isEn ? "~6 min" : "~6 phút"})
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <span className="text-muted-foreground block">
                    {isEn ? "Reported symptoms" : "Triệu chứng ghi nhận"}
                  </span>
                  <span className="font-semibold text-destructive block">{sosCase.symptoms}</span>
                </div>

                <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <span className="text-muted-foreground block">
                    {isEn ? "Health passport alerts" : "Lưu ý từ y bạ số"}
                  </span>
                  <span className="font-semibold text-foreground block">{sosCase.hasAllergy}</span>
                  <span className="text-muted-foreground block">{sosCase.vaccines}</span>
                </div>

                <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <span className="text-muted-foreground block">
                    {isEn ? "Pickup area" : "Khu vực di chuyển"}
                  </span>
                  <span className="font-medium text-foreground block">{sosCase.address}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <a
                  href={`tel:${sosCase.phone.replace(/\s+/g, "")}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 text-xs font-semibold text-foreground hover:bg-secondary transition"
                >
                  {isEn ? "Call owner" : "Gọi chủ nuôi"}
                </a>

                {sosCase.status !== "accepted" ? (
                  <button
                    type="button"
                    onClick={handleAcceptSos}
                    className="inline-flex min-h-10 items-center rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:brightness-95 transition cursor-pointer"
                  >
                    {isEn ? "Accept case & prepare room" : "Tiếp nhận & Chuẩn bị buồng"}
                  </button>
                ) : (
                  <span className="inline-flex min-h-10 items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {isEn ? "Treatment room #2 ready" : "Buồng tiếp nhận #2 đã sẵn sàng"}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Today's Patient Queue */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {isEn ? "Today's schedule" : "Lịch khám trong ngày"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? "Upcoming patient arrivals and active consultations"
                    : "Danh sách thú cưng đặt hẹn và đang thăm khám"}
                </p>
              </div>
              <Link
                href={`/${locale}/clinic/appointments`}
                className="text-xs font-semibold text-primary hover:underline shrink-0"
              >
                {isEn ? "View all" : "Xem tất cả"}
              </Link>
            </div>

            <div className="divide-y divide-border">
              {todayQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary tabular-nums shrink-0">
                      {item.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {item.petName}{" "}
                        <span className="font-normal text-muted-foreground">({item.breed})</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.service} · {item.ownerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStatusClass(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    <Link
                      href={`/${locale}/clinic/records`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {isEn ? "Chart" : "Hồ sơ"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Pending Shift Tasks + Practice Links */}
        <div className="space-y-6 min-w-0">
          <Card className="p-5 space-y-3.5">
            <h2 className="font-display text-base font-bold text-foreground border-b border-border pb-2.5">
              {isEn ? "Shift follow-ups" : "Việc cần xử lý trong ca"}
            </h2>
            <ul className="divide-y divide-border text-xs">
              <li className="py-2.5 first:pt-0 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {isEn ? "3 rabies certificates awaiting sign-off" : "3 chứng nhận tiêm dại chờ ký duyệt"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">Mochi · Bơ · Milu</p>
                </div>
                <Link
                  href={`/${locale}/clinic/records`}
                  className="font-semibold text-primary hover:underline shrink-0"
                >
                  {isEn ? "Review" : "Xem"}
                </Link>
              </li>

              <li className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {isEn ? "2 shared QR records to link" : "2 hồ sơ chia sẻ qua QR chờ liên kết"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">Rocky · Sam</p>
                </div>
                <Link
                  href={`/${locale}/clinic/records`}
                  className="font-semibold text-primary hover:underline shrink-0"
                >
                  {isEn ? "Open" : "Mở"}
                </Link>
              </li>

              <li className="py-2.5 last:pb-0 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {isEn ? "Appointment requests pending confirmation" : "Lịch hẹn mới chờ phòng khám xác nhận"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {isEn ? "Review time slots" : "Kiểm tra khung giờ trống"}
                  </p>
                </div>
                <Link
                  href={`/${locale}/clinic/appointments`}
                  className="font-semibold text-primary hover:underline shrink-0"
                >
                  {isEn ? "Open" : "Mở"}
                </Link>
              </li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-foreground border-b border-border pb-2.5">
              {isEn ? "Practice shortcuts" : "Công cụ phòng khám"}
            </h2>
            <nav aria-label={isEn ? "Practice shortcuts" : "Công cụ phòng khám"} className="divide-y divide-border text-sm">
              {[
                {
                  href: `/${locale}/clinic/care-plans`,
                  label: isEn ? "Care & treatment plans" : "Lập phác đồ điều trị",
                  note: isEn ? "Prescriptions & home tasks" : "Kê đơn và lịch tái khám",
                },
                {
                  href: `/${locale}/clinic/rescue`,
                  label: isEn ? "Rescue network cases" : "Mạng lưới cứu hộ",
                  note: isEn ? "Cost estimates & verification" : "Dự toán và xác nhận ca cứu trợ",
                },
                {
                  href: `/${locale}/clinic/verification`,
                  label: isEn ? "Quality verification" : "Kiểm định chất lượng",
                  note: isEn ? "Upload clinic documents" : "Nộp chứng chỉ và giấy phép",
                },
                {
                  href: `/${locale}/clinic/sos-settings`,
                  label: isEn ? "24/7 SOS location settings" : "Cài đặt vị trí trực SOS 24/7",
                  note: isEn ? "Pin clinic map coordinates" : "Cập nhật tọa độ bản đồ",
                },
                {
                  href: `/${locale}/clinic/settings`,
                  label: isEn ? "Clinic settings & preferences" : "Cài đặt vận hành phòng khám",
                  note: isEn ? "Shift hours, EMR defaults & staff security" : "Ca trực, mẫu bệnh án & bảo mật",
                },
                {
                  href: `/${locale}/clinic/billing`,
                  label: isEn ? "Billing & ledger statements" : "Viện phí & đối soát tài chính",
                  note: isEn ? "Commission & invoice exports" : "Sao kê và hóa đơn định kỳ",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-primary transition group"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground group-hover:text-primary block truncate">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {item.note}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary shrink-0">
                    {isEn ? "Open" : "Mở"}
                  </span>
                </Link>
              ))}
            </nav>
          </Card>
        </div>
      </div>
    </div>
  );
}
