"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import {
  CarePlanProposal,
  CareTaskItem,
  INITIAL_SEED_CARE_PLANS,
} from "@/modules/careplans/types";
import { localizeCarePlan } from "@/modules/i18n/localize-data";

export function ClinicCarePlansView({ locale }: { locale: string }) {
  const isEn = locale === "en";

  const [plans, setPlans] = useState<CarePlanProposal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CarePlanProposal | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields for new plan
  const [petName, setPetName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [doctorName, setDoctorName] = useState(
    isEn
      ? "Dr. Nguyen Van Cuong (DVM)"
      : "BS. Nguyễn Văn Cường (Chuyên khoa Da liễu & Ngoại trú)"
  );
  const [clinicName, setClinicName] = useState(
    isEn
      ? "PetCare Veterinary Clinic · District 1"
      : "Phòng Khám Thú Y PetCare · Quận 1"
  );
  const [diagnosis, setDiagnosis] = useState("");
  const [horizonMonths, setHorizonMonths] = useState<number>(3);
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dietInstructions, setDietInstructions] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [tasks, setTasks] = useState<
    Array<{
      id: string;
      title: string;
      category: CareTaskItem["category"];
      frequency: CareTaskItem["frequency"];
      scheduleDescription?: string;
      dueDate: string;
      vetVisitRequired: boolean;
      notes: string;
    }>
  >([
    {
      id: "task-temp-1",
      title: isEn
        ? "Medication: Antibiotics & anti-inflammatory dose"
        : "Uống thuốc kháng viêm & phục hồi theo đơn",
      category: "treatment",
      frequency: "daily",
      scheduleDescription: isEn ? "Every morning with food" : "Mỗi sáng cùng thức ăn",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      vetVisitRequired: false,
      notes: isEn ? "Give once daily with food" : "Uống sau ăn no vào buổi sáng.",
    },
    {
      id: "task-temp-2",
      title: isEn
        ? "Clinical follow-up & microscopic examination"
        : "Tái khám kiểm tra bề mặt tổn thương & chỉ số sinh tồn",
      category: "checkup",
      frequency: "monthly",
      scheduleDescription: isEn ? "Scheduled follow-up" : "Lịch hẹn tái khám",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      vetVisitRequired: true,
      notes: isEn
        ? "Visit clinic for progress review"
        : "Mang thú cưng đến trực tiếp phòng khám.",
    },
  ]);

  const [availablePets, setAvailablePets] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-care-plans");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlans(parsed.map((p) => localizeCarePlan(p, isEn)));
          } else {
            setPlans(INITIAL_SEED_CARE_PLANS.map((p) => localizeCarePlan(p, isEn)));
            localStorage.setItem("pawcare-care-plans", JSON.stringify(INITIAL_SEED_CARE_PLANS));
          }
        } else {
          setPlans(INITIAL_SEED_CARE_PLANS.map((p) => localizeCarePlan(p, isEn)));
          localStorage.setItem("pawcare-care-plans", JSON.stringify(INITIAL_SEED_CARE_PLANS));
        }
      } catch {
        setPlans(INITIAL_SEED_CARE_PLANS.map((p) => localizeCarePlan(p, isEn)));
      }

      try {
        const storedPets = localStorage.getItem("pawcare-clinic-pet-records");
        if (storedPets) {
          const parsedPets = JSON.parse(storedPets);
          if (Array.isArray(parsedPets)) {
            setAvailablePets(
              parsedPets
                .map((p: { name?: string; petName?: string }) => p.name || p.petName)
                .filter(Boolean) as string[]
            );
          }
        }
      } catch {}
    }
  }, [isEn]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem("pawcare-care-plans");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlans(parsed.map((p) => localizeCarePlan(p, isEn)));
          }
        }
      } catch {}
    };
    window.addEventListener("pawcare-careplans-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("pawcare-careplans-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [isEn]);

  const savePlans = (updated: CarePlanProposal[]) => {
    setPlans(updated.map((p) => localizeCarePlan(p, isEn)));
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-care-plans", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("pawcare-careplans-updated"));
      } catch {}
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleReloadDemoPlans = () => {
    savePlans(INITIAL_SEED_CARE_PLANS);
    showToast(
      isEn
        ? "Sample care plans restored."
        : "Đã khôi phục danh sách phác đồ mẫu."
    );
  };

  const handleApplyDermatologyTemplate = () => {
    setFormError(null);
    setPetName(isEn ? "Bo" : "Bơ");
    setOwnerName(isEn ? "Le Hoang Yen" : "Lê Hoàng Yến");
    setDoctorName(
      isEn
        ? "Dr. Nguyen Van Cuong (Dermatology Specialist)"
        : "BS. Nguyễn Văn Cường (Chuyên khoa Da liễu & Ngoại trú)"
    );
    setClinicName(
      isEn
        ? "PetCare Veterinary Clinic · District 1"
        : "Phòng Khám Thú Y PetCare · Quận 1"
    );
    setDiagnosis(
      isEn
        ? "Contact allergic dermatitis recovery protocol & skin barrier restoration"
        : "Phác đồ điều trị viêm da dị ứng tiếp xúc & phục hồi hàng rào biểu bì"
    );
    setHorizonMonths(3);
    setNextFollowUpDate("2026-11-10");
    setDietInstructions(
      isEn
        ? "Hydrolyzed protein dermatological formula. Strictly avoid beef, dairy, and table scraps."
        : "Chuyển sang hạt thú y da liễu đạm thủy phân, kiêng hoàn toàn thịt bò, phô mai và thức ăn thưởng công nghiệp."
    );
    setGeneralNotes(
      isEn
        ? "Wear protective e-collar for the first 5 days. Dry paw pads thoroughly after walks."
        : "Đeo loa chống liếm liên tục trong 5 ngày đầu. Tắm bằng sữa tắm dịu nhẹ, lau khô kẽ chân sau khi đi dạo."
    );
    setTasks([
      {
        id: `task-${Date.now()}-1`,
        title: isEn
          ? "Oral antihistamine & Omega-3 skin barrier supplement"
          : "Uống thuốc kháng Histamine giảm ngứa & Omega-3 bổ trợ da lông",
        category: "treatment",
        frequency: "daily",
        scheduleDescription: isEn ? "08:00 AM after morning meal" : "08:00 sáng sau khi ăn no",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        vetVisitRequired: false,
        notes: isEn
          ? "Administer 1 tablet mixed with wet food"
          : "Cho uống 1 viên trộn cùng pate dinh dưỡng.",
      },
      {
        id: `task-${Date.now()}-2`,
        title: isEn
          ? "Therapeutic medicated bath with Chlorhexidine shampoo"
          : "Tắm trị liệu với dầu tắm kháng nấm Chlorhexidine",
        category: "hygiene",
        frequency: "weekly",
        scheduleDescription: isEn ? "Twice weekly (Wed & Sun)" : "2 lần / tuần (Thứ 4 và Chủ Nhật)",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        vetVisitRequired: false,
        notes: isEn
          ? "Leave shampoo lather on skin for 10 minutes before rinsing thoroughly"
          : "Ủ bọt trên da 10 phút trước khi xả sạch bằng nước ấm.",
      },
      {
        id: `task-${Date.now()}-3`,
        title: isEn
          ? "Clinical follow-up & dermatologic cytology scrape"
          : "Tái khám soi tế bào da & đánh giá mức độ phục hồi",
        category: "checkup",
        frequency: "monthly",
        scheduleDescription: isEn ? "Appointment at PetCare D1" : "Khám trực tiếp tại PetCare Q1",
        dueDate: "2026-11-10",
        vetVisitRequired: true,
        notes: isEn
          ? "In-person visit with Dr. Cuong for progress evaluation"
          : "Tái khám với BS. Cường để kiểm tra phục hồi da.",
      },
      {
        id: `task-${Date.now()}-4`,
        title: isEn
          ? "Monthly spot-on parasite & Demodex mite prevention"
          : "Nhỏ gáy ngừa ve rận & Demodex định kỳ",
        category: "treatment",
        frequency: "monthly",
        scheduleDescription: isEn ? "Monthly dose on the 25th" : "Định kỳ ngày 25 hàng tháng",
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        vetVisitRequired: false,
        notes: isEn
          ? "Apply topical spot-on between shoulder blades"
          : "Vạch lông nhỏ trực tiếp lên da gáy, không tắm trong 48 giờ.",
      },
    ]);
  };

  const handleAddTaskField = () => {
    setTasks([
      ...tasks,
      {
        id: `task-${Date.now()}-${Math.random()}`,
        title: "",
        category: "treatment",
        frequency: "daily",
        scheduleDescription: "",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        vetVisitRequired: false,
        notes: "",
      },
    ]);
  };

  const handleRemoveTaskField = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!petName.trim() || !diagnosis.trim()) {
      setFormError(
        isEn
          ? "Please enter both the pet name and clinical diagnosis."
          : "Vui lòng nhập tên thú cưng và chẩn đoán điều trị."
      );
      return;
    }

    const newProposal: CarePlanProposal = {
      id: `plan-${Date.now()}`,
      petId: `pet-${Date.now()}`,
      petName: petName.trim(),
      ownerName: ownerName.trim() || (isEn ? "Pet Owner" : "Chủ nuôi"),
      clinicId: "petcare-d1",
      clinicName: clinicName.trim(),
      doctorName: doctorName.trim(),
      diagnosis: diagnosis.trim(),
      status: "pending_owner",
      horizonMonths,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextFollowUpDate,
      dietInstructions: dietInstructions.trim() || undefined,
      generalNotes: generalNotes.trim() || undefined,
      tasks: tasks
        .filter((t) => t.title.trim())
        .map((t) => ({
          id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: t.title.trim(),
          category: t.category,
          frequency: t.frequency || "daily",
          scheduleDescription: t.scheduleDescription?.trim() || undefined,
          dueDate: t.dueDate,
          vetVisitRequired: t.vetVisitRequired,
          notes: t.notes.trim() || undefined,
          completed: false,
        })),
    };

    const updated = [newProposal, ...plans];
    savePlans(updated);
    showToast(
      isEn
        ? `Care plan proposal sent to the owner of ${newProposal.petName}.`
        : `Đã gửi đề xuất kế hoạch chăm sóc cho chủ nuôi của ${newProposal.petName}.`
    );

    setPetName("");
    setOwnerName("");
    setDiagnosis("");
    setDietInstructions("");
    setGeneralNotes("");
    setFormError(null);
    setShowCreateModal(false);
  };

  const confirmRemovePlan = (id: string) => {
    const updated = plans.filter((p) => p.id !== id);
    savePlans(updated);
    setConfirmDeleteId(null);
    showToast(isEn ? "Care plan removed." : "Đã hủy đề xuất kế hoạch chăm sóc.");
  };

  const filteredPlans = plans.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchPet = p.petName.toLowerCase().includes(query);
      const matchOwner = p.ownerName.toLowerCase().includes(query);
      const matchDiag = p.diagnosis.toLowerCase().includes(query);
      return matchPet || matchOwner || matchDiag;
    }
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

      {successToast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500/30 bg-card px-4 py-3 text-xs sm:text-sm font-semibold text-foreground shadow-lg"
        >
          {successToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isEn ? "Clinical Care Regimens" : "Phác đồ & Kế hoạch chăm sóc"}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isEn
              ? "Veterinary Care Plans"
              : "Đề xuất & Quản lý Phác đồ"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {isEn
              ? "Design treatment schedules, medication tasks, and dietary guidance sent directly to the owner's passport."
              : "Xây dựng phác đồ điều trị, lịch uống thuốc, dinh dưỡng và hẹn tái khám đồng bộ trực tiếp tới sổ sức khỏe của chủ nuôi."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReloadDemoPlans}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
          >
            {isEn ? "Reset sample plans" : "Khôi phục dữ liệu mẫu"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
          >
            {isEn ? "+ New care plan" : "+ Tạo phác đồ mới"}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? "Search by pet, owner, or diagnosis..."
                : "Tìm theo tên bé, chủ nuôi hoặc chẩn đoán..."
            }
            className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isEn ? "Clear" : "Xóa"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: "all", label: `${isEn ? "All" : "Tất cả"} (${plans.length})` },
            { id: "pending_owner", label: isEn ? "Pending owner" : "Chờ chủ nuôi" },
            { id: "active", label: isEn ? "Active" : "Đang thực hiện" },
            { id: "completed", label: isEn ? "Completed" : "Hoàn thành" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Care Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card className="p-10 text-center space-y-2 border-dashed bg-card">
          <p className="font-semibold text-base text-foreground">
            {isEn ? "No care plans found" : "Không tìm thấy kế hoạch chăm sóc"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isEn
              ? "Click '+ New care plan' to prepare a treatment proposal for a patient."
              : "Chọn '+ Tạo phác đồ mới' để xây dựng phác đồ điều trị và hướng dẫn cho thú cưng."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => {
            const completedCount = plan.tasks.filter((t) => t.completed).length;
            const totalCount = plan.tasks.length;
            const progressPct =
              totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            const dailyCount = plan.tasks.filter(
              (t) =>
                t.frequency === "daily" ||
                (!t.frequency &&
                  ((t.title || "") + (t.notes || "")).toLowerCase().includes("ngày"))
            ).length;
            const weeklyCount = plan.tasks.filter(
              (t) =>
                t.frequency === "weekly" ||
                (!t.frequency &&
                  ((t.title || "") + (t.notes || "")).toLowerCase().includes("tuần"))
            ).length;
            const monthlyCount = plan.tasks.filter(
              (t) =>
                t.frequency === "monthly" ||
                (!t.frequency &&
                  !((t.title || "") + (t.notes || "")).toLowerCase().includes("ngày") &&
                  !((t.title || "") + (t.notes || "")).toLowerCase().includes("tuần"))
            ).length;

            return (
              <Card
                key={plan.id}
                className="flex flex-col justify-between p-5 border-border bg-card rounded-2xl"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-sm font-bold text-secondary-foreground">
                        {plan.petName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate">
                          {plan.petName}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {isEn ? "Owner:" : "Chủ nuôi:"} {plan.ownerName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                        plan.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : plan.status === "active"
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {plan.status === "completed"
                        ? isEn ? "Completed" : "Hoàn thành"
                        : plan.status === "active"
                        ? isEn ? "Active" : "Đang thực hiện"
                        : isEn ? "Pending owner" : "Chờ tiếp nhận"}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2">
                      {plan.diagnosis}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {plan.doctorName}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {isEn ? "Tasks:" : "Nhiệm vụ:"}{" "}
                        <strong className="text-foreground tabular-nums">
                          {completedCount}/{totalCount}
                        </strong>
                      </span>
                      <span className="font-semibold text-primary tabular-nums">
                        {progressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-medium text-muted-foreground">
                      <span className="rounded-md bg-secondary px-2 py-0.5 tabular-nums">
                        {dailyCount} {isEn ? "daily" : "hằng ngày"}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 tabular-nums">
                        {weeklyCount} {isEn ? "weekly" : "hằng tuần"}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 tabular-nums">
                        {monthlyCount} {isEn ? "monthly" : "hằng tháng"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      {isEn ? "Follow-up:" : "Tái khám:"} {plan.nextFollowUpDate}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {plan.horizonMonths} {isEn ? "months" : "tháng"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {confirmDeleteId === plan.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => confirmRemovePlan(plan.id)}
                        className="rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground cursor-pointer"
                      >
                        {isEn ? "Confirm remove" : "Xác nhận hủy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isEn ? "Cancel" : "Giữ lại"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(plan.id)}
                      className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
                    >
                      {isEn ? "Remove" : "Hủy đề xuất"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {isEn ? "View clinical details" : "Xem chi tiết phác đồ"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Care Plan Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-3.5">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {isEn
                    ? "New Care Plan Proposal"
                    : "Tạo Đề Xuất Kế Hoạch Chăm Sóc"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Protocol and home care tasks will appear in the pet owner's health record."
                    : "Phác đồ và lịch nhắc chăm sóc sẽ đồng bộ trực tiếp tới hồ sơ của chủ nuôi."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            {/* Clinical Template Shortcut */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-border bg-secondary/40 p-3.5">
              <span className="text-xs text-muted-foreground">
                {isEn
                  ? "Prefill standard dermatology protocol with daily, weekly, and follow-up tasks."
                  : "Điền nhanh mẫu phác đồ da liễu gồm lịch dùng thuốc hằng ngày, hằng tuần và tái khám."}
              </span>
              <button
                type="button"
                onClick={handleApplyDermatologyTemplate}
                className="inline-flex min-h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition shrink-0 cursor-pointer"
              >
                {isEn ? "Use dermatology template" : "Dùng mẫu viêm da"}
              </button>
            </div>

            {formError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {formError}
              </p>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Pet name *" : "Tên thú cưng *"}
                  </label>
                  <input
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder={isEn ? "e.g. Bo, Miu, Milo" : "VD: Bơ, Miu, Milo"}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                  {availablePets.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="text-muted-foreground">
                        {isEn ? "Quick pick:" : "Chọn nhanh:"}
                      </span>
                      {availablePets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPetName(p)}
                          className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:text-primary cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Owner name" : "Tên chủ nuôi"}
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={isEn ? "e.g. Nguyen Van An" : "VD: Nguyễn Văn An"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Attending veterinarian" : "Bác sĩ phụ trách"}
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Clinic facility" : "Cơ sở phòng khám"}
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  {isEn
                    ? "Clinical diagnosis & care objective *"
                    : "Chẩn đoán & mục tiêu điều trị *"}
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. Contact allergic dermatitis recovery protocol"
                      : "VD: Phác đồ điều trị viêm da dị ứng & phục hồi da lông"
                  }
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Duration" : "Thời hạn phác đồ"}
                  </label>
                  <select
                    value={horizonMonths}
                    onChange={(e) => setHorizonMonths(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value={1}>1 {isEn ? "month" : "tháng"}</option>
                    <option value={3}>3 {isEn ? "months" : "tháng"}</option>
                    <option value={6}>6 {isEn ? "months" : "tháng"}</option>
                    <option value={12}>12 {isEn ? "months" : "tháng"}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Next follow-up date" : "Ngày hẹn tái khám"}
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Dietary guidance" : "Dặn dò dinh dưỡng"}
                  </label>
                  <textarea
                    rows={2}
                    value={dietInstructions}
                    onChange={(e) => setDietInstructions(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Hypoallergenic food, avoid beef"
                        : "VD: Hạt thủy phân, kiêng thịt bò và phụ gia..."
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isEn ? "Doctor's general notes" : "Lời dặn của bác sĩ"}
                  </label>
                  <textarea
                    rows={2}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Keep affected area dry, monitor daily"
                        : "VD: Giữ khô vùng da tổn thương, báo lại nếu có dấu hiệu bất thường..."
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {isEn ? "Scheduled care tasks" : "Danh sách nhiệm vụ theo dõi"}
                  </span>

                  <button
                    type="button"
                    onClick={handleAddTaskField}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {isEn ? "+ Add task" : "+ Thêm nhiệm vụ"}
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border bg-muted/20 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskField(task.id)}
                          className="text-xs font-medium text-destructive hover:underline cursor-pointer"
                        >
                          {isEn ? "Remove" : "Xóa"}
                        </button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-12">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => {
                              const updated = [...tasks];
                              updated[idx].title = e.target.value;
                              setTasks(updated);
                            }}
                            placeholder={
                              isEn ? "Task title" : "Tên nhiệm vụ (VD: Uống thuốc...)"
                            }
                            required
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <select
                            value={task.category}
                            onChange={(e) => {
                              const updated = [...tasks];
                              updated[idx].category = e.target
                                .value as CareTaskItem["category"];
                              setTasks(updated);
                            }}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                          >
                            <option value="treatment">{isEn ? "Treatment" : "Điều trị"}</option>
                            <option value="vaccination">{isEn ? "Vaccine" : "Tiêm phòng"}</option>
                            <option value="diet">{isEn ? "Diet" : "Dinh dưỡng"}</option>
                            <option value="hygiene">{isEn ? "Hygiene" : "Vệ sinh"}</option>
                            <option value="checkup">{isEn ? "Checkup" : "Tái khám"}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <select
                            value={task.frequency || "daily"}
                            onChange={(e) => {
                              const updated = [...tasks];
                              updated[idx].frequency = e.target
                                .value as CareTaskItem["frequency"];
                              setTasks(updated);
                            }}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-hidden"
                          >
                            <option value="daily">{isEn ? "Daily" : "Hằng ngày"}</option>
                            <option value="weekly">{isEn ? "Weekly" : "Hằng tuần"}</option>
                            <option value="monthly">{isEn ? "Monthly" : "Hằng tháng"}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="date"
                            value={task.dueDate}
                            onChange={(e) => {
                              const updated = [...tasks];
                              updated[idx].dueDate = e.target.value;
                              setTasks(updated);
                            }}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={task.vetVisitRequired}
                            onChange={(e) => {
                              const updated = [...tasks];
                              updated[idx].vetVisitRequired = e.target.checked;
                              setTasks(updated);
                            }}
                            className="size-3.5 rounded text-primary focus:ring-primary"
                          />
                          <span>{isEn ? "Clinic visit required" : "Khám tại phòng khám"}</span>
                        </label>

                        <input
                          type="text"
                          value={task.scheduleDescription || ""}
                          onChange={(e) => {
                            const updated = [...tasks];
                            updated[idx].scheduleDescription = e.target.value;
                            setTasks(updated);
                          }}
                          placeholder={
                            isEn ? "Schedule (e.g. Every morning)" : "Chu kỳ (VD: Mỗi sáng, Thứ 4 & CN)"
                          }
                          className="w-44 rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:border-primary focus:outline-hidden"
                        />

                        <input
                          type="text"
                          value={task.notes}
                          onChange={(e) => {
                            const updated = [...tasks];
                            updated[idx].notes = e.target.value;
                            setTasks(updated);
                          }}
                          placeholder={
                            isEn ? "Instructions / dosage note" : "Hướng dẫn liều dùng..."
                          }
                          className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:border-primary focus:outline-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-9 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
                >
                  {isEn ? "Send care plan" : "Gửi đề xuất cho chủ nuôi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="care-plan-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlan(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isEn ? "Clinical Care Plan Summary" : "Chi tiết phác đồ lâm sàng"}
                </p>
                <h2 id="care-plan-detail-title" className="font-display text-lg font-bold text-foreground mt-0.5">
                  {selectedPlan.petName} — {selectedPlan.ownerName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPlan.doctorName} · {selectedPlan.clinicName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="min-h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer shrink-0"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {isEn ? "Clinical diagnosis" : "Chẩn đoán lâm sàng"}
                </p>
                <p className="font-medium text-foreground mt-0.5">{selectedPlan.diagnosis}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Follow-up date" : "Ngày hẹn tái khám"}
                  </p>
                  <p className="font-medium text-foreground tabular-nums mt-0.5">
                    {selectedPlan.nextFollowUpDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Horizon" : "Thời hạn theo dõi"}
                  </p>
                  <p className="font-medium text-foreground tabular-nums mt-0.5">
                    {selectedPlan.horizonMonths} {isEn ? "months" : "tháng"}
                  </p>
                </div>
              </div>
              {selectedPlan.dietInstructions && (
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Diet & home regime" : "Chế độ ăn & kiêng cữ"}
                  </p>
                  <p className="text-xs text-foreground mt-1">{selectedPlan.dietInstructions}</p>
                </div>
              )}
              {selectedPlan.generalNotes && (
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {isEn ? "Veterinary notes" : "Chỉ dẫn bác sĩ"}
                  </p>
                  <p className="text-xs text-foreground mt-1">{selectedPlan.generalNotes}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isEn ? "Prescribed Care Tasks" : "Danh mục đầu việc chăm sóc"} ({selectedPlan.tasks.length})
              </p>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {selectedPlan.tasks.map((t) => (
                  <li key={t.id} className="p-3 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground">{t.title}</span>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 tabular-nums">
                        {t.dueDate}
                      </span>
                    </div>
                    {t.notes && <p className="text-muted-foreground">{t.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
