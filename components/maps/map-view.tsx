"use client";

import { useEffect, useRef, useState } from "react";
import type { ClinicCandidate } from "@/modules/clinics/ranking";
import { chooseMapProvider } from "@/modules/clinics/maps-adapter";
import { useTranslations } from "next-intl";

type ClinicPin = ClinicCandidate & { name: string; lat?: number; lng?: number };
type GoogleWindow = Window & { google?: { maps?: { importLibrary: (name: string) => Promise<any> } }; initPawcareMap?: () => void };

export function ClinicMap({ clinics, demoMode }: { clinics: ClinicPin[]; demoMode: boolean }) {
  const t = useTranslations("demo");
  const containerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const provider = chooseMapProvider({ googleKey, demoMode });

  useEffect(() => {
    if (!containerRef.current || !provider) return;
    let disposed = false;
    let map: any;
    let googleMarkers: any[] = [];
    if (provider === "google" && googleKey) {
      const w = window as GoogleWindow;
      const load = async () => {
        if (!w.google?.maps) {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleKey)}&loading=async&v=weekly`;
          script.async = true;
          document.head.append(script);
          await new Promise<void>((resolve, reject) => { script.onload = () => resolve(); script.onerror = () => reject(new Error("maps_load_failed")); });
        }
        if (disposed) return;
        const { Map } = await w.google!.maps!.importLibrary("maps");
        const { AdvancedMarkerElement } = await w.google!.maps!.importLibrary("marker");
        map = new Map(containerRef.current, { center: { lat: 10.7769, lng: 106.7009 }, zoom: 12, mapId: "PAWCARE_DEMO" });
        for (const clinic of clinics) if (clinic.lat && clinic.lng) googleMarkers.push(new AdvancedMarkerElement({ map, position: { lat: clinic.lat, lng: clinic.lng }, title: clinic.name }));
      };
      load().catch(() => setMessage(t("mapUnavailable")));
      return () => { disposed = true; googleMarkers.forEach((marker) => { marker.map = null; }); };
    }
    let maplibre: any;
    import("maplibre-gl").then((maplibreGl) => {
      if (disposed || !containerRef.current) return;
      maplibre = maplibreGl;
      map = new maplibreGl.Map({ container: containerRef.current, style: "https://demotiles.maplibre.org/style.json", center: [106.7009, 10.7769], zoom: 11 });
      map.addControl(new maplibreGl.NavigationControl(), "top-right");
      map.on("load", () => clinics.filter((clinic) => clinic.lat && clinic.lng).forEach((clinic) => new maplibreGl.Marker().setLngLat([clinic.lng!, clinic.lat!]).setPopup(new maplibreGl.Popup().setText(clinic.name)).addTo(map)));
      map.on("error", () => setMessage(t("mapFallback")));
    }).catch(() => setMessage(t("mapUnavailable")));
    return () => { disposed = true; map?.remove(); };
  }, [clinics, demoMode, googleKey, provider, t]);

  if (!provider) return <div role="status" className="grid min-h-64 place-items-center rounded-2xl border border-border bg-secondary p-6 text-center">{t("mapNotConfigured")}</div>;
  return <div className="relative"><div ref={containerRef} className="h-80 overflow-hidden rounded-2xl border border-border" aria-label={t("mapStatus")}/><p className="sr-only" role="status">{message}</p><p className="mt-2 text-xs text-muted-foreground">{provider === "maplibre" ? t("mapAttribution") : t("mapGoogle")}</p></div>;
}
