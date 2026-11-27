"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  User,
  Lock,
  CreditCard,
  Palette,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  Check,
  Trash2,
  ExternalLink,
  LogOut,
  Smartphone,
  Mail,
  Bell,
  Clock,
  HelpCircle,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Globe,
  Monitor,
  ShieldAlert,
  Send,
  Sliders,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";
import { signOutAction } from "@/app/actions/auth";
import { PortalSyncBridge } from "@/components/shell/portal-sync-bridge";

interface PersonalSettingsProps {
  initialProfile?: {
    full_name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    birthDate?: string;
    city?: string;
    address?: string;
    emergencyContact?: string;
  };
  role?: string;
}

type TabType =
  | "profile"
  | "security"
  | "billing"
  | "reminders"
  | "support";

interface ReminderItem {
  id: string;
  petName: string;
  title: string;
  dueDate: string;
  category: "vaccine" | "deworm" | "medication" | "checkup" | "other";
  completed: boolean;
}

interface CareLogItem {
  id: string;
  date: string;
  petName: string;
  activity: string;
  location?: string;
}

export function PersonalSettingsView({
  initialProfile,
  role = "owner",
}: PersonalSettingsProps) {
  const locale = useLocale();
  const isEn = locale === "en";
  const pathname = usePathname();

  // Active Tab State (defaults to profile or URL hash)
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        const raw = window.location.hash.replace("#", "");
        const hash = (raw === "password" ? "security" : raw) as TabType;
        if (
          [
            "profile",
            "security",
            "billing",
            "reminders",
            "support",
          ].includes(hash)
        ) {
          setActiveTab(hash);
        } else {
          setActiveTab("profile");
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sign out state & handler
  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleSignOut = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pawcare_synced_owner_id");
        } catch {}
      }
      await fetch(`/api/auth/sign-out?locale=${locale}`, { method: "POST" }).catch(() => {});
      const fd = new FormData();
      fd.set("locale", locale);
      await signOutAction(fd).catch(() => {});
    } catch {
    } finally {
      window.location.href = `/${locale}/sign-in`;
    }
  };

  // ==========================================
  // TAB 1: Profile State
  // ==========================================
  const [profile, setProfile] = useState({
    fullName: initialProfile?.full_name || "",
    phone: initialProfile?.phone || "",
    email: initialProfile?.email || "",
    gender: initialProfile?.gender || "male",
    birthDate: initialProfile?.birthDate || "1992-05-18",
    city: initialProfile?.city || "TP. Hồ Chí Minh",
    address: initialProfile?.address || "",
    emergencyContact: initialProfile?.emergencyContact || "",
  });

  // Sync profile from localStorage (onboarding input page or previous saves)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const syncProfileFromStorage = () => {
        try {
          const raw = localStorage.getItem("pawcare-user-profile");
          if (raw) {
            const parsed = JSON.parse(raw);
            setProfile((prev) => ({
              ...prev,
              fullName: parsed.fullName || parsed.full_name || prev.fullName || "Chủ nuôi",
              phone: parsed.phone || prev.phone,
              email: parsed.email || prev.email,
              gender: parsed.gender || prev.gender,
              birthDate: parsed.birthDate || prev.birthDate,
              city: parsed.city || prev.city,
              address: parsed.address || prev.address,
              emergencyContact: parsed.emergencyContact || prev.emergencyContact,
            }));
            return;
          }
          const storedName = localStorage.getItem("pawcare-owner-name");
          const storedPhone = localStorage.getItem("pawcare-user-phone");
          if (storedName || storedPhone) {
            setProfile((prev) => ({
              ...prev,
              fullName: storedName || prev.fullName,
              phone: storedPhone || prev.phone,
            }));
          }
        } catch {}
      };

      syncProfileFromStorage();
      window.addEventListener("pawcare-user-profile-updated", syncProfileFromStorage);
      return () =>
        window.removeEventListener("pawcare-user-profile-updated", syncProfileFromStorage);
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pawcare-user-profile", JSON.stringify(profile));
        localStorage.setItem("pawcare-owner-name", profile.fullName);
        if (profile.phone) localStorage.setItem("pawcare-user-phone", profile.phone);
        window.dispatchEvent(
          new CustomEvent("pawcare-user-profile-updated", { detail: profile })
        );
      } catch {}
    }
    showToast(isEn ? "Account profile saved successfully!" : "Đã lưu thông tin tài khoản thành công!");
  };

  // ==========================================
  // Care Logs & Reminders State
  // ==========================================
  const [reminders, setReminders] = useState<ReminderItem[]>([
    {
      id: "rem-1",
      petName: "Milo",
      title: isEn ? "Annual Rabies Booster Vaccination" : "Tiêm nhắc lại Mũi dại định kỳ hàng năm",
      dueDate: "2026-11-15",
      category: "vaccine",
      completed: false,
    },
    {
      id: "rem-2",
      petName: "Milo",
      title: isEn ? "Quarterly Deworming & Flea Preventative" : "Tẩy giun & nhỏ gáy phòng ve rận Q4",
      dueDate: "2026-11-05",
      category: "deworm",
      completed: false,
    },
    {
      id: "rem-3",
      petName: "Luna",
      title: isEn ? "Dental Cleaning & General Health Checkup" : "Vệ sinh răng miệng & Khám tổng quát",
      dueDate: "2026-11-20",
      category: "checkup",
      completed: false,
    },
    {
      id: "rem-4",
      petName: "Milo",
      title: isEn ? "DHPPi Core Vaccine 5-in-1" : "Mũi nhắc 5 bệnh chó mèo cơ bản",
      dueDate: "2026-10-10",
      category: "vaccine",
      completed: true,
    },
  ]);

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({
    petName: "Milo",
    title: "",
    dueDate: "",
    category: "vaccine" as ReminderItem["category"],
  });

  useEffect(() => {
    const loadStoredReminders = () => {
      try {
        const stored = localStorage.getItem("pawcare-care-reminders");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReminders(parsed);
            return;
          }
        }
      } catch {}
      try {
        localStorage.setItem("pawcare-care-reminders", JSON.stringify(reminders));
      } catch {}
    };

    loadStoredReminders();
    window.addEventListener("pawcare-reminders-updated", loadStoredReminders);
    window.addEventListener("storage", loadStoredReminders);
    return () => {
      window.removeEventListener("pawcare-reminders-updated", loadStoredReminders);
      window.removeEventListener("storage", loadStoredReminders);
    };
  }, []);

  const saveRemindersList = (items: ReminderItem[]) => {
    setReminders(items);
    try {
      localStorage.setItem("pawcare-care-reminders", JSON.stringify(items));
      window.dispatchEvent(
        new CustomEvent("pawcare-reminders-updated", { detail: items })
      );
    } catch {}
  };

  const handleToggleReminder = (id: string) => {
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    saveRemindersList(updated);
    showToast(isEn ? "Reminder status updated" : "Đã cập nhật trạng thái lịch nhắc");
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    saveRemindersList(updated);
    showToast(isEn ? "Reminder removed" : "Đã xóa lịch nhắc");
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.title.trim()) return;
    const item: ReminderItem = {
      id: `rem-${Date.now()}`,
      petName: newReminder.petName,
      title: newReminder.title.trim(),
      dueDate: newReminder.dueDate || new Date().toISOString().split("T")[0],
      category: newReminder.category,
      completed: false,
    };
    const updated = [item, ...reminders];
    saveRemindersList(updated);
    setNewReminder({ petName: "Milo", title: "", dueDate: "", category: "vaccine" });
    setShowAddReminder(false);
    showToast(isEn ? "New care reminder created!" : "Đã thêm lịch nhắc mới thành công!");
  };

  const careLogs: CareLogItem[] = [
    {
      id: "log-1",
      date: "25/10/2026",
      petName: "Milo",
      activity: isEn ? "Updated weight to 4.5kg" : "Cập nhật cân nặng 4.5 kg",
      location: isEn ? "Owner Portal" : "Sổ y bạ PawCare",
    },
    {
      id: "log-2",
      date: "20/10/2026",
      petName: "Milo",
      activity: isEn ? "Booked general wellness checkup" : "Đặt lịch khám tổng quát",
      location: "PetCare Clinic Q1",
    },
    {
      id: "log-3",
      date: "10/10/2026",
      petName: "Milo",
      activity: isEn ? "Administered 5-in-1 DHPPi Vaccine" : "Hoàn thành tiêm vaccine 5 bệnh",
      location: "PawCare Central Clinic",
    },
    {
      id: "log-4",
      date: "01/10/2026",
      petName: "Luna",
      activity: isEn ? "Linked ISO microchip VN-PC-89102" : "Gắn mã vi mạch số VN-PC-89102",
      location: isEn ? "Digital Passport" : "Y bạ điện tử",
    },
  ];

  // ==========================================
  // TAB 5: Support & Help State
  // ==========================================
  const [supportCategory, setSupportCategory] = useState("technical");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSubmitted(true);
    setSupportSubject("");
    setSupportMessage("");
    showToast(
      isEn
        ? "Support request submitted! We will respond within 15 minutes."
        : "Đã gửi yêu cầu hỗ trợ! Đội ngũ PawCare sẽ liên hệ trong 15 phút."
    );
    setTimeout(() => setSupportSubmitted(false), 5000);
  };

  const faqs = [
    {
      q: isEn
        ? "How do I look up pet health records with the microchip code?"
        : "Làm thế nào để tra cứu sổ y bạ khi thú cưng bị lạc qua mã vi mạch?",
      a: isEn
        ? "Anyone can scan your pet's QR tag or enter their 15-digit microchip code on the PawCare portal to immediately view the verified health passport and owner contact information."
        : "Bất kỳ ai khi tìm thấy bé có thể quét mã QR trên vòng cổ hoặc nhập mã vi mạch 15 số trên PawCare để xem ngay thông tin y bạ, số điện thoại liên hệ khẩn cấp của chủ nuôi.",
    },
    {
      q: isEn
        ? "Can I share my pet's medical records with another clinic or veterinarian?"
        : "Cách chia sẻ hồ sơ bệnh án với bác sĩ hoặc phòng khám mới?",
      a: isEn
        ? "Yes! Open your pet's passport and tap 'Share Records'. You can grant secure time-limited access (e.g. 24 hours or 7 days) via QR code or clinical grant link."
        : "Hoàn toàn được! Bạn vào mục 'Hồ sơ thú cưng' > chọn bé > bấm 'Chia sẻ y bạ'. Bạn có thể cấp quyền truy cập bảo mật có thời hạn (24 giờ hoặc 7 ngày) qua mã QR hoặc đường link cấp quyền.",
    },
    {
      q: isEn
        ? "How far in advance can I reschedule or cancel a clinic appointment?"
        : "Tôi có thể đổi hoặc hủy lịch khám trước bao lâu?",
      a: isEn
        ? "You can reschedule or cancel free of charge up to 2 hours prior to the appointment time directly from the Bookings page."
        : "Bạn có thể đổi giờ hoặc hủy lịch hẹn hoàn toàn miễn phí tối thiểu 2 tiếng trước giờ hẹn ngay trên trang Quản lý lịch hẹn.",
    },
    {
      q: isEn
        ? "Is my pet's medical and personal data securely encrypted?"
        : "Dữ liệu y tế và thông tin cá nhân của tôi có được bảo mật không?",
      a: isEn
        ? "All records, vaccine logs, and medical histories are encrypted with TLS 1.3 in transit and AES-256 at rest, conforming to ISO veterinary data safety standards."
        : "Toàn bộ thông tin y bạ, lịch tiêm phòng và dữ liệu người dùng được mã hóa đầu cuối với chuẩn bảo mật TLS 1.3 và AES-256, tuân thủ các quy chuẩn dữ liệu y tế thú y.",
    },
  ];

  // ==========================================
  // TAB 6: Account & Security State
  // ==========================================
  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwords.newPassword.length < 8) {
      setPasswordError(
        isEn
          ? "New password must be at least 8 characters long."
          : "Mật khẩu mới phải có tối thiểu 8 ký tự."
      );
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError(
        isEn ? "New password confirmation does not match." : "Xác nhận mật khẩu mới không trùng khớp."
      );
      return;
    }
    setPasswords({ current: "", newPassword: "", confirmPassword: "" });
    showToast(isEn ? "Password changed successfully!" : "Đổi mật khẩu tài khoản thành công!");
  };

  // ==========================================
  // Billing State
  // ==========================================
  const paymentMethods = [
    {
      id: "pm-01",
      type: "card",
      brand: "Visa",
      last4: "4242",
      expiry: "08/28",
      isDefault: true,
    },
    {
      id: "pm-02",
      type: "momo",
      brand: "Ví MoMo",
      account: "0908 ••• 456",
      isDefault: false,
    },
  ];

  const isClinic = role === "clinic_admin" || role === "clinic_staff";
  const mainHref = isClinic ? `/${locale}/clinic` : `/${locale}/owner`;

  // Settings Tabs List (Focused on Account Settings)
  const tabsList: Array<{
    id: TabType;
    label: string;
    icon: any;
    badge?: string;
  }> = [
    {
      id: "profile",
      label: isEn ? "Account Profile" : "Hồ sơ tài khoản",
      icon: User,
    },
    {
      id: "security",
      label: isEn ? "Security & Sessions" : "Bảo mật & Phiên đăng nhập",
      icon: ShieldCheck,
    },
    {
      id: "billing",
      label: isEn ? "Billing & Plans" : "Thanh toán & Gói cước",
      icon: CreditCard,
    },
    {
      id: "reminders",
      label: isEn ? "Care Logs & Reminders" : "Nhật ký & Lịch nhắc",
      icon: Clock,
      badge: String(reminders.filter((r) => !r.completed).length),
    },
    {
      id: "support",
      label: isEn ? "Help & Support" : "Trợ giúp & Hỗ trợ",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton
          fallbackHref={mainHref}
          label={isEn ? "Back to Main" : "Quay về Trang chính"}
          variant="pill"
        />
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {isEn ? "Account Settings" : "Cài đặt tài khoản"}
          </span>
        </div>
      </div>

      {/* Header Info: Renamed cleanly to "Account Settings" / "Cài đặt tài khoản" */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-foreground">
            {isEn ? "Account Settings" : "Cài đặt tài khoản"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {isEn
              ? "Manage your personal profile, security credentials, active sessions, care logs, and billing details."
              : "Quản lý thông tin hồ sơ cá nhân, mật khẩu, bảo mật phiên đăng nhập, nhật ký chăm sóc và gói dịch vụ."}
          </p>
        </div>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 sm:text-sm animate-in fade-in shadow-xs"
        >
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Navigation Tabs (Horizontal Scrollable on Mobile) */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-1.5 scrollbar-none">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (typeof window !== "undefined") {
                  window.location.hash = tab.id;
                }
              }}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition sm:text-sm cursor-pointer ${
                isSelected
                  ? "border-primary text-primary bg-primary/10 rounded-t-xl shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-xl"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: THÔNG TIN CHỦ TÀI KHOẢN (ACCOUNT OWNER INFORMATION)                */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <Card className="p-5 sm:p-7 md:p-8 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-border pb-5">
            <div className="flex items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-sm">
                {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">
                  {profile.fullName || (isEn ? "Pet Owner" : "Chủ nuôi")}
                </h2>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />
                    {isEn ? "Email Verified" : "Email đã xác thực"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isEn ? "Owner Account" : "Tài khoản chủ nuôi"}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast(isEn ? "Avatar selection opened" : "Mở chức năng đổi ảnh đại diện")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <User className="size-3.5 text-primary" />
              <span>{isEn ? "Change Avatar" : "Đổi ảnh đại diện"}</span>
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Full Name" : "Họ và tên"}
              </label>
              <input
                required
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Phone Number" : "Số điện thoại"}
              </label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Primary Email Address" : "Địa chỉ Email chính"}
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="mt-1 w-full rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground outline-none opacity-85"
              />
              <span className="text-[11px] text-muted-foreground mt-1 inline-block">
                {isEn ? "Linked to PawCare ID security" : "Liên kết bảo mật tài khoản PawCare"}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Gender" : "Giới tính"}
              </label>
              <select
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="male">{isEn ? "Male" : "Nam"}</option>
                <option value="female">{isEn ? "Female" : "Nữ"}</option>
                <option value="other">{isEn ? "Other / Prefer not to say" : "Khác / Không tiết lộ"}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Date of Birth" : "Ngày sinh"}
              </label>
              <input
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">
                {isEn ? "City / Province" : "Tỉnh / Thành phố"}
              </label>
              <input
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Full Residential Address" : "Địa chỉ liên hệ cụ thể"}
              </label>
              <input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder={isEn ? "Street, ward, district..." : "Số nhà, tên đường, phường/xã, quận/huyện..."}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-foreground">
                {isEn ? "Emergency Contact (Family/Friend)" : "Người liên hệ khẩn cấp (Người thân / Bạn bè)"}
              </label>
              <input
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                placeholder={isEn ? "Name and phone number" : "Họ tên và số điện thoại người liên hệ"}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
              <span className="text-[11px] text-muted-foreground mt-1 inline-block">
                {isEn
                  ? "Used if veterinary clinic cannot reach you during medical emergencies."
                  : "Được phòng khám liên hệ khi có tình huống y tế khẩn cấp và không gọi được cho bạn."}
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 cursor-pointer"
              >
                {isEn ? "Save Account Changes" : "Lưu thay đổi thông tin"}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NHẬT KÝ & LỊCH NHẮC (LOGS & REMINDERS)                               */}
      {/* ========================================================================= */}
      {activeTab === "reminders" && (
        <div className="space-y-6">
          {/* Active Reminders Card */}
          <Card className="p-5 sm:p-7 md:p-8 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Clock className="size-5 text-primary" />
                  <span>{isEn ? "Upcoming Care Reminders" : "Lịch nhắc chăm sóc sắp tới"}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Track upcoming vaccine schedules, deworming cycles, and follow-up clinical visits."
                    : "Theo dõi các mốc tiêm nhắc lại, tẩy giun và lịch tái khám định kỳ của các bé."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddReminder(!showAddReminder)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus className="size-4" />
                <span>{isEn ? "Add Reminder" : "+ Thêm lịch nhắc"}</span>
              </button>
            </div>

            {/* Quick Add Reminder Expander */}
            {showAddReminder && (
              <form
                onSubmit={handleCreateReminder}
                className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-primary">
                    {isEn ? "New Reminder Details" : "Tạo lịch nhắc chăm sóc mới"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddReminder(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isEn ? "Cancel" : "Hủy"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      {isEn ? "Select Pet" : "Chọn thú cưng"}
                    </label>
                    <select
                      value={newReminder.petName}
                      onChange={(e) =>
                        setNewReminder({ ...newReminder, petName: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                    >
                      <option value="Milo">Milo (Corgi)</option>
                      <option value="Luna">Luna (British Shorthair)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      {isEn ? "Category" : "Loại nhắc nhở"}
                    </label>
                    <select
                      value={newReminder.category}
                      onChange={(e) =>
                        setNewReminder({
                          ...newReminder,
                          category: e.target.value as any,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold outline-none focus:border-primary"
                    >
                      <option value="vaccine">{isEn ? "Vaccination" : "Tiêm phòng vaccine"}</option>
                      <option value="deworm">{isEn ? "Deworming / Flea" : "Tẩy giun & ve rận"}</option>
                      <option value="checkup">{isEn ? "Clinical Checkup" : "Khám tổng quát / Tái khám"}</option>
                      <option value="medication">{isEn ? "Medication" : "Uống thuốc theo toa"}</option>
                      <option value="other">{isEn ? "Grooming / Spa" : "Tắm spa / Khác"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      {isEn ? "Due Date" : "Ngày đến hạn"}
                    </label>
                    <input
                      type="date"
                      required
                      value={newReminder.dueDate}
                      onChange={(e) =>
                        setNewReminder({ ...newReminder, dueDate: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">
                    {isEn ? "Reminder Title & Instructions" : "Tiêu đề & Hướng dẫn nhắc nhở"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      isEn
                        ? "e.g. Rabies Booster at Central Clinic"
                        : "Ví dụ: Mũi dại nhắc lại tại PetCare Clinic"
                    }
                    value={newReminder.title}
                    onChange={(e) =>
                      setNewReminder({ ...newReminder, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-90 transition cursor-pointer"
                  >
                    {isEn ? "Save Reminder" : "Lưu lịch nhắc"}
                  </button>
                </div>
              </form>
            )}

            {/* Reminders List */}
            <div className="space-y-2.5">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                    rem.completed
                      ? "border-border/60 bg-muted/30 opacity-70"
                      : "border-border bg-card hover:border-primary/40 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleReminder(rem.id)}
                      className="grid size-8 place-items-center rounded-xl border border-border/80 bg-background text-primary hover:bg-secondary transition shrink-0 cursor-pointer"
                      title={rem.completed ? (isEn ? "Mark active" : "Mở lại") : (isEn ? "Mark done" : "Đánh dấu hoàn thành")}
                    >
                      {rem.completed ? (
                        <Check className="size-4 text-emerald-600 font-bold" />
                      ) : (
                        <div className="size-3.5 rounded-sm border border-primary/60" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {rem.petName}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>{rem.dueDate}</span>
                        </span>
                      </div>
                      <p
                        className={`text-xs sm:text-sm font-bold truncate mt-0.5 ${
                          rem.completed ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {rem.title}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition rounded-lg hover:bg-muted shrink-0 cursor-pointer"
                    title={isEn ? "Delete reminder" : "Xóa lịch nhắc"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Logs Timeline */}
          <Card className="p-5 sm:p-7 md:p-8 space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <FileText className="size-4.5 text-primary" />
                <span>{isEn ? "Recent Care Logs & Timeline" : "Nhật ký chăm sóc & Lịch sử hoạt động"}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "Audit log of pet medical updates, weight measurements, and appointment history."
                  : "Lịch sử cập nhật y bạ, đo cân nặng và các buổi thăm khám gần nhất."}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {careLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 text-xs sm:text-sm"
                >
                  <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">
                        {log.petName} · {log.activity}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {log.date}
                      </span>
                    </div>
                    {log.location && (
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        📍 {log.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TRỢ GIÚP & HỖ TRỢ (SUPPORT & ASSISTANCE)                            */}
      {/* ========================================================================= */}
      {activeTab === "support" && (
        <div className="space-y-6">
          {/* Emergency & Support Contacts */}
          <Card className="p-5 sm:p-7 md:p-8 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <HelpCircle className="size-5 text-blue-500" />
                <span>{isEn ? "PawCare Help & Support Center" : "Trung tâm Trợ giúp & Hỗ trợ Khách hàng"}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "Reach our 24/7 dedicated veterinary team, customer care line, or read helpful guides."
                  : "Đội ngũ thú y và chăm sóc khách hàng PawCare túc trực 24/7 sẵn sàng đồng hành cùng bạn."}
              </p>
            </div>

            {/* Quick Contact Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <a
                href="tel:19006868"
                className="flex flex-col justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 transition hover:bg-destructive/10 group cursor-pointer"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-xl bg-destructive text-destructive-foreground">
                    <Phone className="size-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-3">
                    {isEn ? "Emergency Hotline 24/7" : "Đường dây nóng Cấp cứu"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? "First aid triage & ambulance" : "Tư vấn sơ cứu & điều phối cấp cứu"}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-destructive/20 flex items-center justify-between">
                  <span className="font-display font-extrabold text-destructive text-base">
                    1900 6868
                  </span>
                  <span className="text-[11px] font-bold text-destructive group-hover:underline">
                    {isEn ? "Call now →" : "Gọi ngay →"}
                  </span>
                </div>
              </a>

              <a
                href="https://zalo.me"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 transition hover:bg-blue-500/10 group cursor-pointer"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-xl bg-blue-500 text-white">
                    <MessageSquare className="size-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-3">
                    {isEn ? "Zalo Customer Care" : "Zalo Hỗ trợ Khách hàng"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? "Chat with support staff" : "Nhắn tin trực tiếp với chuyên viên"}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-blue-500/20 flex items-center justify-between">
                  <span className="font-display font-bold text-blue-600 dark:text-blue-400 text-sm">
                    0908 123 456
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                    {isEn ? "Chat Zalo →" : "Mở Zalo →"}
                  </span>
                </div>
              </a>

              <a
                href="mailto:support@pawcare.vn"
                className="flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4 transition hover:bg-primary/10 group cursor-pointer"
              >
                <div>
                  <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Mail className="size-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground mt-3">
                    {isEn ? "Technical Support" : "Hỗ trợ Kỹ thuật Email"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn ? "Account & passport issues" : "Sự cố tài khoản & lỗi hệ thống"}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-primary/20 flex items-center justify-between">
                  <span className="font-display font-bold text-primary text-xs truncate">
                    support@pawcare.vn
                  </span>
                  <span className="text-[11px] font-bold text-primary group-hover:underline shrink-0">
                    {isEn ? "Send →" : "Gửi →"}
                  </span>
                </div>
              </a>
            </div>

            {/* Frequently Asked Questions */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isEn ? "Frequently Asked Questions (FAQs)" : "Câu hỏi thường gặp"}
              </h3>

              <div className="space-y-2">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-card overflow-hidden transition"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left font-bold text-xs sm:text-sm text-foreground hover:bg-muted/30 transition cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {expandedFaq === idx ? (
                        <ChevronUp className="size-4 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/50 bg-muted/10 animate-in fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback / Contact Form */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isEn ? "Send Support Ticket or Feedback" : "Gửi yêu cầu trợ giúp hoặc Phản hồi ý kiến"}
              </h3>

              {supportSubmitted ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-1.5 animate-in fade-in">
                  <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="font-bold text-foreground text-sm">
                    {isEn ? "Ticket Received Successfully!" : "Đã gửi yêu cầu thành công!"}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {isEn
                      ? "Our technical support team has logged your ticket and will follow up via email shortly."
                      : "Bộ phận chăm sóc khách hàng đã tiếp nhận phản hồi và sẽ gửi email phản hồi đến bạn trong thời gian sớm nhất."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-foreground">
                        {isEn ? "Topic Category" : "Phân loại chủ đề"}
                      </label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
                      >
                        <option value="technical">{isEn ? "Technical Issue / Bug" : "Lỗi kỹ thuật / Sự cố ứng dụng"}</option>
                        <option value="passport">{isEn ? "Health Record & Microchip" : "Y bạ điện tử & Mã vi mạch"}</option>
                        <option value="billing">{isEn ? "Subscription & Billing" : "Thanh toán & Gói thành viên"}</option>
                        <option value="feedback">{isEn ? "Feature Request & Feedback" : "Đóng góp ý kiến cải tiến"}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground">
                        {isEn ? "Subject Summary" : "Tiêu đề yêu cầu"}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={isEn ? "Brief summary" : "Tóm tắt vấn đề cần hỗ trợ"}
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      {isEn ? "Detailed Message" : "Nội dung chi tiết"}
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder={
                        isEn
                          ? "Please describe your question or issue in detail..."
                          : "Vui lòng mô tả chi tiết vấn đề hoặc câu hỏi của bạn..."
                      }
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>{isEn ? "Send Support Request" : "Gửi yêu cầu hỗ trợ"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: TÀI KHOẢN & PHIÊN ĐĂNG NHẬP (ACCOUNT & SESSION SECURITY)            */}
      {/* ========================================================================= */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <Card className="p-5 sm:p-7 md:p-8 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Lock className="size-5 text-amber-500" />
                <span>{isEn ? "Change Account Password" : "Thay đổi Mật khẩu Tài khoản"}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "Protect your PawCare account with a strong, unique password."
                  : "Bảo vệ tài khoản và y bạ thú cưng của bạn bằng mật khẩu an toàn và duy nhất."}
              </p>
            </div>

            {passwordError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive animate-in fade-in"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-bold text-foreground">
                  {isEn ? "Current Password" : "Mật khẩu hiện tại"}
                </label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">
                  {isEn ? "New Password" : "Mật khẩu mới"}
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({ ...passwords, newPassword: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isEn
                    ? "At least 8 characters with numbers & symbols"
                    : "Ít nhất 8 ký tự bao gồm chữ cái, số và ký tự đặc biệt"}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">
                  {isEn ? "Confirm New Password" : "Xác nhận mật khẩu mới"}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPassword: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 cursor-pointer"
              >
                {isEn ? "Update Password" : "Cập nhật mật khẩu"}
              </button>
            </form>
          </Card>

          {/* Active Sessions Card */}
          <Card className="p-5 sm:p-7 md:p-8 space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Smartphone className="size-4.5 text-primary" />
                <span>{isEn ? "Active Device Sessions" : "Phiên đăng nhập đang hoạt động"}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "View and manage all web browsers and devices signed into your PawCare account."
                  : "Kiểm tra và quản lý các thiết bị di động, máy tính đang đăng nhập tài khoản của bạn."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs sm:text-sm">
                        {isEn ? "Current Mobile Device" : "Thiết bị di động hiện tại"}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {isEn ? "Active Now" : "Đang hoạt động"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Safari / Chrome Mobile · TP. Hồ Chí Minh, VN
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Laptop className="size-5" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground text-xs sm:text-sm block">
                      {isEn ? "Desktop Browser (Windows/macOS)" : "Trình duyệt máy tính (Windows/macOS)"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chrome 122 · TP. Hồ Chí Minh · {isEn ? "2 hours ago" : "2 giờ trước"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast(isEn ? "Remote session terminated" : "Đã ngắt phiên đăng nhập từ xa")
                  }
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-destructive transition cursor-pointer"
                >
                  {isEn ? "Revoke" : "Đăng xuất"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: BILLING & PAYMENT (PHƯƠNG THỨC THANH TOÁN & GÓI THÀNH VIÊN)          */}
      {/* ========================================================================= */}
      {activeTab === "billing" && (
        <Card className="p-5 sm:p-7 md:p-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <CreditCard className="size-5 text-emerald-500" />
                <span>{isEn ? "Payment Methods & CarePlans" : "Phương thức thanh toán & Gói dịch vụ"}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "Manage payment methods for clinic booking deposits and subscription plans."
                  : "Quản lý thẻ, ví điện tử dùng để đặt lịch khám và gia hạn gói thành viên PawCare."}
              </p>
            </div>
            <Link
              href={`/${locale}/owner/billing`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted shadow-2xs self-start sm:self-auto"
            >
              <span>{isEn ? "Manage Subscription" : "Chi tiết gói dịch vụ"}</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isEn ? "Linked Payment Cards & Wallets" : "Thẻ & Ví điện tử đã liên kết"}
            </h3>

            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-xl bg-secondary text-primary font-bold text-sm">
                    {pm.type === "card" ? "💳" : "📱"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{pm.brand}</span>
                      {pm.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {isEn ? "Default" : "Mặc định"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pm.last4 ? `•••• •••• •••• ${pm.last4} · Exp: ${pm.expiry}` : pm.account}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast(isEn ? "Payment method updated" : "Đã cập nhật phương thức thanh toán")
                  }
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive transition cursor-pointer"
                  title={isEn ? "Remove payment method" : "Xóa phương thức thanh toán"}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                showToast(isEn ? "Add payment modal opened" : "Mở hộp thoại thêm phương thức thanh toán")
              }
              className="w-full rounded-2xl border-2 border-dashed border-border p-3.5 text-center text-xs font-bold text-primary hover:border-primary/60 hover:bg-primary/5 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>{isEn ? "Add Credit/Debit Card or E-Wallet" : "Thêm thẻ ngân hàng hoặc Ví MoMo / ZaloPay mới"}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                {isEn ? "Current Membership" : "Gói thành viên hiện tại"}
              </span>
              <p className="font-display font-bold text-foreground">PawCare Plus Member</p>
              <p className="text-xs text-muted-foreground">
                {isEn
                  ? "Unlimited cloud passports & 10% clinic discounts"
                  : "Y bạ đám mây không giới hạn & Giảm 10% tại phòng khám đối tác"}
              </p>
            </div>
            <Link
              href={`/${locale}/owner/billing`}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-90 shrink-0"
            >
              {isEn ? "Upgrade" : "Nâng cấp"}
            </Link>
          </div>
        </Card>
      )}

      {/* Global Sign Out Card at bottom of Settings */}
      <Card className="p-5 sm:p-7 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-destructive/20 bg-destructive/5">
        <div>
          <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
            <ShieldAlert className="size-4.5" />
            <span>{isEn ? "Sign Out & Security" : "Đăng xuất tài khoản & Kết thúc phiên"}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "Safely terminate your authenticated session on this device."
              : "Đăng xuất an toàn khỏi tài khoản PawCare trên thiết bị này."}
          </p>
        </div>

        <form onSubmit={handleSignOut}>
          <button
            type="submit"
            disabled={isSigningOut}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-xs font-bold text-destructive-foreground shadow hover:brightness-110 transition cursor-pointer disabled:opacity-60"
          >
            <LogOut className={`size-4 shrink-0 ${isSigningOut ? "animate-spin" : ""}`} />
            <span>
              {isSigningOut
                ? isEn
                  ? "Signing Out..."
                  : "Đang đăng xuất..."
                : isEn
                ? "Sign Out of This Device"
                : "Đăng xuất thiết bị này"}
            </span>
          </button>
        </form>
      </Card>
      <PortalSyncBridge role="owner" />
    </div>
  );
}
