"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Pin = { id: string; latitude: number; longitude: number; label: string };
export function CommunityMap({ pins }: { pins: Pin[] }) {
  const t = useTranslations("community");
  const node = useRef<HTMLDivElement>(null);
  const [failure, setFailure] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: any;
    import("maplibre-gl").then((gl) => {
      if (disposed || !node.current) return;
      map = new gl.Map({ container: node.current, style: "https://demotiles.maplibre.org/style.json", center: [106.7009, 10.7769], zoom: 11 });
      map.addControl(new gl.NavigationControl(), "top-right");
      map.on("load", () => pins.forEach((pin) => new gl.Marker().setLngLat([pin.longitude, pin.latitude]).setPopup(new gl.Popup().setText(pin.label)).addTo(map!)));
      map.on("error", () => setFailure(true));
    }).catch(() => setFailure(true));
    return () => { disposed = true; map?.remove(); };
  }, [pins]);
  return <section aria-label={t("map")}>
    <div ref={node} className="h-72 overflow-hidden rounded-2xl border border-border bg-secondary" role="img" aria-label={t("locationNote")} />
    <p className="mt-2 text-xs text-muted-foreground">© OpenStreetMap contributors · MapLibre {failure ? `· ${t("error")}` : ""}</p>
  </section>;
}
