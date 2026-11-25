"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import { isValidVietnamClinicPin } from "@/modules/clinics/location";

type ClinicSetting = { clinic_id: string; clinic_name: string; supports_24h: boolean; supports_24h_requested: boolean; emergency_status: string; address: string; latitude: number | null; longitude: number | null; location_verified_at: string | null; is_admin: boolean };
type GoogleWindow = Window & { google?: { maps?: { importLibrary: (name: string) => Promise<any> } } };

export function ClinicSosSettings() {
  const locale = useLocale() as "vi" | "en";
  const t = useTranslations("clinicSosSettings");
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [clinics, setClinics] = useState<ClinicSetting[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [supports24h, setSupports24h] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = clinics.find((clinic) => clinic.clinic_id === clinicId);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    let active = true;
    void fetch("/api/clinic/sos/settings", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error();
      const payload = await response.json() as { clinics: ClinicSetting[] };
      if (!active) return;
      setClinics(payload.clinics);
      if (payload.clinics[0]) setClinicId(payload.clinics[0].clinic_id);
    }).catch(() => { if (active) setError(t("saveError")); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    if (!selected) return;
    setAddress(selected.address ?? ""); setSupports24h(selected.supports_24h_requested || selected.supports_24h);
    setLatitude(selected.latitude == null ? "" : String(selected.latitude));
    setLongitude(selected.longitude == null ? "" : String(selected.longitude));
  }, [selected?.clinic_id, selected?.address, selected?.latitude, selected?.longitude, selected?.supports_24h, selected?.supports_24h_requested]);

  useEffect(() => {
    if (!googleKey || !mapElement.current) return;
    let disposed = false;
    const win = window as GoogleWindow;
    const load = async () => {
      if (!win.google?.maps) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleKey)}&loading=async&v=weekly`;
        script.async = true; document.head.append(script);
        await new Promise<void>((resolve, reject) => { script.onload = () => resolve(); script.onerror = () => reject(new Error("map_load_failed")); });
      }
      if (disposed || !mapElement.current) return;
      const { Map } = await win.google!.maps!.importLibrary("maps");
      if (disposed || !mapElement.current) return;
      const lat = selected?.latitude ?? Number(latitude), lng = selected?.longitude ?? Number(longitude);
      const center = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: 16.0, lng: 106.0 };
      const map = new Map(mapElement.current, { center, zoom: Number.isFinite(lat) ? 14 : 5, mapId: "PAWCARE_CLINIC_SOS" });
      mapRef.current = map;
      const { AdvancedMarkerElement } = await win.google!.maps!.importLibrary("marker");
      const marker = new AdvancedMarkerElement({ map, position: center, gmpDraggable: true, title: selected?.clinic_name ?? "Clinic location" });
      markerRef.current = marker;
      const choosePoint = (point: any) => {
        if (typeof point?.lat !== "number" || typeof point?.lng !== "number") return;
        setLatitude(String(point.lat)); setLongitude(String(point.lng)); marker.position = point;
      };
      map.addListener("click", (event: any) => choosePoint(event.latLng?.toJSON?.()));
      marker.addListener?.("dragend", (event: any) => choosePoint(event.latLng?.toJSON?.()));
      marker.addEventListener?.("gmp-dragend", (event: any) => choosePoint(event.latLng?.toJSON?.()));
    };
    load().catch(() => setMessage(t("mapUnavailable")));
    return () => { disposed = true; if (markerRef.current) markerRef.current.map = null; mapRef.current = null; };
  }, [googleKey, selected?.clinic_id]);

  async function searchAddress() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/maps/geocode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, locale }) });
      if (!response.ok) throw new Error();
      const result = await response.json() as { latitude: number; longitude: number; formattedAddress: string };
      if (!isValidVietnamClinicPin(result.latitude, result.longitude)) throw new Error("invalid_location");
      setAddress(result.formattedAddress); setLatitude(String(result.latitude)); setLongitude(String(result.longitude));
      if (mapRef.current) mapRef.current.panTo({ lat: result.latitude, lng: result.longitude });
      if (markerRef.current) markerRef.current.position = { lat: result.latitude, lng: result.longitude };
    } catch { setError(t("invalidLocation")); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!selected) return;
    const lat = latitude === "" ? null : Number(latitude), lng = longitude === "" ? null : Number(longitude);
    if (supports24h && (lat === null || lng === null || !isValidVietnamClinicPin(lat, lng))) { setError(t("invalidLocation")); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      let nextAddress = address.trim();
      if (lat !== null && lng !== null) {
        const validation = await fetch("/api/maps/reverse-geocode", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ latitude: lat, longitude: lng, locale }) });
        if (!validation.ok) throw new Error();
        nextAddress = (await validation.json() as { address: string }).address;
      }
      const response = await fetch("/api/clinic/sos/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ clinicId, address: nextAddress, supports24h, latitude: lat, longitude: lng }) });
      if (!response.ok) throw new Error();
      const refresh = await fetch("/api/clinic/sos/settings", { cache: "no-store" });
      const payload = await refresh.json() as { clinics: ClinicSetting[] }; setClinics(payload.clinics);
      setAddress(nextAddress);
      setMessage(supports24h ? t("requested") : t("save"));
    } catch { setError(t("saveError")); }
    finally { setBusy(false); }
  }

  return <Card className="space-y-4 p-5"><header><h1 className="font-display text-2xl font-bold">{t("title")}</h1>{selected?.location_verified_at ? <p className="mt-2 text-sm text-emerald-700">{t("verified")}</p> : selected?.supports_24h_requested && <p className="mt-2 text-sm text-muted-foreground">{t("requested")}</p>}</header>
    {clinics.length > 1 && <label className="grid gap-1 text-sm"><span>{t("title")}</span><select value={clinicId} onChange={(event) => setClinicId(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3">{clinics.map((clinic) => <option key={clinic.clinic_id} value={clinic.clinic_id}>{clinic.clinic_name}</option>)}</select></label>}
    <p className="text-sm text-muted-foreground">{t("mapHelp")}</p>
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><label className="sr-only" htmlFor="clinic-sos-address">{t("address")}</label><input id="clinic-sos-address" value={address} onChange={(event) => setAddress(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3" placeholder={t("address")} maxLength={240}/><button type="button" disabled={busy || address.trim().length < 5} onClick={() => void searchAddress()} className="min-h-11 rounded-xl border border-border px-4 font-semibold disabled:opacity-50">{t("search")}</button></div>
    <div ref={mapElement} role="region" aria-label={t("mapHelp")} className="h-72 rounded-xl border border-border bg-secondary" />
    {!googleKey && <p className="text-sm text-muted-foreground">{t("mapUnavailable")}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">{t("latitude")}<input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3" placeholder="10.7769"/></label><label className="grid gap-1 text-sm">{t("longitude")}<input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3" placeholder="106.7009"/></label></div>
    {selected?.is_admin && <label className="flex min-h-12 items-start gap-3 text-sm"><input type="checkbox" checked={supports24h} onChange={(event) => setSupports24h(event.target.checked)} className="mt-1 size-5"/>{t("supports")}</label>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    {selected?.is_admin && <button type="button" disabled={busy} onClick={() => void save()} className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{t("save")}</button>}
  </Card>;
}
