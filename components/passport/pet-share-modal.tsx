"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  QrCode,
  ShieldCheck,
  Download,
  Copy,
  Share2,
  Check,
  Maximize2,
  Lock,
  Calendar,
  Clock,
  Eye,
  FileDown,
  Info,
  Building2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { ShareType, SharePreset, ShareScope } from "@/modules/passport/share-service";

interface PetShareModalProps {
  petId: string;
  petName: string;
  locale?: string;
  onClose: () => void;
  hideIcons?: boolean;
}

export function PetShareModal({
  petId,
  petName,
  locale = "vi",
  onClose,
  hideIcons = false,
}: PetShareModalProps) {
  const isVi = locale === "vi";

  // Tab: "full_record" or "rabies_verification"
  const [shareType, setShareType] = useState<ShareType>("full_record");
  const [preset, setPreset] = useState<SharePreset>("7d");
  const [pin, setPin] = useState("");
  const [includeOwnerContact, setIncludeOwnerContact] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<ShareScope[]>([
    "profile",
    "vaccinations",
    "medications",
    "visits",
    "allergies",
    "conditions",
  ]);

  // Active generated grant state
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [token, setToken] = useState("");
  const [grantId, setGrantId] = useState("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrPngUrl, setQrPngUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [fullscreenQr, setFullscreenQr] = useState(false);

  // Owner Access Logs
  const [accessLogs, setAccessLogs] = useState<any[]>([]);

  // Generate QR & Share Link
  async function generateGrant(customShareType?: ShareType) {
    setLoading(true);
    const targetType = customShareType || shareType;
    try {
      const res = await fetch(`/api/passport/${encodeURIComponent(petId)}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shareType: targetType,
          preset: targetType === "rabies_verification" ? "permanent" : preset,
          scopes: selectedScopes,
          pin: targetType === "full_record" && pin ? pin : undefined,
          includeOwnerContact: targetType === "full_record" && includeOwnerContact,
          label: targetType === "rabies_verification" ? "Mã QR Vòng Cổ Cố Định" : `Chia sẻ y bạ (${preset})`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.shareUrl) {
        setShareUrl(data.shareUrl);
        setToken(data.token);
        setGrantId(data.grantId);

        // Generate SVG string
        const svgString = await QRCode.toString(data.shareUrl, {
          type: "svg",
          margin: 1,
          width: 280,
          color: { dark: "#0f766e", light: "#ffffff" },
        });
        setQrSvg(svgString);

        // Generate PNG data URL
        const dataUrl = await QRCode.toDataURL(data.shareUrl, {
          type: "image/png",
          margin: 1,
          width: 500,
          color: { dark: "#0f766e", light: "#ffffff" },
        });
        setQrPngUrl(dataUrl);
      }
    } catch (e) {
      console.error("Error creating share grant:", e);
    } finally {
      setLoading(false);
    }
  }

  // Load existing logs
  async function loadAccessLogs() {
    try {
      const res = await fetch(`/api/passport/${encodeURIComponent(petId)}/share`);
      if (res.ok) {
        const data = await res.json();
        const logs: any[] = [];
        data.grants?.forEach((g: any) => {
          if (Array.isArray(g.share_access_logs)) logs.push(...g.share_access_logs);
          if (Array.isArray(g.accessLogs)) logs.push(...g.accessLogs);
        });
        setAccessLogs(logs.slice(0, 5));
      }
    } catch {}
  }

  useEffect(() => {
    generateGrant();
    loadAccessLogs();
  }, [shareType]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hồ sơ y bạ PawCare - ${petName}`,
          text: `Tra cứu sổ y bạ và lịch tiêm chủng đã xác thực của bé ${petName}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const downloadQrPng = () => {
    if (!qrPngUrl) return;
    const a = document.createElement("a");
    a.href = qrPngUrl;
    a.download = `pawcare-qr-${petName.toLowerCase()}-${shareType}.png`;
    a.click();
  };

  const downloadQrSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pawcare-qr-${petName.toLowerCase()}-${shareType}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Fullscreen Max Brightness QR Mode */}
      {fullscreenQr && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-6 text-black select-none"
        >
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setFullscreenQr(false)}
              aria-label={isVi ? "Đóng" : "Close"}
              className="rounded-full bg-neutral-100 px-3.5 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 cursor-pointer"
            >
              {hideIcons ? (isVi ? "Đóng" : "Close") : <X className="size-6" />}
            </button>
          </div>

          <div className="text-center space-y-4 max-w-sm">
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {shareType === "rabies_verification" ? "VÒNG CỔ · XÁC THỰC DẠI" : "HỒ SƠ Y BẠ TOÀN DIỆN"}
            </span>
            <h2 className="text-2xl font-bold font-display text-neutral-900">
              {petName}
            </h2>
            <p className="text-xs text-neutral-500">
              {isVi
                ? "Chế độ quét trực tiếp: Vui lòng tăng độ sáng màn hình để máy quét phòng khám nhận diện nhanh nhất."
                : "Full-brightness display: Present this code to reception or bite-responder."}
            </p>

            <div
              className="mx-auto size-72 p-4 bg-white border-4 border-emerald-600 rounded-3xl shadow-xl flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            <p className="font-mono text-xs text-neutral-600">
              {shareUrl}
            </p>

            <button
              onClick={() => setFullscreenQr(false)}
              className="w-full rounded-2xl bg-emerald-700 py-3 font-bold text-white shadow-md hover:bg-emerald-800 transition cursor-pointer"
            >
              {isVi ? "Đóng chế độ phóng to" : "Close Fullscreen"}
            </button>
          </div>
        </div>
      )}

      {/* Main Share Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      >
        <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2">
              {!hideIcons && <QrCode className="size-5 text-primary" />}
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground">
                {isVi ? "Chia Sẻ Sổ Y Bạ & Thẻ Căn Cước" : "Share Health Record & QR"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={isVi ? "Đóng" : "Close"}
              className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {hideIcons ? (isVi ? "Đóng" : "Close") : <X className="size-5" />}
            </button>
          </div>

          {/* Type Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/60 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setShareType("full_record");
                generateGrant("full_record");
              }}
              className={`rounded-xl py-2 px-3 transition cursor-pointer ${
                shareType === "full_record"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVi ? "1. Y Bạ Toàn Diện (Phòng khám)" : "1. Full Record (Clinic)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShareType("rabies_verification");
                generateGrant("rabies_verification");
              }}
              className={`rounded-xl py-2 px-3 transition cursor-pointer ${
                shareType === "rabies_verification"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isVi ? "2. Vòng Cổ / Tiêm Dại (Công khai)" : "2. Rabies Collar QR"}
            </button>
          </div>

          {/* Configuration Panel */}
          {shareType === "full_record" ? (
            <div className="space-y-3.5 rounded-2xl border border-border/70 bg-secondary/20 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-foreground">
                  {isVi ? "Thời hạn truy cập (Tự hủy):" : "Expiry Preset:"}
                </span>
                <div className="flex items-center gap-1.5">
                  {(["24h", "7d", "30d"] as SharePreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreset(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                        preset === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional PIN */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
                <label className="flex items-center gap-1.5 font-bold text-foreground cursor-pointer">
                  {!hideIcons && <Lock className="size-3.5 text-muted-foreground" />}
                  <span>{isVi ? "Mã PIN bảo mật (Tùy chọn):" : "Security PIN (Optional):"}</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ví dụ: 1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-28 rounded-lg border border-border bg-background px-2.5 py-1 font-mono text-center text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Owner Contact Checkbox (Off by default per Decree 13) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                <div>
                  <span className="font-bold text-foreground block">
                    {isVi ? "Kèm thông tin liên hệ chủ nuôi:" : "Include owner contact details:"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isVi
                      ? "Mặc định tắt nhằm bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP."
                      : "Off by default per Decree 13/2023/ND-CP data minimization."}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeOwnerContact}
                  onChange={(e) => setIncludeOwnerContact(e.target.checked)}
                  className="size-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => generateGrant()}
                className="w-full rounded-xl bg-secondary py-2 text-xs font-bold text-secondary-foreground hover:bg-muted transition cursor-pointer"
              >
                {isVi ? "Áp dụng cấu hình & Cập nhật mã QR" : "Apply & Refresh QR"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs space-y-1.5 text-emerald-950 dark:text-emerald-300">
              <span className="font-bold flex items-center gap-1.5">
                {!hideIcons && <ShieldCheck className="size-4 text-emerald-600" />}
                {isVi ? "Xác Minh Phòng Dại Công Khai (Collar QR)" : "Public Collar Rabies Verification"}
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">
                {isVi
                  ? "Mã QR gắn vòng cổ hoặc thẻ đeo. Người bị cắn hoặc đội kiểm tra có thể quét ngay để xem chứng nhận dại, cơ sở cấp và thời hạn mà KHÔNG lộ số điện thoại hay thông tin cá nhân của bạn."
                  : "Permanent collar QR code. Bite victims or authorities can instantly verify rabies validity and issuing clinic without accessing your personal PII."}
              </p>
            </div>
          )}

          {/* QR Display Card */}
          <div className="text-center space-y-3">
            <div className="relative mx-auto size-52 rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/20 p-3 flex items-center justify-center">
              {loading ? (
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : qrSvg ? (
                <div
                  className="size-full flex items-center justify-center cursor-pointer"
                  onClick={() => setFullscreenQr(true)}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : null}

              {qrSvg && (
                <button
                  type="button"
                  onClick={() => setFullscreenQr(true)}
                  title={isVi ? "Xem toàn màn hình" : "View fullscreen"}
                  className="absolute bottom-2 right-2 rounded-lg bg-card/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm hover:bg-card border border-border cursor-pointer"
                >
                  {hideIcons ? (isVi ? "Phóng to" : "Expand") : <Maximize2 className="size-3.5" />}
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {isVi
                ? "Nhấp vào mã QR để mở chế độ hiển thị toàn màn hình với độ sáng tối đa."
                : "Click QR to toggle maximum brightness fullscreen presentation."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-semibold">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 px-3 hover:bg-muted transition cursor-pointer"
            >
              {!hideIcons && (copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />)}
              <span>{copied ? (isVi ? "Đã chép" : "Copied") : (isVi ? "Chép link" : "Copy Link")}</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 px-3 hover:bg-muted transition cursor-pointer"
            >
              {!hideIcons && <Share2 className="size-3.5 text-primary" />}
              <span>{isVi ? "Gửi QR" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={downloadQrPng}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 px-3 hover:bg-muted transition cursor-pointer"
            >
              {!hideIcons && <Download className="size-3.5 text-primary" />}
              <span>{isVi ? "Tải PNG" : "Save PNG"}</span>
            </button>

            <button
              type="button"
              onClick={downloadQrSvg}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 px-3 hover:bg-muted transition cursor-pointer"
            >
              {!hideIcons && <Download className="size-3.5 text-primary" />}
              <span>{isVi ? "Tải SVG" : "Save SVG"}</span>
            </button>
          </div>

          {/* Export PDF direct button */}
          <a
            href={`/api/passport/${encodeURIComponent(petId)}/export?locale=${locale}&include_owner=${includeOwnerContact ? "1" : "0"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition shadow-xs cursor-pointer"
          >
            {!hideIcons && <FileDown className="size-4" />}
            <span>{isVi ? "Xuất Thẻ & Sổ Tiêm PDF (Bản in A4)" : "Export PDF Health Passport (A4)"}</span>
          </a>

          {/* Access Logs (Decree 13 Transparency) */}
          {accessLogs.length > 0 && (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <span className="font-bold text-xs text-foreground block">
                {isVi ? "Nhật ký quét y bạ gần đây (Nghị định 13/2023/NĐ-CP):" : "Recent Access Audit Log:"}
              </span>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {accessLogs.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] rounded-lg bg-secondary/40 p-2 text-muted-foreground"
                  >
                    <span>
                      {new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(log.accessedAt || log.accessed_at))}
                    </span>
                    <span className="capitalize">{log.deviceType || log.device_type || "mobile"} · {log.action}</span>
                    <span className="text-[10px] font-mono">{log.coarseLocation || "TP.HCM"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

