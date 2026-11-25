"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  PhoneCall,
  HeartPulse,
  MapPin,
  Flame,
  ShieldAlert,
  ArrowRight,
  Info,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Radio,
  Clock,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

interface FirstAidCategory {
  id: string;
  title: string;
  shortTitle: string;
  icon: typeof Flame;
  symptoms: string;
  steps: string[];
}

function getLocalizedFirstAid(locale: string): FirstAidCategory[] {
  const isEn = locale === "en";
  return [
    {
      id: "heatstroke",
      title: isEn ? "Heatstroke & Hyperthermia" : "Sốc nhiệt mùa hè (Heatstroke)",
      shortTitle: isEn ? "Heatstroke" : "Sốc nhiệt",
      icon: Flame,
      symptoms: isEn
        ? "Heavy persistent panting, dark red or purple gums, excessive drooling, unsteadiness, or collapse."
        : "Thở gấp gáp liên tục, lợi đỏ thẫm/tím tái, chảy nhiều dãi, đi loạng choạng hoặc ngất xỉu.",
      steps: isEn
        ? [
            "Immediately move pet to a shaded, well-ventilated area or air-conditioned room.",
            "Apply cool, damp towels (NEVER ice or freezing water) to paws, groin, and neck.",
            "Offer small sips of cool water; never force-feed water.",
            "Transport immediately to the nearest veterinary emergency clinic while keeping cool.",
          ]
        : [
            "Lập tức đưa bé vào nơi râm mát, thoáng gió hoặc phòng điều hòa nhẹ.",
            "Dùng khăn ẩm nước mát (KHÔNG dùng nước đá lạnh buốt) chườm lên vùng đệm bàn chân, nách và bẹn.",
            "Cho bé nhấp từng ngụm nhỏ nước mát, tuyệt đối không ép uống nhiều cùng lúc.",
            "Nhanh chóng chuyển đến cơ sở thú y gần nhất trong khi vẫn giữ mát trên đường đi.",
          ],
    },
    {
      id: "poisoning",
      title: isEn ? "Toxin / Poison Ingestion" : "Ngộ độc thức ăn / Hóa chất",
      shortTitle: isEn ? "Poisoning" : "Ngộ độc",
      icon: AlertTriangle,
      symptoms: isEn
        ? "Severe vomiting, tremors, foaming at the mouth, dilated pupils, lethargy, or weakness."
        : "Nôn mửa dữ dội, co giật, sùi bọt mép, giãn đồng tử, đi đứng không vững.",
      steps: isEn
        ? [
            "Safely remove the pet from any remaining toxic substances.",
            "Photograph or collect packaging, plants, or chemical labels for vet toxicological identification.",
            "DO NOT induce vomiting if caustic chemicals, acids, hydrocarbons, or sharp items were swallowed.",
            "Call emergency veterinary hotline immediately for guidance before transport.",
          ]
        : [
            "Cách ly ngay vật nuôi khỏi nguồn chất độc hại còn lại.",
            "Chụp ảnh hoặc giữ lại bao bì hóa chất/cây cỏ mà bé đã ăn để bác sĩ xác định độc tố.",
            "KHÔNG tự ý gây nôn nếu bé đã nuốt phải chất ăn mòn, axit, bazơ mạnh hoặc dầu mỡ.",
            "Gọi ngay cho đường dây nóng bác sĩ thú y để nhận chỉ dẫn chuyên môn trước khi di chuyển.",
          ],
    },
    {
      id: "choking",
      title: isEn ? "Choking / Foreign Body Obstruction" : "Hóc dị vật / Nghẹt thở",
      shortTitle: isEn ? "Choking" : "Hóc dị vật",
      icon: HeartPulse,
      symptoms: isEn
        ? "Pawing at mouth, silent retching, coughing, distress, blue or greyish gums."
        : "Cào cào miệng, ho khạc liên tục không ra tiếng, lợi chuyển sang màu tím xanh.",
      steps: isEn
        ? [
            "Carefully inspect the oral cavity with a flashlight to see if object is readily accessible.",
            "Do not probe blindly with fingers if the object is lodged deep, as this can push it further.",
            "Perform pet Heimlich maneuver: support chest from behind and deliver 4-5 firm upward thrusts below the ribs.",
            "Rush immediately to an emergency facility equipped with oxygen therapy.",
          ]
        : [
            "Mở miệng bé cẩn thận, dùng đèn soi xem dị vật có ở vị trí nhìn thấy rõ và dễ gắp không.",
            "Nếu dị vật ở quá sâu, không cố dùng tay móc vì dễ đẩy dị vật lọt sâu hơn.",
            "Áp dụng nghiệm pháp Heimlich cho thú cưng: Ôm ngang ngực bé từ phía sau, ép dứt khoát 4-5 lần vào vùng bụng dưới xương sườn.",
            "Khẩn trương đưa đến phòng khám có trang bị máy thở oxy.",
          ],
    },
    {
      id: "trauma",
      title: isEn ? "Bleeding & Trauma / Fractures" : "Chảy máu do chấn thương / Tai nạn",
      shortTitle: isEn ? "Trauma" : "Chấn thương",
      icon: ShieldAlert,
      symptoms: isEn
        ? "Open wounds, arterial or continuous bleeding, apparent fractures, crying upon contact."
        : "Vết rách da, chảy máu liên tục, gãy xương, đau đớn khi chạm vào.",
      steps: isEn
        ? [
            "Apply direct pressure using sterile gauze or clean cloth to stem bleeding.",
            "Bandage firmly without cutting off peripheral blood circulation.",
            "Place pet on a firm surface (board or folded blanket) to stabilize spinal alignment.",
            "Keep pet warm and calm during swift transport to emergency hospital.",
          ]
        : [
            "Dùng gạc y tế sạch hoặc khăn bông sạch ép trực tiếp lên vết thương để cầm máu.",
            "Băng ép vừa đủ chặt, không quấn quá nghẽn mạch máu ngoại vi.",
            "Đặt bé nằm trên mặt phẳng cứng (như tấm ván hoặc chăn gấp) để giữ cố định cột sống.",
            "Che chắn giữ ấm cơ thể trong khi vận chuyển đến bệnh viện cấp cứu.",
          ],
    },
  ];
}

