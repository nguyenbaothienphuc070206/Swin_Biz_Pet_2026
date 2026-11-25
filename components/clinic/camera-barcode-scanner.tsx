"use client";

import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { lookupBarcode, type CatalogItem } from "@/modules/passport/barcode";

interface CameraBarcodeScannerProps {
  mode?: "barcode" | "qr" | "both";
  onDetected: (result: { code: string; catalogItem?: CatalogItem | null }) => void;
  onClose: () => void;
  locale?: string;
}

export function CameraBarcodeScanner({
  onDetected,
  onClose,
  locale = "vi",
}: CameraBarcodeScannerProps) {
  const isVi = locale === "vi";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  const handleResult = (rawCode: string) => {
    playBeep();
    const item = lookupBarcode(rawCode);
    onDetected({ code: rawCode, catalogItem: item });
    stopCamera();
    onClose();
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      if ("BarcodeDetector" in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a"],
          });

          const detectLoop = async () => {
            if (!videoRef.current || !mediaStreamRef.current?.active) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                handleResult(barcodes[0].rawValue);
                return;
              }
            } catch {}
            requestAnimationFrame(detectLoop);
          };
          requestAnimationFrame(detectLoop);
          return;
        } catch {}
      }

      const codeReader = new BrowserMultiFormatReader();
      zxingReaderRef.current = codeReader;
      codeReader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) handleResult(result.getText());
      });
    } catch {
      setCameraError(
        isVi
          ? "Không thể truy cập camera. Bạn có thể chọn nhanh mã vắc-xin bên dưới."
          : "Camera unavailable. You can select a vaccine code preset below."
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        (zxingReaderRef.current as any).reset();
      } catch {}
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch {}
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-display font-bold text-base">
            {isVi ? "Quét mã vạch & QR y bạ" : "Barcode & QR Scanner"}
          </h3>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {isVi ? "Đóng" : "Close"}
          </button>
        </div>

        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-48 sm:size-56 rounded-xl border-2 border-emerald-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/40 whitespace-nowrap">
                {isVi ? "Căn mã vào khung" : "Align code in frame"}
              </div>
            </div>
          </div>

          {cameraActive && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`absolute bottom-3 right-3 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                torchOn ? "bg-amber-400 text-black" : "bg-black/70 text-white"
              }`}
            >
              {isVi ? "Đèn pin" : "Flash"}
            </button>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-neutral-900/95 p-4 flex flex-col items-center justify-center text-center">
              <p className="text-xs text-neutral-300 max-w-xs">{cameraError}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground block">
            {isVi ? "Chọn nhanh mã lô mẫu:" : "Quick sample codes:"}
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleResult("893850123401")}
              className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
            >
              <span className="font-semibold text-foreground block">Vắc-xin Dại Rabisin</span>
              <span className="text-[11px] text-muted-foreground font-mono">Lô: RAB-2026-X1</span>
            </button>

            <button
              type="button"
              onClick={() => handleResult("893850123403")}
              className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
            >
              <span className="font-semibold text-foreground block">Vanguard 7 bệnh</span>
              <span className="text-[11px] text-muted-foreground font-mono">Lô: VG7-2026-09</span>
            </button>

            <button
              type="button"
              onClick={() => handleResult("893850123404")}
              className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
            >
              <span className="font-semibold text-foreground block">Felocell 4 bệnh mèo</span>
              <span className="text-[11px] text-muted-foreground font-mono">Lô: FEL4-2026-15</span>
            </button>

            <button
              type="button"
              onClick={() => handleResult("893850123407")}
              className="rounded-lg border border-border bg-background p-2.5 text-left hover:bg-secondary transition cursor-pointer"
            >
              <span className="font-semibold text-foreground block">Bravecto ve rận</span>
              <span className="text-[11px] text-muted-foreground font-mono">12 tuần bảo vệ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
