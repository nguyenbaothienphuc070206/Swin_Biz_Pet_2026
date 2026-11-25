"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { getInitialSeedAppointments } from "@/modules/booking/seed-appointments";
import { localizeAppointment } from "@/modules/i18n/localize-data";

interface ClinicAppointment {
  id: string;
  time: string;
  date: string;
  petName: string;
  species: "dog" | "cat" | "other";
  breed: string;
  ownerName: string;
  ownerPhone: string;
  service: string;
  vetName: string;
  status: "waiting" | "in_progress" | "completed" | "canceled";
  rawStatus?: "pending" | "confirmed" | "completed" | "canceled" | "waiting" | "in_progress";
  notes?: string;
}

function getLocalizedClinicAppointments(locale: string): ClinicAppointment[] {
  const isEn = locale === "en";
  return getInitialSeedAppointments(isEn).map((rawApt) => {
    const apt = localizeAppointment(rawApt, isEn);
    const isCat = apt.pets?.[0]?.species === "cat";
    return {
      id: apt.id,
      time: apt.time,
      date: apt.date,
      petName: apt.petName,
      species: isCat ? "cat" : "dog",
      breed: apt.pets?.[0]?.breed || (isEn ? "Companion Pet" : "Thú cưng"),
      ownerName: apt.ownerName || (isEn ? "Pet Parent" : "Chủ nuôi"),
      ownerPhone: apt.ownerPhone || apt.clinicPhone || "028 3823 4567",
      service: apt.service,
      vetName: apt.doctor,
      status:
        apt.status === "completed"
          ? "completed"
          : apt.status === "canceled"
          ? "canceled"
          : "waiting",
      rawStatus: apt.status,
      notes: apt.notes,
    };
  });
}

