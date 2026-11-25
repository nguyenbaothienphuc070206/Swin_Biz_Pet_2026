"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Stethoscope,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronRight,
  Filter,
  Check,
  FileText,
  Utensils,
  Syringe,
  Sparkles,
  ArrowRight,
  Sun,
  ShieldCheck,
  MessageSquare,
  Send,
  Plus,
  X,
  Paperclip,
  PhoneCall,
  User,
  PlusCircle,
  RotateCcw,
  Sparkle,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useOwnerPlan } from "@/lib/hooks/use-owner-plan";
import {
  CarePlanProposal,
  CareTaskItem,
  CareFrequency,
  INITIAL_SEED_CARE_PLANS,
} from "@/modules/careplans/types";
import {
  localizeCarePlan,
  localizeCareFrequency,
  localizeDoctorName,
  localizeClinicName,
} from "@/modules/i18n/localize-data";

interface ChatMessage {
  id: string;
  sender: "clinic" | "owner";
  senderName: string;
  senderRole?: string;
  avatarText?: string;
  text: string;
  timestamp: string;
  protocolCard?: {
    title: string;
    cadence: "daily" | "weekly" | "monthly";
    category: CareTaskItem["category"];
    instructions: string;
    dueDate: string;
    synced?: boolean;
  };
}

function getDefaultChatMessages(
  isEn: boolean,
  plan: CarePlanProposal
): ChatMessage[] {
  const doc = localizeDoctorName(plan.doctorName, isEn);
  const clinic = localizeClinicName(plan.clinicName, isEn);
  const pet = isEn ? (plan.petName === "Bơ" ? "Bo" : plan.petName) : (plan.petName === "Bo" ? "Bơ" : plan.petName);

  return [
    {
      id: `msg-seed-1-${plan.id}`,
      sender: "clinic",
      senderName: doc,
      senderRole: `${clinic}`,
      avatarText: "🩺",
      text: isEn
        ? `Hello! ${doc} from ${clinic} here, overseeing ${pet}'s recovery roadmap. I've sent over the clinical diagnosis and structured care protocol.`
        : `Chào bạn An, bác sĩ ${doc} từ ${clinic} phụ trách theo dõi cho bé ${pet}. Bác sĩ gửi bạn kết quả khám da và phác đồ điều trị chi tiết.`,
      timestamp: isEn ? "10:15 AM - Yesterday" : "10:15 - Hôm qua",
    },
    {
      id: `msg-seed-2-${plan.id}`,
      sender: "clinic",
      senderName: plan.doctorName,
      senderRole: `${plan.clinicName}`,
      avatarText: "🩺",
      text: isEn
        ? `The ventral abdominal skin and paw interdigital spaces show mild contact allergic dermatitis. I have formulated a 3-tier care protocol (Daily, Weekly, Monthly) with medicated baths, daily supplements, and targeted nutrition.`
        : `Vùng da dưới bụng và kẽ chân của bé ${plan.petName} có dấu hiệu viêm da dị ứng tiếp xúc nhẹ. Bác sĩ đã thiết lập lộ trình chăm sóc gồm thuốc uống hằng ngày, tắm dược liệu hàng tuần và lịch tái khám hàng tháng.`,
      timestamp: isEn ? "10:16 AM - Yesterday" : "10:16 - Hôm qua",
      protocolCard: {
        title: isEn
          ? "Medicated bath with Malaseb dermatological shampoo (2x/week)"
          : "Tắm trị liệu bằng sữa tắm Malaseb dược liệu 2 lần/tuần",
        cadence: "weekly",
        category: "hygiene",
        instructions: isEn
          ? "Lather and massage into skin for 10 minutes before rinsing thoroughly with lukewarm water."
          : "Massage bọt thuốc 10 phút trước khi xả sạch bằng nước ấm vừa phải.",
        dueDate: "2026-10-26",
        synced: true,
      },
    },
    {
      id: `msg-seed-3-${plan.id}`,
      sender: "owner",
      senderName: isEn
        ? `${plan.ownerName} (Pet Owner)`
        : `${plan.ownerName} (Chủ bé ${plan.petName})`,
      avatarText: "🐾",
      text: isEn
        ? `Thank you doctor! If the pet frequently scratches or licks the belly area, should we put on an Elizabethan collar?`
        : `Dạ em cảm ơn bác sĩ! Cho em hỏi nếu bé hay gãi hoặc liếm vùng bụng thì có cần đeo loa chống liếm không ạ?`,
      timestamp: isEn ? "10:30 AM - Yesterday" : "10:30 - Hôm qua",
    },
    {
      id: `msg-seed-4-${plan.id}`,
      sender: "clinic",
      senderName: plan.doctorName,
      senderRole: `${plan.clinicName}`,
      avatarText: "🩺",
      text: isEn
        ? `Definitely! For the first 3 days of oral treatment, please put on the e-collar at night and right after applying topical medication to prevent ingestion and skin irritation.`
        : `Rất nên bạn nhé! Trong 3 ngày đầu uống thuốc, bạn cho bé đeo vòng cổ chống liếm (Elizabethan) vào ban đêm và lúc sau khi bôi thuốc để tránh bé liếm thuốc gây giảm hiệu quả nhé.`,
      timestamp: isEn ? "10:35 AM - Yesterday" : "10:35 - Hôm qua",
    },
  ];
}