function getLocalizedHotlines(locale: string) {
  const isEn = locale === "en";
  return [
    {
      name: isEn
        ? "24/7 Veterinary Emergency · District 1 Central"
        : "Cấp cứu Thú Y 24/7 · Khu vực Quận 1 & Trung tâm",
      phone: "028 3823 4567",
      address: isEn
        ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1"
        : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1",
    },
    {
      name: isEn
        ? "Cho Lon Emergency Vet Hospital · District 5"
        : "Bệnh viện Thú Y Cấp Cứu Chợ Lớn · Quận 5",
      phone: "028 3955 8899",
      address: isEn
        ? "88 Thuan Kieu, Ward 12, District 5"
        : "88 Thuận Kiều, Phường 12, Quận 5",
    },
    {
      name: isEn
        ? "Veterinary ICU & Trauma Center · Binh Thanh"
        : "Trung tâm Cấp Cứu & Hồi Sức Thú Y · Bình Thạnh",
      phone: "090 9123 456",
      address: isEn
        ? "312 Xo Viet Nghe Tinh, Ward 25, Binh Thanh"
        : "312 Xô Viết Nghệ Tĩnh, P. 25, Bình Thạnh",
    },
  ];
}

export function SosGuidance({ locale }: { locale: string }) {
  const tS = useTranslations("ownerSos");
  const categories = getLocalizedFirstAid(locale);
  const hotlines = getLocalizedHotlines(locale);

  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const selectedGuide = categories.find((c) => c.id === activeCategory) ?? categories[0];

  // 1-Tap Nearby SOS Dispatch State (< 5 km Radius)
  const [nearbySosState, setNearbySosState] = useState<"idle" | "scanning" | "dispatched" | "accepted">("idle");
  const [nearbyHospitals, setNearbyHospitals] = useState<Array<{
    id: string;
    name: string;
    distanceKm: number;
    phone: string;
    status: string;
    icuReady: boolean;
  }>>([]);
  const [acceptedHospital, setAcceptedHospital] = useState<{
    name: string;
    distanceKm: number;
    vetName: string;
    phone: string;
    etaMinutes: number;
    address: string;
  } | null>(null);

  // Sync with clinic-side SOS acceptance via localStorage
  useEffect(() => {
    const checkLeadStatus = () => {
      try {
        const stored = localStorage.getItem("pawcare-active-sos-lead");
        if (stored) {
          const lead = JSON.parse(stored);
          if (lead.status === "accepted") {
            setAcceptedHospital({
              name: lead.acceptedBy || (locale === "en" ? "PetCare Veterinary Hospital · D1" : "Bệnh viện Thú Y PetCare · Q1"),
              distanceKm: 1.2,
              vetName: lead.dutyVet || (locale === "en" ? "Dr. Nguyen Van Cuong (DVM)" : "ThS.BS Nguyễn Văn Cường"),
              phone: "028 3823 4567",
              etaMinutes: 7,
              address: locale === "en" ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1" : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1",
            });
            setNearbySosState("accepted");
          }
        }
      } catch {}
    };

    window.addEventListener("pawcare-sos-lead-accepted", checkLeadStatus);
    window.addEventListener("storage", checkLeadStatus);
    return () => {
      window.removeEventListener("pawcare-sos-lead-accepted", checkLeadStatus);
      window.removeEventListener("storage", checkLeadStatus);
    };
  }, [locale]);

  const handleStart1TapSos = () => {
    setNearbySosState("scanning");

    setTimeout(() => {
      const hospitals = [
        {
          id: "petcare-d1",
          name: locale === "en" ? "PetCare Veterinary Hospital · D1" : "Bệnh viện Thú Y PetCare · Quận 1",
          distanceKm: 1.2,
          phone: "028 3823 4567",
          status: locale === "en" ? "24/7 ICU Ready · On-duty Triage" : "Cấp cứu 24/7 · Sẵn sàng trực chiến ICU",
          icuReady: true,
        },
        {
          id: "cholon-d5",
          name: locale === "en" ? "Cho Lon Emergency Hospital · D5" : "Bệnh viện Thú Y Cấp Cứu Chợ Lớn · Quận 5",
          distanceKm: 2.8,
          phone: "028 3955 8899",
          status: locale === "en" ? "Emergency Surgery Ready" : "Phẫu thuật cấp cứu & Hồi sức",
          icuReady: true,
        },
        {
          id: "binhthanh-icu",
          name: locale === "en" ? "Binh Thanh Vet ICU & Trauma Center" : "Trung tâm Cấp Cứu & Hồi Sức Thú Y · Bình Thạnh",
          distanceKm: 4.1,
          phone: "090 9123 456",
          status: locale === "en" ? "Oxygen Therapy & Critical Care" : "Thở oxy & Hồi sức tích cực",
          icuReady: true,
        },
      ];
      setNearbyHospitals(hospitals);
      setNearbySosState("dispatched");

      // Broadcast High-Intent B2B Lead for partner 24/7 clinics
      try {
        const lead = {
          id: `SOS-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" }),
          petName: locale === "en" ? "Bo (Poodle, 3.8 kg)" : "Bé Bơ (Poodle, 3.8 kg)",
          ownerName: locale === "en" ? "Nguyen Van An" : "Nguyễn Văn An",
          ownerPhone: "090 912 3456",
          location: locale === "en" ? "Ben Thanh, District 1 (10.7769° N, 106.7009° E)" : "P. Bến Thành, Quận 1 (10.7769° N, 106.7009° E)",
          distanceKm: 1.2,
          radiusKm: 5,
          symptoms: locale === "en" ? "Chemical ingestion, continuous vomiting, tremors" : "Nôn mửa dữ dội, co giật, nghi ngộ độc hóa chất",
          triage: "CRITICAL_ICU",
          status: "pending_hospital",
        };
        localStorage.setItem("pawcare-active-sos-lead", JSON.stringify(lead));
        window.dispatchEvent(new CustomEvent("pawcare-sos-dispatched"));
      } catch {}

      // Auto-accept simulation after 5s if clinic tab didn't click
      setTimeout(() => {
        setNearbySosState((curr) => {
          if (curr === "dispatched") {
            setAcceptedHospital({
              name: locale === "en" ? "PetCare Veterinary Hospital · D1" : "Bệnh viện Thú Y PetCare · Quận 1",
              distanceKm: 1.2,
              vetName: locale === "en" ? "Dr. Nguyen Van Cuong (DVM) · Chief ICU" : "ThS.BS Nguyễn Văn Cường · Trưởng kíp trực ICU",
              phone: "028 3823 4567",
              etaMinutes: 7,
              address: locale === "en" ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1" : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1",
            });
            try {
              const currentLead = JSON.parse(localStorage.getItem("pawcare-active-sos-lead") || "{}");
              currentLead.status = "accepted";
              currentLead.acceptedBy = locale === "en" ? "PetCare Veterinary Hospital · D1" : "Bệnh viện Thú Y PetCare · Quận 1";
              localStorage.setItem("pawcare-active-sos-lead", JSON.stringify(currentLead));
              window.dispatchEvent(new CustomEvent("pawcare-sos-lead-accepted"));
            } catch {}
            return "accepted";
          }
          return curr;
        });
      }, 5000);
    }, 1200);
  };

  const handleCancel1TapSos = () => {
    setNearbySosState("idle");
    setAcceptedHospital(null);
    try {
      localStorage.removeItem("pawcare-active-sos-lead");
      window.dispatchEvent(new CustomEvent("pawcare-sos-canceled"));
    } catch {}
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Navigation & Exit / Back button */}
      <div>
        <BackButton
          fallbackHref={`/${locale}/owner`}
          label={locale === "en" ? "Back to Main" : "Quay về Trang chính"}
          variant="pill"
        />
      </div>

      {/* Basic Nearby-Clinic Request: 1-Tap SOS Dispatch (< 5 km Radius) */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500 bg-linear-to-br from-rose-500/15 via-card to-amber-500/10 p-6 md:p-8 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-rose-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
              <Radio className="size-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-black text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  {locale === "en" ? "1-TAP SOS DISPATCH" : "CẤP CỨU 1-CHẠM 24/7"}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {locale === "en" ? "Radius < 5 km" : "Bán kính < 5 km"}
                </span>
              </div>
              <h2 className="mt-1 font-display text-xl sm:text-2xl font-black text-foreground">
                {locale === "en"
                  ? "Basic Nearby-Clinic Request (< 5 km)"
                  : "Kết nối Cấp cứu Khẩn cấp Bán kính 5 km"}
              </h2>
            </div>
          </div>

          {nearbySosState === "idle" && (
            <button
              type="button"
              onClick={handleStart1TapSos}
              className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/30 transition cursor-pointer"
            >
              <Radio className="size-5 animate-ping" />
              <span>{locale === "en" ? "Trigger 1-Tap SOS (< 5 km)" : "Kích hoạt SOS 1-Chạm (< 5 km)"}</span>
            </button>
          )}

          {nearbySosState !== "idle" && (
            <button
              type="button"
              onClick={handleCancel1TapSos}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition cursor-pointer"
            >
              <X className="size-4" />
              <span>{locale === "en" ? "Cancel / Reset" : "Hủy / Báo an toàn"}</span>
            </button>
          )}
        </div>

        {/* STATE: IDLE */}
        {nearbySosState === "idle" && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-muted-foreground">
              <MapPin className="size-4 text-rose-500 shrink-0" />
              <span>{locale === "en" ? "GPS Live Geolocation (< 5 km)" : "Tự động định vị GPS trong 5 km"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              <span>{locale === "en" ? "Verified 24/7 Partner Hospitals" : "Bệnh viện 24/7 kiểm định đạt chuẩn ICU"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-3 text-muted-foreground">
              <Sparkles className="size-4 text-amber-500 shrink-0" />
              <span>{locale === "en" ? "Direct Hospital Triage Link" : "Liên thông hồ sơ y bạ & Triệu chứng"}</span>
            </div>
          </div>
        )}

        {/* STATE: SCANNING */}
        {nearbySosState === "scanning" && (
          <div className="mt-4 rounded-2xl bg-card border border-rose-500/40 p-6 text-center space-y-3 animate-in fade-in">
            <div className="mx-auto size-16 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center animate-pulse">
              <Radio className="size-8 text-rose-600 animate-spin" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">
              {locale === "en"
                ? "Scanning 24/7 Emergency Hospitals within 5 km..."
                : "Đang quét cơ sở y tế cấp cứu 24/7 trong bán kính 5 km..."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {locale === "en"
                ? "Locating nearest verified ICU facilities around Ben Thanh Ward, District 1 (10.7769° N, 106.7009° E)..."
                : "Đang dò tìm cơ sở có kíp trực cấp cứu gần nhất quanh khu vực P. Bến Thành, Quận 1 (10.7769° N, 106.7009° E)..."}
            </p>
          </div>
        )}

        {/* STATE: DISPATCHED / BROADCASTING */}
        {nearbySosState === "dispatched" && (
          <div className="mt-4 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between rounded-2xl bg-amber-500/15 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-amber-500 animate-ping" />
                <span className="font-bold">
                  {locale === "en"
                    ? "Alert broadcast to 3 verified 24/7 emergency hospitals within 5 km:"
                    : "Đã phát tín hiệu cấp cứu đến 3 bệnh viện thú y 24/7 gần nhất (< 5 km):"}
                </span>
              </div>
              <span className="font-mono font-bold">{locale === "en" ? "Awaiting acceptance..." : "Đang chờ bệnh viện nhận ca..."}</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {nearbyHospitals.map((h) => (
                <div key={h.id} className="rounded-2xl border border-rose-500/30 bg-card p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate">{h.name}</span>
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black text-rose-600">
                      {h.distanceKm} km
                    </span>
                  </div>
                  <p className="text-muted-foreground">{h.status}</p>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <Clock className="size-3 animate-spin" />
                    <span>{locale === "en" ? "Pinging duty vet..." : "Đang đổ chuông phòng trực..."}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATE: ACCEPTED */}
        {nearbySosState === "accepted" && acceptedHospital && (
          <div className="mt-4 rounded-3xl border-2 border-emerald-500 bg-emerald-500/10 p-5 sm:p-6 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                    {locale === "en" ? "HOSPITAL ACCEPTED & PREPPING ICU" : "BỆNH VIỆN ĐÃ TIẾP NHẬN & CHUẨN BỊ PHÒNG CẤP CỨU"}
                  </span>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {acceptedHospital.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-emerald-600 text-white font-extrabold px-3 py-1.5 text-xs shadow-xs">
                  {locale === "en" ? `ETA ~ ${acceptedHospital.etaMinutes} mins` : `Thời gian đến ~ ${acceptedHospital.etaMinutes} phút`}
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-card border border-border p-3.5 space-y-1">
                <span className="text-muted-foreground block">{locale === "en" ? "Attending Vet on Call" : "Bác sĩ trực cấp cứu"}</span>
                <span className="font-bold text-foreground block text-sm">{acceptedHospital.vetName}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{locale === "en" ? "Oxygen therapy & ICU prepped" : "Phòng cấp cứu ICU & Máy thở oxy sẵn sàng"}</span>
              </div>

              <div className="rounded-2xl bg-card border border-border p-3.5 space-y-1">
                <span className="text-muted-foreground block">{locale === "en" ? "Facility Address" : "Địa chỉ phòng khám"}</span>
                <span className="font-semibold text-foreground block">{acceptedHospital.address}</span>
                <span className="text-primary font-bold">({acceptedHospital.distanceKm} km {locale === "en" ? "away" : "cách đây"})</span>
              </div>

              <div className="rounded-2xl bg-card border border-border p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-muted-foreground block">{locale === "en" ? "Direct Emergency Line" : "Đường dây nóng cấp cứu"}</span>
                  <span className="font-bold text-foreground font-mono">{acceptedHospital.phone}</span>
                </div>
                <a
                  href={`tel:${acceptedHospital.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition shadow-xs"
                >
                  <PhoneCall className="size-3.5" />
                  <span>{locale === "en" ? "Call Attending Vet" : "Gọi kíp trực ngay"}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive First Aid Handbook */}
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2 sm:text-xl">
          <Info className="size-5 text-primary shrink-0" />
          <span>{tS("handbookTitle")}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tS("handbookSubtitle")}
        </p>

        {/* Category Selector Tabs */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((c) => {
            const Icon = c.icon;
            const isSelected = c.id === selectedGuide.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="text-xs truncate">{c.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Guide Details */}
        <Card className="mt-4 p-6">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <selectedGuide.icon className="size-5 text-destructive shrink-0" />
            <h3 className="font-display text-lg font-bold">{selectedGuide.title}</h3>
          </div>

          <div className="mt-4 rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground">
            <strong className="text-foreground">{tS("symptomsLabel")}: </strong>
            {selectedGuide.symptoms}
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
              {tS("stepsLabel")}
            </h4>
            <ol className="mt-2.5 space-y-2 text-sm text-foreground">
              {selectedGuide.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-xs sm:text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* 24/7 Direct Emergency Hotlines (Under First Aid Guide) */}
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2 sm:text-xl">
          <PhoneCall className="size-5 text-destructive shrink-0" />
          <span>{tS("hotlineSection")}</span>
        </h2>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {hotlines.map((h, i) => (
            <Card key={i} className="flex flex-col justify-between p-4 border-destructive/20 h-full">
              <div>
                <p className="font-bold text-sm text-foreground">{h.name}</p>
                <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 mt-0.5" />
                  <span>{h.address}</span>
                </p>
              </div>

              <a
                href={`tel:${h.phone.replace(/\s+/g, "")}`}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/15 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <PhoneCall className="size-3.5 shrink-0" />
                <span>{h.phone}</span>
              </a>
            </Card>
          ))}
        </div>
      </div>

      {/* Back to Home & Clinic Finder Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          href={`/${locale}/owner`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          {locale === "en" ? "← Back to Dashboard" : "← Quay lại Trang chính"}
        </Link>
        <Link
          href={`/${locale}/clinics`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-primary transition hover:bg-accent"
        >
          <span>{tS("findClinicsMap")}</span>
          <ArrowRight className="size-3.5 shrink-0" />
        </Link>
      </div>
    </div>
  );
}
