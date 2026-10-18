"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button, Card } from "@/components/ui";
import { useTranslations } from "next-intl";

export function BarcodeScanner({ onCode, mockMode = false }: { onCode: (code: string) => void; mockMode?: boolean }) {
  const t = useTranslations("demo");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "denied" | "unavailable">("idle");
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => () => { scanningRef.current = false; controlsRef.current?.stop(); }, []);

  if (mockMode) return <Card className="grid gap-3 p-4"><p className="text-sm text-muted-foreground">{t("mockScannerNotice")}</p><Button type="button" onClick={() => onCode("DEMO-VAX-CAT-01")}>{t("scanDemoBarcode")}</Button></Card>;

  async function start() {
    scanningRef.current = true;
    setStatus("scanning");
    try {
      if ("BarcodeDetector" in window) {
        const Detector = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        if (Detector && videoRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
          const loop = async () => {
            if (!videoRef.current || !scanningRef.current) return;
            const results = await detector.detect(videoRef.current).catch(() => []);
            if (results[0]?.rawValue) {
              onCode(results[0].rawValue);
              stream.getTracks().forEach((track) => track.stop());
              scanningRef.current = false;
              setStatus("idle");
            } else requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
          return;
        }
      }
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result) { onCode(result.getText()); controlsRef.current?.stop(); scanningRef.current = false; setStatus("idle"); }
      });
    } catch (error) {
      scanningRef.current = false;
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }

  return <Card className="grid gap-3 p-4">
    <div className="flex items-center justify-between gap-3"><p className="font-semibold">{t("scanner")}</p><Button type="button" onClick={start} disabled={status === "scanning"}>{status === "scanning" ? t("scanning") : t("startCamera")}</Button></div>
    <video ref={videoRef} className="max-h-48 w-full rounded-xl bg-black" playsInline muted aria-label={t("cameraPreview")} />
    {status === "denied" ? <p role="status" className="text-sm text-muted-foreground">{t("cameraDenied")}</p> : null}
    {status === "unavailable" ? <p role="status" className="text-sm text-muted-foreground">{t("cameraUnavailable")}</p> : null}
  </Card>;
}