export function CarePlansView({
  locale,
  isClinic = false,
}: {
  locale: string;
  isClinic?: boolean;
}) {
  const isEn = locale === "en";
  const { isFree, isPremium } = useOwnerPlan();

  // Check if clinic role is active (Care plan formulation is strictly restricted to Clinics)
  const [isClinicRole, setIsClinicRole] = useState(isClinic);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pawcare_role");
      if (stored === "clinic_admin" || stored === "clinic_staff") {
        setIsClinicRole(true);
      }
    }
  }, []);

  const canFormulate = isClinic || isClinicRole;

  // Tab switching state: "roadmap" (Lộ trình chăm sóc) | "chat" (Khung chat với phòng khám)
  const [activeTab, setActiveTab] = useState<"roadmap" | "chat">("roadmap");

  const [plans, setPlans] = useState<CarePlanProposal[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>("");
  const [cadenceFilter, setCadenceFilter] = useState<
    "all" | "daily" | "weekly" | "monthly"
  >("all");
  const [isLoaded, setIsLoaded] = useState(false);

  // Formulation Modal (Kế hoạch hóa lộ trình cho phòng khám)
  const [showFormulateModal, setShowFormulateModal] = useState(false);
  const [formulateTitle, setFormulateTitle] = useState("");
  const [formulateCadence, setFormulateCadence] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [formulateCategory, setFormulateCategory] = useState<
    CareTaskItem["category"]
  >("treatment");
  const [formulateSchedule, setFormulateSchedule] = useState("");
  const [formulateDueDate, setFormulateDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [formulateVetVisit, setFormulateVetVisit] = useState(false);
  const [formulateNotes, setFormulateNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Clinic Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Load plans from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      let loadedPlans: CarePlanProposal[] = [];
      try {
        const stored = localStorage.getItem("pawcare-care-plans");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedPlans = parsed;
          }
        }
      } catch {}

      // If no plans found, initialize with the default clinical roadmap prescribed by the doctor
      if (loadedPlans.length === 0) {
        loadedPlans = INITIAL_SEED_CARE_PLANS;
        try {
          localStorage.setItem(
            "pawcare-care-plans",
            JSON.stringify(INITIAL_SEED_CARE_PLANS)
          );
        } catch {}
      }

      const normalized = loadedPlans.map((p) => localizeCarePlan(p, isEn));
      setPlans(normalized);
      setActivePlanId((prev) => prev || normalized[0]?.id || "");
      setIsLoaded(true);
    }
  }, [isEn]);

  // Listen to cross-component updates from clinic proposals
  useEffect(() => {
    const handleUpdate = () => {
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

    window.addEventListener("pawcare-careplans-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pawcare-careplans-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [isEn]);

  // Save changes to localStorage and state
  const savePlans = (updated: CarePlanProposal[]) => {
    setPlans(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-care-plans", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("pawcare-careplans-updated"));
      } catch {}
    }
  };

  // Find currently selected plan
  const filteredPlans = plans;
  const selectedPlan =
    plans.find((p) => p.id === activePlanId) || filteredPlans[0] || null;

  // Load chat messages for the selected plan
  useEffect(() => {
    if (!selectedPlan) {
      setChatMessages([]);
      return;
    }
    const planKey = `pawcare_chat_${selectedPlan.id}`;
    let loaded: ChatMessage[] = [];
    try {
      const stored = localStorage.getItem(planKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch {}

    if (!loaded || loaded.length === 0) {
      loaded = getDefaultChatMessages(isEn, selectedPlan);
      try {
        localStorage.setItem(planKey, JSON.stringify(loaded));
      } catch {}
    }
    setChatMessages(loaded);
  }, [selectedPlan?.id, isEn]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const saveChatMessages = (planId: string, msgs: ChatMessage[]) => {
    setChatMessages(msgs);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`pawcare_chat_${planId}`, JSON.stringify(msgs));
      } catch {}
    }
  };

  // Reset simulation chat to default state for presentations and demo runs
  const handleResetDemoChat = () => {
    if (!selectedPlan) return;
    const planKey = `pawcare_chat_${selectedPlan.id}`;
    const fresh = getDefaultChatMessages(isEn, selectedPlan);
    setChatMessages(fresh);
    try {
      localStorage.setItem(planKey, JSON.stringify(fresh));
    } catch {}
    setToastMessage(
      isEn
        ? "Demo consultation chat reset to initial state!"
        : "Đã làm mới lại hội thoại tư vấn mô phỏng!"
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Core function to send message and trigger simulated veterinary reply
  const sendUserMessage = (userText: string) => {
    if (!userText.trim() || !selectedPlan) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "owner",
      senderName: isEn
        ? `${selectedPlan.ownerName || "Pet Owner"}`
        : `${selectedPlan.ownerName || "Chủ nuôi"} (Chủ bé ${selectedPlan.petName})`,
      avatarText: "🐾",
      text: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updated = [...chatMessages, newMsg];
    saveChatMessages(selectedPlan.id, updated);
    setInputMsg("");
    setIsTyping(true);

    // Simulated Doctor Auto-Reply
    setTimeout(() => {
      let doctorReplyText = isEn
        ? `Dr. ${selectedPlan.doctorName} has noted your message regarding ${selectedPlan.petName}. Please continue following the prescribed roadmap. Reach out immediately if unexpected itching occurs!`
        : `Bác sĩ ${selectedPlan.doctorName} đã tiếp nhận thông tin từ bạn. Lộ trình của bé ${selectedPlan.petName} đang tiến triển tốt. Nếu có bất kỳ dấu hiệu ngứa nhiều hoặc nôn mửa, hãy nhắn ngay cho bác sĩ nhé!`;

      const lower = userText.toLowerCase();
      if (
        lower.includes("thuốc") ||
        lower.includes("uống") ||
        lower.includes("med") ||
        lower.includes("liều")
      ) {
        doctorReplyText = isEn
          ? `Regarding oral medication (Omega 3-6 & anti-inflammatory): Please administer 1 capsule every morning right after feeding for optimal absorption. You may blend it with a spoonful of hypoallergenic diet if needed.`
          : `Về thuốc uống Omega 3-6 & kháng viêm: Bạn cho bé uống đều đặn 1 viên vào bữa sáng ngay sau khi ăn no để đạt độ hấp thu tốt nhất. Nếu bé khó uống có thể trộn cùng 1 thìa pate ăn kiêng nhé.`;
      } else if (
        lower.includes("tắm") ||
        lower.includes("malaseb") ||
        lower.includes("bath") ||
        lower.includes("dược liệu")
      ) {
        doctorReplyText = isEn
          ? `Key instructions for Malaseb medicated bathing (2x/week): 1) Wet coat thoroughly with lukewarm water; 2) Massage foam into affected skin and leave for 10 minutes for active antiseptic action; 3) Rinse thoroughly and blow-dry paws completely.`
          : `Lưu ý khi tắm sữa tắm dược liệu Malaseb (2 lần/tuần): 1) Làm ướt toàn thân bằng nước ấm; 2) Thoa dầu tắm và massage tạo bọt kỹ, giữ nguyên bọt trên da 10 phút để diệt khuẩn/nấm; 3) Xả thật sạch và sấy khô tuyệt đối kẽ chân nhé.`;
      } else if (
        lower.includes("ăn") ||
        lower.includes("thức ăn") ||
        lower.includes("gà") ||
        lower.includes("bò") ||
        lower.includes("diet") ||
        lower.includes("food")
      ) {
        doctorReplyText = isEn
          ? `Strict diet adherence: Avoid all poultry, beef, dairy, and table scraps. Rely solely on the prescribed hydrolyzed protein diet or natural salmon to prevent inflammatory flare-ups!`
          : `Chế độ ăn của bé hiện tại đang trong phác đồ dị ứng: Bạn tuyệt đối không cho ăn thịt gà, thịt bò hay thức ăn vặt của người. Chỉ dùng hạt đạm thủy phân hoặc cá hồi tự nhiên để da không bùng phát ngứa nhé!`;
      } else if (
        lower.includes("tái khám") ||
        lower.includes("lịch") ||
        lower.includes("hẹn") ||
        lower.includes("tuần tới") ||
        lower.includes("checkup") ||
        lower.includes("appointment")
      ) {
        doctorReplyText = isEn
          ? `The scheduled follow-up skin cytology checkup for ${selectedPlan.petName} is set for ${selectedPlan.nextFollowUpDate} at ${selectedPlan.clinicName}. You can tap "Book Follow-up" in the header to lock in your preferred time slot.`
          : `Lịch tái khám soi da kính hiển vi cho bé ${selectedPlan.petName} đã được xếp vào ngày ${selectedPlan.nextFollowUpDate} tại ${selectedPlan.clinicName}. Bạn có thể bấm nút "Đặt lịch tái khám" phía trên để chọn giờ hẹn cụ thể nhé.`;
      } else if (
        lower.includes("ảnh") ||
        lower.includes("vết thương") ||
        lower.includes("da") ||
        lower.includes("ngứa") ||
        lower.includes("photo") ||
        lower.includes("wound")
      ) {
        doctorReplyText = isEn
          ? `Dr. ${selectedPlan.doctorName} has reviewed the condition: The ventral skin erythema has decreased significantly and is drying nicely. Continue gentle saline cleansing in the evening and keep the e-collar on for 2 more days.`
          : `Bác sĩ đã xem qua tình trạng: Vùng da bụng đã se khô, giảm sung huyết đáng kể so với hôm khám. Bạn tiếp tục duy trì lau nước muối sinh lý mỗi tối và đeo loa chống liếm thêm 2 ngày nữa nhé!`;
      }

      const doctorReply: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        sender: "clinic",
        senderName: selectedPlan.doctorName,
        senderRole: selectedPlan.clinicName,
        avatarText: "🩺",
        text: doctorReplyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const finalMsgs = [...updated, doctorReply];
      saveChatMessages(selectedPlan.id, finalMsgs);
      setIsTyping(false);
    }, 1100);
  };

  // Send a message in clinic chat via form
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendUserMessage(inputMsg);
  };

  // Toggle task completion
  const handleToggleTask = (planId: string, taskId: string) => {
    const updated = plans.map((p) => {
      if (p.id !== planId) return p;
      const updatedTasks = p.tasks.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, completed: !t.completed };
      });
      const allDone = updatedTasks.every((t) => t.completed);
      return {
        ...p,
        tasks: updatedTasks,
        status: allDone
          ? ("completed" as const)
          : p.status === "completed"
          ? ("active" as const)
          : p.status,
        updatedAt: new Date().toISOString(),
      };
    });
    savePlans(updated);
  };

  // Accept a pending proposal
  const handleAcceptProposal = (planId: string) => {
    const updated = plans.map((p) => {
      if (p.id !== planId) return p;
      return {
        ...p,
        status: "active" as const,
        updatedAt: new Date().toISOString(),
      };
    });
    savePlans(updated);
    setToastMessage(
      isEn
        ? "Care plan accepted and activated!"
        : "Đã tiếp nhận và kích hoạt lộ trình chăm sóc!"
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Formulate a new task into the care plan (strictly restricted to clinic)
  const handleSaveFormulatedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canFormulate || !formulateTitle.trim() || !selectedPlan) return;

    const newTask: CareTaskItem = {
      id: `task-${Date.now()}`,
      title: formulateTitle.trim(),
      category: formulateCategory,
      frequency: formulateCadence,
      scheduleDescription:
        formulateSchedule.trim() ||
        (formulateCadence === "daily"
          ? isEn
            ? "Daily routine"
            : "Hằng ngày"
          : formulateCadence === "weekly"
          ? isEn
            ? "Weekly routine"
            : "Hàng tuần"
          : isEn
          ? "Monthly routine"
          : "Hàng tháng"),
      dueDate: formulateDueDate,
      vetVisitRequired: formulateVetVisit,
      notes: formulateNotes.trim() || undefined,
      completed: false,
    };

    const updatedPlans = plans.map((p) => {
      if (p.id !== selectedPlan.id) return p;
      return {
        ...p,
        tasks: [newTask, ...p.tasks],
        updatedAt: new Date().toISOString(),
      };
    });

    savePlans(updatedPlans);

    // Notify in clinic chat
    const clinicNotifyMsg: ChatMessage = {
      id: `msg-formulated-${Date.now()}`,
      sender: "clinic",
      senderName: selectedPlan.doctorName,
      senderRole: selectedPlan.clinicName,
      avatarText: "🩺",
      text: isEn
        ? `Prescribed new task: "${newTask.title}" added to the ${newTask.frequency} care roadmap.`
        : `Phòng khám đã cập nhật chỉ định mới vào lộ trình: "${newTask.title}" (${
            newTask.frequency === "daily"
              ? "Hằng ngày"
              : newTask.frequency === "weekly"
              ? "Hàng tuần"
              : "Hàng tháng"
          }).`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      protocolCard: {
        title: newTask.title,
        cadence: formulateCadence,
        category: newTask.category,
        instructions: newTask.notes || newTask.scheduleDescription || "",
        dueDate: newTask.dueDate,
        synced: true,
      },
    };

    saveChatMessages(selectedPlan.id, [...chatMessages, clinicNotifyMsg]);

    // Reset formulation form
    setFormulateTitle("");
    setFormulateNotes("");
    setFormulateSchedule("");
    setFormulateVetVisit(false);
    setShowFormulateModal(false);

    setToastMessage(
      isEn
        ? "New care task formulated and added to roadmap!"
        : "Đã kế hoạch hóa và thêm nhiệm vụ vào lộ trình chăm sóc!"
    );
    setTimeout(() => setToastMessage(null), 3500);

    // Switch to roadmap view to see the new item
    setActiveTab("roadmap");
  };

  // Helper to determine task cadence (daily, weekly, monthly)
  const getTaskCadence = (
    task: CareTaskItem
  ): "daily" | "weekly" | "monthly" => {
    if (
      task.frequency === "daily" ||
      task.frequency === "weekly" ||
      task.frequency === "monthly"
    ) {
      return task.frequency;
    }
    const text = (task.title + " " + (task.notes || "")).toLowerCase();
    if (
      text.includes("hằng ngày") ||
      text.includes("mỗi ngày") ||
      text.includes("hàng ngày") ||
      text.includes("mỗi sáng") ||
      text.includes("mỗi tối") ||
      text.includes("daily")
    ) {
      return "daily";
    }
    if (
      text.includes("/tuần") ||
      text.includes("hàng tuần") ||
      text.includes("mỗi tuần") ||
      text.includes("weekly")
    ) {
      return "weekly";
    }
    return "monthly";
  };

  // Categorize tasks for selected plan
  const dailyTasks = useMemo(
    () =>
      selectedPlan
        ? selectedPlan.tasks.filter((t) => getTaskCadence(t) === "daily")
        : [],
    [selectedPlan]
  );
  const weeklyTasks = useMemo(
    () =>
      selectedPlan
        ? selectedPlan.tasks.filter((t) => getTaskCadence(t) === "weekly")
        : [],
    [selectedPlan]
  );
  const monthlyTasks = useMemo(
    () =>
      selectedPlan
        ? selectedPlan.tasks.filter((t) => getTaskCadence(t) === "monthly")
        : [],
    [selectedPlan]
  );

  const completedDaily = dailyTasks.filter((t) => t.completed).length;
  const completedWeekly = weeklyTasks.filter((t) => t.completed).length;
  const completedMonthly = monthlyTasks.filter((t) => t.completed).length;

  const totalTasks = selectedPlan ? selectedPlan.tasks.length : 0;
  const totalCompleted = selectedPlan
    ? selectedPlan.tasks.filter((t) => t.completed).length
    : 0;

  const getCategoryBadge = (cat: CareTaskItem["category"]) => {
    switch (cat) {
      case "vaccination":
        return {
          label: isEn ? "Vaccination" : "Tiêm phòng",
          bg: "bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-400/50 dark:border-blue-900",
          icon: Syringe,
        };
      case "treatment":
        return {
          label: isEn ? "Medical Treatment" : "Điều trị",
          bg: "bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-400/50 dark:border-purple-900",
          icon: Stethoscope,
        };
      case "diet":
        return {
          label: isEn ? "Dietary Care" : "Dinh dưỡng",
          bg: "bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-400/50 dark:border-amber-900",
          icon: Utensils,
        };
      case "hygiene":
        return {
          label: isEn ? "Hygiene & Skin" : "Vệ sinh & Da",
          bg: "bg-teal-500/20 text-teal-900 dark:text-teal-300 border-teal-400/50 dark:border-teal-900",
          icon: Sparkles,
        };
      case "checkup":
      default:
        return {
          label: isEn ? "Vet Checkup" : "Tái khám",
          bg: "bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-400/50 dark:border-emerald-900",
          icon: Calendar,
        };
    }
  };

  const getFrequencyBadge = (cadence: "daily" | "weekly" | "monthly") => {
    switch (cadence) {
      case "daily":
        return {
          label: isEn ? "Daily" : "Hằng ngày",
          bg: "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-400/40",
          icon: Sun,
        };
      case "weekly":
        return {
          label: isEn ? "Weekly" : "Hàng tuần",
          bg: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/40",
          icon: Calendar,
        };
      case "monthly":
      default:
        return {
          label: isEn ? "Monthly" : "Hàng tháng",
          bg: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-400/40",
          icon: CalendarDays,
        };
    }
  };

  // Predefined Clinic Roadmap Quick Templates
  const applyQuickTemplate = (tpl: {
    title: string;
    cadence: "daily" | "weekly" | "monthly";
    category: CareTaskItem["category"];
    schedule: string;
    notes: string;
    vetVisit: boolean;
  }) => {
    setFormulateTitle(tpl.title);
    setFormulateCadence(tpl.cadence);
    setFormulateCategory(tpl.category);
    setFormulateSchedule(tpl.schedule);
    setFormulateNotes(tpl.notes);
    setFormulateVetVisit(tpl.vetVisit);
  };

  // Renders a single task card in Roadmap (Icons removed except nutrition & doctor advice)
  const renderTaskItem = (task: CareTaskItem) => {
    const badge = getCategoryBadge(task.category);
    const cadence = getTaskCadence(task);
    const freqBadge = getFrequencyBadge(cadence);

    return (
      <div
        key={task.id}
        className="flex items-start gap-3 p-3.5 sm:p-4 hover:bg-muted/30 transition first:rounded-t-2xl last:rounded-b-2xl border-b last:border-b-0 border-border/60"
      >
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => handleToggleTask(selectedPlan!.id, task.id)}
          aria-label={task.title}
          className="mt-1 size-4.5 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Cadence Badge */}
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${freqBadge.bg}`}
            >
              <span>{freqBadge.label}</span>
            </span>

            {/* Category Badge */}
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
            >
              <span>{badge.label}</span>
            </span>

            {/* Schedule description tag if present */}
            {task.scheduleDescription && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
                <span>{task.scheduleDescription}</span>
              </span>
            )}

            {/* Due Date */}
            <span className="text-[11px] text-muted-foreground font-medium ml-auto">
              {isEn ? "Target:" : "Hạn chót:"} {task.dueDate}
            </span>

            {/* Clinic visit required flag */}
            {task.vetVisitRequired && (
              <span className="rounded-md bg-destructive/10 border border-destructive/30 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                {isEn ? "Clinic Visit" : "Tại phòng khám"}
              </span>
            )}
          </div>

          <p
            className={`text-xs sm:text-sm font-medium leading-relaxed ${
              task.completed
                ? "line-through text-muted-foreground opacity-70"
                : "text-foreground font-semibold"
            }`}
          >
            {task.title}
          </p>

          {task.notes && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-1.5 border border-border/40">
              {task.notes}
            </p>
          )}

          {task.vetVisitRequired && !task.completed && (
            <div className="pt-1">
              <Link
                href={`/${locale}/owner/appointments?clinicId=${encodeURIComponent(
                  selectedPlan!.clinicId
                )}&pet=${encodeURIComponent(selectedPlan!.petName)}`}
                className="inline-flex items-center text-[11px] font-bold text-primary hover:underline"
              >
                <span>
                  {isEn ? "Book clinic appointment" : "Đặt lịch khám tại phòng khám"}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-xs font-bold text-background shadow-lg animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP COMPACT BAR (ĐÃ XÓA HERO) VÀ BỘ CHUYỂN ĐỔI GIAO DIỆN */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
              🐾
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isEn ? "Pet Care Plan & Clinic Desk" : "Kế Hoạch Chăm Sóc & Phòng Khám Theo Dõi"}
            </h1>
          </div>
          {selectedPlan && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span>
                {isEn ? "Patient:" : "Bệnh nhân:"}{" "}
                <strong className="text-foreground">{selectedPlan.petName}</strong>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Building2 className="size-3 text-primary" />
                <span>{selectedPlan.clinicName}</span>
              </span>
            </p>
          )}
        </div>

        {/* Action Button: Đặt lịch khám */}
        {selectedPlan && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/owner/appointments?clinicId=${encodeURIComponent(
                selectedPlan.clinicId
              )}&pet=${encodeURIComponent(selectedPlan.petName)}`}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition shadow-2xs"
            >
              <CalendarDays className="size-3.5 text-primary" />
              <span>{isEn ? "Book Follow-up" : "Đặt lịch tái khám"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* DUAL-VIEW SWITCHER TABS (MOBILE OPTIMIZED) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
        {/* TAB 1: KHUNG CHAT VỚI PHÒNG KHÁM */}
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2.5 rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold transition cursor-pointer border ${
            activeTab === "chat"
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <MessageSquare className="size-4 sm:size-4.5 shrink-0" />
          <span className="sm:hidden">
            {isEn ? "Clinic Chat" : "Chat Phòng Khám"}
          </span>
          <span className="hidden sm:inline">
            {isEn ? "Clinic Consultation Chat" : "Khung Chat Với Phòng Khám"}
          </span>
          <span className="inline-flex size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </button>

        {/* TAB 2: LỘ TRÌNH CHĂM SÓC THÚ CƯNG */}
        <button
          type="button"
          onClick={() => setActiveTab("roadmap")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl py-2.5 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold transition cursor-pointer border ${
            activeTab === "roadmap"
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span className="sm:hidden">
            {isEn ? "Care Roadmap" : "Lộ Trình"}
          </span>
          <span className="hidden sm:inline">
            {isEn ? "Pet Care Roadmap" : "Lộ Trình Chăm Sóc Thú Cưng"}
          </span>
          <span
            className={`rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black shrink-0 ${
              activeTab === "roadmap"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {totalCompleted}/{totalTasks}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: KHUNG CHAT VỚI PHÒNG KHÁM THEO DÕI                     */}
      {/* ============================================================== */}
      {activeTab === "chat" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {selectedPlan ? (
            <Card className="rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px] max-h-[720px] sm:h-[650px]">
              {/* Chat Header Bar */}
              <div className="border-b border-border bg-muted/20 p-3 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <span className="grid size-9 sm:size-12 place-items-center rounded-xl sm:rounded-2xl bg-primary text-primary-foreground text-base sm:text-xl shadow-xs">
                      🩺
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 sm:size-3.5 rounded-full border-2 border-background bg-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h3 className="font-bold text-xs sm:text-base text-foreground truncate max-w-[130px] sm:max-w-none">
                        {selectedPlan.doctorName}
                      </h3>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 sm:px-2 py-0.2 text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                        {isEn ? "Online" : "Trực tuyến"}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate max-w-[160px] sm:max-w-none">
                      <Building2 className="size-3 text-primary shrink-0" />
                      <span className="truncate">{selectedPlan.clinicName}</span>
                      <span className="hidden xs:inline">·</span>
                      <span className="hidden xs:inline">
                        {isEn ? "Patient:" : "Bệnh nhân:"}{" "}
                        <strong className="text-foreground">
                          {selectedPlan.petName}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetDemoChat}
                    title={
                      isEn
                        ? "Reset demo consultation chat"
                        : "Đặt lại hội thoại tư vấn mô phỏng"
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden md:inline">
                      {isEn ? "Reset Demo" : "Đặt lại demo"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("roadmap")}
                    className="inline-flex items-center rounded-xl border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition cursor-pointer"
                  >
                    <span className="hidden sm:inline">
                      {isEn ? "View Roadmap" : "Xem Lộ trình"}
                    </span>
                    <span className="sm:hidden">
                      {isEn ? "Roadmap" : "Lộ trình"}
                    </span>
                  </button>

                  {canFormulate && (
                    <button
                      type="button"
                      onClick={() => setShowFormulateModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-2 sm:px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
                    >
                      <PlusCircle className="size-3.5" />
                      <span className="hidden sm:inline">
                        {isEn ? "Formulate Task" : "Kế hoạch hóa"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-muted/5">
                {/* Notice banner */}
                <div className="mx-auto max-w-lg rounded-xl sm:rounded-2xl border border-blue-500/20 bg-blue-500/5 p-2 sm:p-3 text-center text-[10px] sm:text-xs text-muted-foreground">
                  <span>
                    {isEn
                      ? `Direct consultation with ${selectedPlan.clinicName} regarding ${selectedPlan.petName}'s treatment plan.`
                      : `Khung trao đổi theo dõi trực tiếp với ${selectedPlan.clinicName} về phác đồ của bé ${selectedPlan.petName}.`}
                  </span>
                </div>

                {chatMessages.map((msg) => {
                  const isClinic = msg.sender === "clinic";
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 sm:gap-2.5 ${
                        isClinic ? "justify-start" : "justify-end"
                      }`}
                    >
                      {isClinic && (
                        <div className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-xs sm:text-sm font-bold text-primary mt-1">
                          {msg.avatarText || "🩺"}
                        </div>
                      )}

                      <div
                        className={`max-w-[88%] sm:max-w-md space-y-1.5 sm:space-y-2 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm shadow-2xs ${
                          isClinic
                            ? "bg-card border border-border text-foreground rounded-tl-sm"
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                          <span className="font-bold truncate max-w-[130px] sm:max-w-none">
                            {msg.senderName}
                          </span>
                          <span className="shrink-0">{msg.timestamp}</span>
                        </div>

                        <p className="leading-relaxed whitespace-pre-line font-medium text-xs sm:text-sm">
                          {msg.text}
                        </p>

                        {/* Interactive Protocol Card if message contains a care task */}
                        {msg.protocolCard && (
                          <div
                            className={`rounded-xl border p-2.5 sm:p-3 mt-1.5 sm:mt-2 text-left space-y-1.5 sm:space-y-2 ${
                              isClinic
                                ? "bg-muted/40 border-border"
                                : "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-primary">
                                <Sparkles className="size-2.5 sm:size-3" />
                                <span>
                                  {msg.protocolCard.cadence === "daily"
                                    ? isEn
                                      ? "Daily Protocol"
                                      : "Lộ trình hằng ngày"
                                    : msg.protocolCard.cadence === "weekly"
                                    ? isEn
                                      ? "Weekly Protocol"
                                      : "Lộ trình hàng tuần"
                                    : isEn
                                    ? "Monthly Protocol"
                                    : "Lộ trình hàng tháng"}
                                </span>
                              </span>
                              <span className="text-[9px] sm:text-[10px] opacity-75">
                                {isEn ? "Target:" : "Hạn chót:"}{" "}
                                {msg.protocolCard.dueDate}
                              </span>
                            </div>

                            <p className="font-bold text-xs leading-snug">
                              {msg.protocolCard.title}
                            </p>
                            <p className="text-[10px] sm:text-[11px] opacity-80 leading-normal">
                              💡 {msg.protocolCard.instructions}
                            </p>

                            <div className="pt-1 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                <Check className="size-3 shrink-0" />
                                <span>
                                  {isEn
                                    ? "Synced to roadmap"
                                    : "Đã đồng bộ vào lộ trình"}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveTab("roadmap")}
                                className="text-[10px] sm:text-[11px] font-bold text-primary hover:underline shrink-0"
                              >
                                {isEn ? "View →" : "Xem →"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isClinic && (
                        <div className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-secondary text-xs sm:text-sm font-bold text-secondary-foreground mt-1">
                          {msg.avatarText || "🐾"}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span className="grid size-6 sm:size-7 place-items-center rounded-xl bg-primary/10 text-xs">
                      🩺
                    </span>
                    <span className="animate-pulse text-[11px] sm:text-xs">
                      {isEn
                        ? "Dr. Nguyen Van Cuong is typing..."
                        : "Bác sĩ phụ trách đang nhập phản hồi..."}
                    </span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Inquiry Simulation Prompt Chips (Horizontal swipeable on mobile) */}
              <div className="border-t border-border/70 bg-card py-2 px-3 sm:px-4 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground py-0.5 font-semibold flex items-center gap-1 shrink-0 pr-1">
                    <Sparkles className="size-3 text-primary shrink-0" />
                    <span className="hidden sm:inline">
                      {isEn
                        ? "Simulation Prompts (1-Tap):"
                        : "Mô phỏng trao đổi (1-Chạm):"}
                    </span>
                    <span className="sm:hidden">
                      {isEn ? "Prompts:" : "Gợi ý:"}
                    </span>
                  </span>
                  {[
                    {
                      label: isEn
                        ? "💊 Meds before or after food?"
                        : "💊 Thuốc uống sau hay trước ăn?",
                      prompt: isEn
                        ? "Doctor, should the Omega 3-6 and anti-inflammatory pills be given before or after meals?"
                        : "Bác sĩ ơi, viên Omega 3-6 và thuốc kháng viêm cho bé uống trước hay sau khi ăn ạ?",
                    },
                    {
                      label: isEn
                        ? "🛁 Malaseb bath instructions"
                        : "🛁 Lưu ý khi tắm Malaseb",
                      prompt: isEn
                        ? "Could you remind me of the key steps when bathing with Malaseb medicated shampoo?"
                        : "Nhờ bác sĩ dặn lại các bước quan trọng khi tắm sữa tắm dược liệu Malaseb cho bé ạ.",
                    },
                    {
                      label: isEn
                        ? "🍗 Accidentally ate chicken?"
                        : "🍗 Nếu bé lỡ ăn thịt gà?",
                      prompt: isEn
                        ? "If the pet accidentally had some chicken or table food, what symptoms should I monitor?"
                        : "Bác sĩ ơi, nếu bé lỡ ăn phải thịt gà hoặc thức ăn vặt thì có sao không ạ?",
                    },
                    {
                      label: isEn
                        ? "📷 Skin recovery update"
                        : "📷 Cập nhật tiến triển da",
                      prompt: isEn
                        ? "I checked the belly skin today: redness has reduced significantly. Is the recovery progressing well?"
                        : "Em kiểm tra vùng da bụng hôm nay: các nốt đỏ đã giảm rõ rệt. Tiến triển như vậy đã ổn chưa bác sĩ?",
                    },
                    {
                      label: isEn
                        ? "📅 Confirm follow-up date"
                        : "📅 Xác nhận lịch tái khám",
                      prompt: isEn
                        ? "When is our scheduled follow-up skin cytology checkup at the clinic?"
                        : "Cho em hỏi lịch tái khám soi da cụ thể tại phòng khám với bác sĩ vào ngày nào ạ?",
                    },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendUserMessage(chip.prompt)}
                      title={
                        isEn
                          ? "Click to send simulated inquiry"
                          : "Bấm để gửi ngay câu hỏi mô phỏng"
                      }
                      className="rounded-full border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-medium text-foreground transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap shadow-2xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Field */}
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 sm:p-4 border-t border-border bg-card flex items-center gap-1.5 sm:gap-2 shrink-0"
              >
                {canFormulate && (
                  <button
                    type="button"
                    onClick={() => setShowFormulateModal(true)}
                    title={
                      isEn
                        ? "Formulate Care Task"
                        : "Kế hoạch hóa lộ trình điều trị"
                    }
                    className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
                  >
                    <PlusCircle className="size-4 sm:size-5" />
                  </button>
                )}

                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={
                    isEn
                      ? "Message attending veterinarian..."
                      : "Nhắn tin cho bác sĩ phụ trách..."
                  }
                  className="flex-1 rounded-xl sm:rounded-2xl border border-border bg-background px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="submit"
                  disabled={!inputMsg.trim()}
                  className="inline-flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-primary text-primary-foreground shadow hover:opacity-95 transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="size-3.5 sm:size-4" />
                </button>
              </form>
            </Card>
          ) : (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              {isEn ? "No active clinic care plan." : "Chưa có phác đồ chăm sóc nào."}
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: LỘ TRÌNH CHĂM SÓC THÚ CƯNG (HẰNG NGÀY · TUẦN · THÁNG)  */}
      {/* ============================================================== */}
      {activeTab === "roadmap" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main Grid: Left Plan Selector + Right Selected Plan Detail */}
          {filteredPlans.length === 0 ? (
            <Card className="p-10 text-center space-y-3 border-dashed border-border bg-card">
              <p className="font-bold text-base text-foreground">
                {isEn ? "No care plans found" : "Chưa có đề xuất kế hoạch chăm sóc"}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isEn
                  ? "When a treating clinic diagnoses your pet, their personalized recovery and care instructions will appear here."
                  : "Khi bác sĩ thú y tại phòng khám thăm khám cho bé, phác đồ điều trị và lộ trình chăm sóc dặn dò sẽ được gửi trực tiếp tới đây."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: List of Plans */}
              <div className="space-y-3 lg:col-span-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {isEn ? "Treatment Protocols" : "Danh sách phác đồ y khoa"} (
                    {filteredPlans.length})
                  </h2>
                </div>

                <div className="space-y-3">
                  {filteredPlans.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    const completedCount = plan.tasks.filter(
                      (t) => t.completed
                    ).length;
                    const countTotal = plan.tasks.length;
                    const progressPct =
                      countTotal > 0
                        ? Math.round((completedCount / countTotal) * 100)
                        : 0;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setActivePlanId(plan.id)}
                        className={`cursor-pointer rounded-2xl border p-4 transition text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                              #{plan.petName.slice(0, 1)}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-foreground">
                                  {plan.petName}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  · {plan.horizonMonths} {isEn ? "months" : "tháng"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-[200px]">
                                {plan.clinicName}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                              plan.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : plan.status === "active"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {plan.status === "completed"
                              ? isEn
                                ? "Completed"
                                : "Đã hoàn thành"
                              : plan.status === "active"
                              ? isEn
                                ? "Active"
                                : "Đang thực hiện"
                              : isEn
                              ? "New Proposal"
                              : "Đề xuất mới"}
                          </span>
                        </div>

                        <p className="mt-2.5 text-xs font-semibold text-foreground line-clamp-2">
                          {plan.diagnosis}
                        </p>

                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {isEn ? "Tasks completed:" : "Tiến độ thực hiện:"}{" "}
                              <strong className="text-foreground">
                                {completedCount}/{countTotal}
                              </strong>
                            </span>
                            <span className="font-bold text-primary">
                              {progressPct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Plan Comprehensive Breakdown */}
              {selectedPlan && (
                <div className="space-y-4 lg:col-span-8">
                  <Card className="p-5 sm:p-6 border-border bg-card space-y-5 rounded-3xl">
                    {/* Plan Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-border/70 pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            {isEn ? "Patient:" : "Bệnh nhân:"}{" "}
                            {selectedPlan.petName}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              selectedPlan.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : selectedPlan.status === "active"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {selectedPlan.status === "completed"
                              ? isEn
                                ? "Completed Protocol"
                                : "Phác đồ đã hoàn thành"
                              : selectedPlan.status === "active"
                              ? isEn
                                ? "Active In Treatment"
                                : "Đang trong lộ trình chăm sóc"
                              : isEn
                              ? "Pending Your Acceptance"
                              : "Đề xuất mới từ phòng khám"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border/50">
                            {isEn ? "Clinic-Prescribed Plan" : "Lộ trình do phòng khám kế hoạch hóa"}
                          </span>
                        </div>

                        <h3 className="font-display text-lg sm:text-xl font-bold text-foreground pt-1">
                          {selectedPlan.diagnosis}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                          <span className="text-foreground font-medium">
                            {selectedPlan.clinicName}
                          </span>
                          <span>·</span>
                          <span>
                            {selectedPlan.doctorName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct CTA to open chat with this clinic */}
                        <button
                          type="button"
                          onClick={() => setActiveTab("chat")}
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer"
                        >
                          <MessageSquare className="size-3.5" />
                          <span>{isEn ? "Consultation Chat" : "Chat Với Bác Sĩ"}</span>
                        </button>

                        {selectedPlan.status === "pending_owner" && (
                          <button
                            onClick={() => handleAcceptProposal(selectedPlan.id)}
                            className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-95 transition shrink-0 cursor-pointer"
                          >
                            <span>
                              {isEn ? "Accept & Begin Plan" : "Tiếp nhận & Thực hiện"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Doctor Online Consultation Banner in Roadmap Tab */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground text-lg shadow-2xs">
                            🩺
                          </span>
                          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-emerald-500 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs sm:text-sm text-foreground">
                              {selectedPlan.doctorName}
                            </p>
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              {isEn ? "Online Desk" : "Trực tuyến tư vấn"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isEn
                              ? `Attending veterinarian is online. Tap to open the interactive simulation chat for ${selectedPlan.petName}.`
                              : `Bác sĩ đang trực tuyến theo dõi phác đồ của bé ${selectedPlan.petName}. Có thắc mắc về liều thuốc hay chăm sóc, bạn có thể trao đổi ngay.`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("chat")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-2xs cursor-pointer shrink-0"
                      >
                        <MessageSquare className="size-3.5" />
                        <span>
                          {isEn
                            ? "Open Consultation Chat"
                            : "Mở Khung Chat Tư Vấn"}
                        </span>
                      </button>
                    </div>

                    {/* Follow-up reminder box */}
                    <div className="flex items-center justify-between rounded-2xl bg-primary/10 p-4 border border-primary/20">
                      <div>
                        <p className="text-xs font-semibold text-primary">
                          {isEn
                            ? "Scheduled Follow-up Date"
                            : "Lịch hẹn tái khám dự kiến"}
                        </p>
                        <p className="font-bold text-sm text-foreground">
                          {selectedPlan.nextFollowUpDate}
                        </p>
                      </div>

                      <Link
                        href={`/${locale}/owner/appointments?clinicId=${encodeURIComponent(
                          selectedPlan.clinicId
                        )}&pet=${encodeURIComponent(selectedPlan.petName)}`}
                        className="inline-flex items-center rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition shadow-2xs"
                      >
                        <span>{isEn ? "Book Slot" : "Đặt lịch ngay"}</span>
                      </Link>
                    </div>

                    {/* Dietary and Clinical Instructions */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedPlan.dietInstructions && (
                        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <Utensils className="size-3.5" />
                            <span>
                              {isEn ? "Dietary Guidelines" : "Dặn dò dinh dưỡng"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                            {selectedPlan.dietInstructions}
                          </p>
                        </div>
                      )}

                      {selectedPlan.generalNotes && (
                        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <FileText className="size-3.5" />
                            <span>
                              {isEn
                                ? "Doctor's Advice"
                                : "Lời dặn của bác sĩ điều trị"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                            {selectedPlan.generalNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ============================================================== */}
                    {/* 3 CADENCE PROGRESS CARDS (HẰNG NGÀY · HÀNG TUẦN · HÀNG THÁNG) */}
                    {/* ============================================================== */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          {isEn
                            ? "Care Routines by Cadence"
                            : "Lộ trình chăm sóc theo chu kỳ"}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {isEn
                            ? "Tap a card to filter"
                            : "Chọn để xem từng lộ trình"}
                        </span>
                      </div>

                      {/* 3 Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Daily Routine Card */}
                        <button
                          type="button"
                          onClick={() =>
                            setCadenceFilter(
                              cadenceFilter === "daily" ? "all" : "daily"
                            )
                          }
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                            cadenceFilter === "daily"
                              ? "border-sky-500 bg-sky-500/10 shadow-xs ring-2 ring-sky-500/30"
                              : "border-border bg-card hover:border-sky-500/50 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
                              {isEn ? "Daily" : "Hằng ngày"}
                            </span>
                            <span className="text-xs font-black text-foreground">
                              {completedDaily}/{dailyTasks.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {isEn ? "Home care routine" : "Thực hiện cố định tại nhà"}
                          </p>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mt-2.5">
                            <div
                              className="h-full bg-sky-500 transition-all duration-300"
                              style={{
                                width: `${
                                  dailyTasks.length > 0
                                    ? Math.round(
                                        (completedDaily / dailyTasks.length) * 100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </button>

                        {/* 2. Weekly Routine Card */}
                        <button
                          type="button"
                          onClick={() =>
                            setCadenceFilter(
                              cadenceFilter === "weekly" ? "all" : "weekly"
                            )
                          }
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                            cadenceFilter === "weekly"
                              ? "border-amber-500 bg-amber-500/10 shadow-xs ring-2 ring-amber-500/30"
                              : "border-border bg-card hover:border-amber-500/50 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                              {isEn ? "Weekly" : "Hàng tuần"}
                            </span>
                            <span className="text-xs font-black text-foreground">
                              {completedWeekly}/{weeklyTasks.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {isEn ? "Hygiene & nutrition" : "Vệ sinh & Bổ trợ"}
                          </p>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mt-2.5">
                            <div
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{
                                width: `${
                                  weeklyTasks.length > 0
                                    ? Math.round(
                                        (completedWeekly / weeklyTasks.length) * 100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </button>

                        {/* 3. Monthly Routine Card */}
                        <button
                          type="button"
                          onClick={() =>
                            setCadenceFilter(
                              cadenceFilter === "monthly" ? "all" : "monthly"
                            )
                          }
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                            cadenceFilter === "monthly"
                              ? "border-purple-500 bg-purple-500/10 shadow-xs ring-2 ring-purple-500/30"
                              : "border-border bg-card hover:border-purple-500/50 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-800 dark:text-purple-300">
                              {isEn ? "Monthly" : "Hàng tháng"}
                            </span>
                            <span className="text-xs font-black text-foreground">
                              {completedMonthly}/{monthlyTasks.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {isEn ? "Checkups & vaccines" : "Tái khám & Phòng ngừa"}
                          </p>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mt-2.5">
                            <div
                              className="h-full bg-purple-500 transition-all duration-300"
                              style={{
                                width: `${
                                  monthlyTasks.length > 0
                                    ? Math.round(
                                        (completedMonthly /
                                          monthlyTasks.length) *
                                          100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* ============================================================== */}
                    {/* TASK LIST DISPLAY: GROUPED OR FILTERED */}
                    {/* ============================================================== */}
                    <div className="space-y-6 pt-1">
                      {/* DAILY GROUP */}
                      {(cadenceFilter === "all" || cadenceFilter === "daily") &&
                        dailyTasks.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                {isEn
                                  ? "Daily Care Routine"
                                  : "Lộ trình chăm sóc hằng ngày"}
                              </h5>
                              <span className="text-[11px] text-muted-foreground font-semibold">
                                {completedDaily}/{dailyTasks.length}{" "}
                                {isEn ? "done" : "xong"}
                              </span>
                            </div>

                            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                              {dailyTasks.map(renderTaskItem)}
                            </div>
                          </div>
                        )}

                      {/* WEEKLY & MONTHLY GROUPS (FREE PREVIEW LOCKED / PREMIUM UNLOCKED) */}
                      {isFree ? (
                        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-3">
                          <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
                            <Lock className="size-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-foreground">
                              {isEn
                                ? "Specialized Weekly & Monthly Clinical Protocols (Premium)"
                                : "Phác đồ điều trị chuyên sâu Hàng tuần & Hàng tháng (Gói Premium)"}
                            </h5>
                            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                              {isEn
                                ? `${weeklyTasks.length + monthlyTasks.length} specialized clinic tasks (medication cadences, therapeutic baths, and doctor checkups) are reserved for PawCare Premium members.`
                                : `${weeklyTasks.length + monthlyTasks.length} nhiệm vụ điều trị chuyên sâu (liều lượng tuần hoàn, tắm dược liệu và lịch tái khám định kỳ) là đặc quyền mở khóa trên PawCare Premium (89.000 ₫/tháng).`}
                            </p>
                          </div>
                          <Link
                            href={`/${locale}/owner/billing`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-sm cursor-pointer"
                          >
                            <Sparkles className="size-3.5" />
                            <span>{isEn ? "Upgrade to Unlock Full Roadmap (89k/mo)" : "Nâng cấp Premium mở khóa toàn bộ (89k/tháng)"}</span>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {/* WEEKLY GROUP */}
                          {(cadenceFilter === "all" || cadenceFilter === "weekly") &&
                            weeklyTasks.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    {isEn
                                      ? "Weekly Care Routine"
                                      : "Lộ trình chăm sóc hàng tuần"}
                                  </h5>
                                  <span className="text-[11px] text-muted-foreground font-semibold">
                                    {completedWeekly}/{weeklyTasks.length}{" "}
                                    {isEn ? "done" : "xong"}
                                  </span>
                                </div>

                                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                                  {weeklyTasks.map(renderTaskItem)}
                                </div>
                              </div>
                            )}

                          {/* MONTHLY GROUP */}
                          {(cadenceFilter === "all" || cadenceFilter === "monthly") &&
                            monthlyTasks.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    {isEn
                                      ? "Monthly Milestones & Vet Checkups"
                                      : "Lộ trình hàng tháng & Tái khám"}
                                  </h5>
                                  <span className="text-[11px] text-muted-foreground font-semibold">
                                    {completedMonthly}/{monthlyTasks.length}{" "}
                                    {isEn ? "done" : "xong"}
                                  </span>
                                </div>

                                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                                  {monthlyTasks.map(renderTaskItem)}
                                </div>
                              </div>
                            )}
                        </>
                      )}

                      {/* Empty state for specific filter */}
                      {cadenceFilter === "daily" && dailyTasks.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-6">
                          {isEn
                            ? "No daily tasks scheduled in this plan."
                            : "Chưa có nhiệm vụ hằng ngày nào trong phác đồ này."}
                        </p>
                      )}
                      {cadenceFilter === "weekly" && weeklyTasks.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-6">
                          {isEn
                            ? "No weekly tasks scheduled in this plan."
                            : "Chưa có nhiệm vụ hàng tuần nào trong phác đồ này."}
                        </p>
                      )}
                      {cadenceFilter === "monthly" && monthlyTasks.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-6">
                          {isEn
                            ? "No monthly tasks scheduled in this plan."
                            : "Chưa có nhiệm vụ hàng tháng nào trong phác đồ này."}
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: KẾ HOẠCH HÓA LỘ TRÌNH CHO BÊN PHÒNG KHÁM                 */}
      {/* ============================================================== */}
      {showFormulateModal && canFormulate && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Stethoscope className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                    {isEn
                      ? "Formulate Care Routine Protocol"
                      : "Kế Hoạch Hóa Lộ Trình Cho Phòng Khám"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? `Assign medical tasks & recovery routine for ${selectedPlan.petName}`
                      : `Thiết lập chỉ định y khoa & lộ trình chăm sóc cho bé ${selectedPlan.petName}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFormulateModal(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Templates Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isEn
                  ? "Quick Clinical Templates:"
                  : "Mẫu phác đồ gợi ý nhanh từ phòng khám:"}
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  {
                    title: "Uống thuốc kháng viêm & phục hồi da",
                    cadence: "daily" as const,
                    category: "treatment" as const,
                    schedule: "08:00 sáng sau ăn no",
                    notes: "Uống đều đặn mỗi sáng, tránh quên liều.",
                    vetVisit: false,
                    label: "💊 Kháng viêm (Hằng ngày)",
                  },
                  {
                    title: "Tắm trị liệu bằng sữa tắm Malaseb dược liệu",
                    cadence: "weekly" as const,
                    category: "hygiene" as const,
                    schedule: "Thứ 4 & Chủ nhật",
                    notes: "Massage bọt thuốc 10 phút trước khi xả sạch.",
                    vetVisit: false,
                    label: "🧴 Tắm dược liệu (Hàng tuần)",
                  },
                  {
                    title: "Chế độ hạt dinh dưỡng đạm thủy phân kiêng dị ứng",
                    cadence: "daily" as const,
                    category: "diet" as const,
                    schedule: "2 bữa mỗi ngày",
                    notes: "Kiêng tuyệt đối thịt bò, gà và thức ăn cay mặn.",
                    vetVisit: false,
                    label: "🍲 Dinh dưỡng kiêng (Hằng ngày)",
                  },
                  {
                    title: "Tái khám kiểm tra bề mặt tổn thương & chỉ số sinh tồn",
                    cadence: "monthly" as const,
                    category: "checkup" as const,
                    schedule: "Ngày tái khám dự kiến",
                    notes: "Đưa bé đến phòng khám để bác sĩ trực tiếp đánh giá.",
                    vetVisit: true,
                    label: "🩺 Tái khám tại viện (Hàng tháng)",
                  },
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyQuickTemplate(tpl)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary px-2.5 py-1 text-xs font-medium text-foreground transition cursor-pointer"
                  >
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFormulatedTask} className="space-y-4 pt-1">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>
                    {isEn ? "Task Title / Medical Order" : "Tên chỉ định y khoa / Nhiệm vụ"}
                  </span>
                  <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formulateTitle}
                  onChange={(e) => setFormulateTitle(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g., Daily antibiotic dose, Weekly therapeutic bath..."
                      : "VD: Uống kháng sinh Amoxicillin 250mg, Tắm dược liệu sát khuẩn..."
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Cadence Selection (Daily · Weekly · Monthly) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {isEn ? "Execution Cadence (Cycle)" : "Chu kỳ thực hiện (Bắt buộc)"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "daily", label: isEn ? "Daily" : "Hằng ngày", icon: Sun, color: "text-sky-500" },
                    { id: "weekly", label: isEn ? "Weekly" : "Hàng tuần", icon: Calendar, color: "text-amber-500" },
                    { id: "monthly", label: isEn ? "Monthly" : "Hàng tháng", icon: CalendarDays, color: "text-purple-500" },
                  ].map((cad) => {
                    const CadIcon = cad.icon;
                    const isSelected = formulateCadence === cad.id;
                    return (
                      <button
                        key={cad.id}
                        type="button"
                        onClick={() => setFormulateCadence(cad.id as any)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <CadIcon className={`size-4 ${cad.color}`} />
                        <span>{cad.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & Specific Schedule */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {isEn ? "Medical Category" : "Phân loại chuyên môn"}
                  </label>
                  <select
                    value={formulateCategory}
                    onChange={(e) =>
                      setFormulateCategory(e.target.value as any)
                    }
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="treatment">
                      {isEn ? "Medical Treatment (Thuốc)" : "Điều trị y tế (Uống/Bôi thuốc)"}
                    </option>
                    <option value="diet">
                      {isEn ? "Dietary Care" : "Chế độ dinh dưỡng"}
                    </option>
                    <option value="hygiene">
                      {isEn ? "Hygiene & Skin" : "Vệ sinh & Da lông"}
                    </option>
                    <option value="vaccination">
                      {isEn ? "Vaccination" : "Tiêm phòng vắc-xin"}
                    </option>
                    <option value="checkup">
                      {isEn ? "Vet Checkup" : "Tái khám thú y"}
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {isEn ? "Timing / Frequency details" : "Thời điểm / Lịch cụ thể"}
                  </label>
                  <input
                    type="text"
                    value={formulateSchedule}
                    onChange={(e) => setFormulateSchedule(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g., 08:00 AM after meal"
                        : "VD: 08:00 sáng sau ăn no, Thứ 4 & Chủ nhật"
                    }
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Due Date & Clinic Visit Required */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    {isEn ? "Target Due Date" : "Hạn chót hoàn thành"}
                  </label>
                  <input
                    type="date"
                    required
                    value={formulateDueDate}
                    onChange={(e) => setFormulateDueDate(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    id="vet-visit-req"
                    type="checkbox"
                    checked={formulateVetVisit}
                    onChange={(e) => setFormulateVetVisit(e.target.checked)}
                    className="size-4.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="vet-visit-req"
                    className="text-xs font-bold text-foreground cursor-pointer select-none"
                  >
                    {isEn
                      ? "Requires in-clinic veterinary visit"
                      : "Cần đến khám trực tiếp tại phòng khám"}
                  </label>
                </div>
              </div>

              {/* Doctor's Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  {isEn ? "Doctor's Advice & Dosage Notes" : "Dặn dò của bác sĩ & Hướng dẫn sử dụng"}
                </label>
                <textarea
                  rows={2}
                  value={formulateNotes}
                  onChange={(e) => setFormulateNotes(e.target.value)}
                  placeholder={
                    isEn
                      ? "Instructions, dosage, precautions..."
                      : "Liều lượng, cách bảo quản thuốc, dấu hiệu cần báo ngay cho bác sĩ..."
                  }
                  className="w-full rounded-2xl border border-border bg-background p-3 text-xs leading-relaxed focus:border-primary focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowFormulateModal(false)}
                  className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  {isEn ? "Cancel" : "Hủy bỏ"}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:opacity-95 transition cursor-pointer"
                >
                  <Check className="size-4" />
                  <span>
                    {isEn
                      ? "Save to Clinic Roadmap"
                      : "Lưu & Bổ sung vào lộ trình"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