export function ClinicAppointmentsView({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const tC = useTranslations("clinicAppointments");

  const [appointments, setAppointments] = useState<ClinicAppointment[]>(() =>
    getLocalizedClinicAppointments(locale)
  );
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [notice, setNotice] = useState<string | null>(null);

  // Inline decline dialog state (replaces window.prompt)
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    const loadAppointments = () => {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("pawcare-appointments");
          let rawList: any[] = [];
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rawList = parsed;
            }
          }

          if (rawList.length === 0) {
            const seed = getInitialSeedAppointments(isEn);
            rawList = seed;
            localStorage.setItem("pawcare-appointments", JSON.stringify(seed));
          }

          const mapped: ClinicAppointment[] = rawList.map((rawApt: any) => {
            const apt = localizeAppointment(rawApt, isEn);
            const isCat = apt.pets?.[0]?.species === "cat" || (apt as any).species === "cat";
            const rawStatusStr = String((apt as any).status || "confirmed");
            const rawStatus: ClinicAppointment["rawStatus"] =
              rawStatusStr === "pending" ||
              rawStatusStr === "confirmed" ||
              rawStatusStr === "completed" ||
              rawStatusStr === "canceled" ||
              rawStatusStr === "waiting" ||
              rawStatusStr === "in_progress"
                ? (rawStatusStr as ClinicAppointment["rawStatus"])
                : rawStatusStr === "declined"
                ? "canceled"
                : "confirmed";
            return {
              id: apt.id,
              time: apt.time || "10:00",
              date: apt.date || new Date().toISOString().split("T")[0],
              petName: apt.petName || (isEn ? "Bo" : "Bơ"),
              species: isCat ? "cat" : "dog",
              breed:
                apt.pets?.[0]?.breed ||
                (apt as any).breed ||
                (isEn ? "Companion Pet" : "Thú cưng"),
              ownerName: apt.ownerName || (isEn ? "Pet Parent" : "Chủ nuôi"),
              ownerPhone: apt.ownerPhone || apt.clinicPhone || "028 3823 4567",
              service:
                apt.service ||
                (isEn ? "General Wellness Exam" : "Khám sức khỏe tổng quát"),
              vetName:
                apt.doctor ||
                (apt as any).vetName ||
                (isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường"),
              status:
                rawStatusStr === "in_progress"
                  ? "in_progress"
                  : rawStatusStr === "completed"
                  ? "completed"
                  : rawStatusStr === "canceled" || rawStatusStr === "declined"
                  ? "canceled"
                  : "waiting",
              rawStatus,
              notes: apt.notes,
            };
          });
          setAppointments(mapped);
          return;
        } catch {}
      }
      setAppointments(getLocalizedClinicAppointments(locale));
    };

    loadAppointments();
    window.addEventListener("pawcare-appointments-updated", loadAppointments);
    window.addEventListener("storage", loadAppointments);
    return () => {
      window.removeEventListener("pawcare-appointments-updated", loadAppointments);
      window.removeEventListener("storage", loadAppointments);
    };
  }, [locale, isEn]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleConfirmAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, rawStatus: "confirmed" } : a))
    );

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-appointments");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((a: any) =>
              a.id === id ? { ...a, status: "confirmed" } : a
            );
            localStorage.setItem("pawcare-appointments", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("pawcare-appointments-updated"));
          }
        }
      } catch {}
    }

    showNotice(
      isEn
        ? "Appointment confirmed and notification sent to the pet owner."
        : "Đã xác nhận lịch hẹn và gửi thông báo cho chủ nuôi."
    );
  };

  const openDeclineDialog = (id: string) => {
    setDecliningId(id);
    setDeclineReason(
      isEn
        ? "Surgery schedule full during this slot. Reception will contact you to reschedule."
        : "Phòng khám kín lịch trong khung giờ này. Lễ tân sẽ liên hệ để dời lịch phù hợp."
    );
  };

  const submitDeclineAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decliningId) return;
    const reason = declineReason.trim();
    if (!reason) return;

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === decliningId ? { ...a, status: "canceled", rawStatus: "canceled", notes: reason } : a
      )
    );

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-appointments");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((a: any) =>
              a.id === decliningId ? { ...a, status: "canceled", notes: reason } : a
            );
            localStorage.setItem("pawcare-appointments", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("pawcare-appointments-updated"));
          }
        }
      } catch {}
    }

    setDecliningId(null);
    setDeclineReason("");
    showNotice(
      isEn
        ? "Appointment declined. Reason recorded for the pet owner."
        : "Đã từ chối lịch hẹn và lưu lý do gửi tới chủ nuôi."
    );
  };

  const handleResetDemoAppointments = () => {
    const initialSeed = getInitialSeedAppointments(isEn);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-appointments", JSON.stringify(initialSeed));
        window.dispatchEvent(new CustomEvent("pawcare-appointments-updated"));
      } catch {}
    }
    showNotice(
      isEn
        ? "Sample appointments restored."
        : "Đã khôi phục danh sách lịch hẹn mẫu."
    );
  };

  const handleUpdateStatus = (id: string, newStatus: ClinicAppointment["status"]) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: newStatus, rawStatus: newStatus } : a
      )
    );

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-appointments");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const mappedTarget = newStatus === "completed" ? "completed" : "in_progress";
            const updated = parsed.map((a: any) =>
              a.id === id ? { ...a, status: mappedTarget } : a
            );
            localStorage.setItem("pawcare-appointments", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("pawcare-appointments-updated"));
          }
        }
      } catch {}
    }

    const label =
      newStatus === "in_progress"
        ? tC("statusMovedInProgress")
        : newStatus === "completed"
        ? tC("statusMovedCompleted")
        : tC("statusUpdated");
    showNotice(label);
  };

  const countPending = appointments.filter((a) => a.rawStatus === "pending").length;
  const countWaiting = appointments.filter(
    (a) => a.status === "waiting" && a.rawStatus !== "pending"
  ).length;
  const countInProgress = appointments.filter((a) => a.status === "in_progress").length;
  const countCompleted = appointments.filter((a) => a.status === "completed").length;
  const countCanceled = appointments.filter(
    (a) => a.status === "canceled" || a.rawStatus === "canceled"
  ).length;

  const filtered = appointments.filter((a) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return a.rawStatus === "pending";
    if (filterStatus === "waiting")
      return a.status === "waiting" && a.rawStatus !== "pending";
    if (filterStatus === "in_progress") return a.status === "in_progress";
    if (filterStatus === "completed") return a.status === "completed";
    if (filterStatus === "canceled")
      return a.status === "canceled" || a.rawStatus === "canceled";
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <BackButton
          fallbackHref={`/${locale}/clinic`}
          label={isEn ? "Back to overview" : "Quay về tổng quan"}
          variant="pill"
          hideIcon
        />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tC("badge")}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {tC("title")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm max-w-2xl">
            {tC("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDemoAppointments}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
          >
            {isEn ? "Reset sample data" : "Khôi phục dữ liệu mẫu"}
          </button>

          <Link
            href={`/${locale}/clinic/records`}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-95 transition"
          >
            {tC("enterVax")}
          </Link>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200 sm:text-sm"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold hover:underline cursor-pointer shrink-0"
          >
            {isEn ? "Dismiss" : "Đóng"}
          </button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card sm:grid-cols-5">
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground truncate">{tC("totalToday")}</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
            {appointments.length}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {isEn ? "Pending review" : "Chờ xác nhận"}
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {countPending}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {isEn ? "Confirmed" : "Chờ khám"}
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-primary">
            {countWaiting}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground truncate">{tC("completed")}</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {countCompleted}
          </p>
        </div>
        <div className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {isEn ? "Declined" : "Từ chối / Hủy"}
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-destructive">
            {countCanceled}
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: `${tC("allFilter")} (${appointments.length})` },
            { id: "pending", label: `${isEn ? "Pending" : "Chờ xác nhận"} (${countPending})` },
            { id: "waiting", label: `${tC("waitingFilter")} (${countWaiting})` },
            { id: "in_progress", label: `${tC("inProgressFilter")} (${countInProgress})` },
            { id: "completed", label: `${tC("completedFilter")} (${countCompleted})` },
            { id: "canceled", label: `${isEn ? "Declined" : "Đã từ chối"} (${countCanceled})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground shrink-0">
          {tC("dutyDate")}:{" "}
          <strong className="text-foreground">
            {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date())}
          </strong>
        </span>
      </div>

      {/* Appointment List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-medium text-muted-foreground">
              {isEn
                ? "No appointments match the selected status."
                : "Không có lịch hẹn nào trong trạng thái này."}
            </p>
          </Card>
        ) : (
          filtered.map((apt) => {
            const isWaiting = apt.status === "waiting";
            const isInProgress = apt.status === "in_progress";
            const isCompleted = apt.status === "completed";
            const isCanceled = apt.status === "canceled" || apt.rawStatus === "canceled";

            return (
              <Card
                key={apt.id}
                className={`p-5 transition ${
                  isInProgress
                    ? "border-primary/40 bg-primary/5"
                    : isWaiting && apt.rawStatus === "pending"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : isCanceled
                    ? "border-border bg-muted/30"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground border border-border">
                      {apt.petName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums text-primary">
                          {apt.time}
                        </span>
                        <span className="text-muted-foreground" aria-hidden="true">·</span>
                        <h3 className="font-bold text-foreground truncate">
                          {apt.petName}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          ({apt.species === "cat" ? (isEn ? "Cat" : "Mèo") : (isEn ? "Dog" : "Chó")} · {apt.breed})
                        </span>

                        {isWaiting && (
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              apt.rawStatus === "pending"
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {apt.rawStatus === "pending"
                              ? isEn
                                ? "Awaiting confirmation"
                                : "Chờ phòng khám xác nhận"
                              : tC("statusWaiting")}
                          </span>
                        )}
                        {isInProgress && (
                          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                            {tC("statusInProgress")}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            {tC("statusCompleted")}
                          </span>
                        )}
                        {isCanceled && (
                          <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                            {isEn ? "Declined / Canceled" : "Đã từ chối / Hủy"}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-medium text-foreground">
                        {apt.service}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {tC("owner")}: <strong className="text-foreground font-medium">{apt.ownerName}</strong>
                        </span>
                        <a
                          href={`tel:${apt.ownerPhone.replace(/\s+/g, "")}`}
                          className="text-primary hover:underline tabular-nums font-medium"
                        >
                          {apt.ownerPhone}
                        </a>
                        <span>
                          {tC("attendingVet")}: <strong className="text-foreground font-medium">{apt.vetName}</strong>
                        </span>
                      </div>

                      {apt.notes && (
                        <p className="mt-2.5 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                          <strong className="text-foreground">
                            {isCanceled
                              ? isEn ? "Decline reason" : "Lý do từ chối"
                              : isCompleted
                              ? isEn ? "Clinical outcome" : "Kết quả khám"
                              : tC("noticeLabel")}
                            :
                          </strong>{" "}
                          {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isWaiting && apt.rawStatus === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConfirmAppointment(apt.id)}
                          className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
                        >
                          {isEn ? "Confirm" : "Xác nhận"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeclineDialog(apt.id)}
                          className="min-h-9 rounded-lg border border-destructive/40 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        >
                          {isEn ? "Decline" : "Từ chối"}
                        </button>
                      </>
                    )}
                    {isWaiting && apt.rawStatus !== "pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, "in_progress")}
                        className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
                      >
                        {tC("startExam")}
                      </button>
                    )}
                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, "completed")}
                        className="min-h-9 rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800 transition cursor-pointer"
                      >
                        {tC("finishExam")}
                      </button>
                    )}
                    <Link
                      href={`/${locale}/clinic/records`}
                      className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition"
                    >
                      {tC("viewPassport")}
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Inline Modal for Decline Reason */}
      {decliningId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDecliningId(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={submitDeclineAppointment}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-bold text-foreground">
                {isEn ? "Decline appointment" : "Từ chối lịch hẹn"}
              </h2>
              <button
                type="button"
                onClick={() => setDecliningId(null)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="decline-reason-input" className="text-xs font-semibold text-foreground block">
                {isEn ? "Reason sent to pet owner" : "Lý do gửi đến chủ nuôi"}
              </label>
              <textarea
                id="decline-reason-input"
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecliningId(null)}
                className="min-h-9 rounded-lg border border-border px-3.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                {isEn ? "Cancel" : "Hủy"}
              </button>
              <button
                type="submit"
                className="min-h-9 rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground hover:brightness-95 cursor-pointer"
              >
                {isEn ? "Confirm decline" : "Xác nhận từ chối"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
