"use client";

import { useEffect, useRef } from "react";

const SYNCED_EXACT_KEYS = new Set([
  "pawcare-user-pets",
  "pawcare-clinic-pet-records",
  "pawcare-appointments",
  "pawcare-care-plans",
  "pawcare-active-sos-lead",
  "pawcare-user-profile",
  "pawcare-clinic-profile",
  "pawcare-registered-clinic",
  "pawcare-clinic-portal-settings",
  "pawcare_active_pet_id",
  "pawcare_subscription_plan",
  "pawcare_plan",
  "pawcare-care-reminders",
]);

function isSyncedKey(key: string): boolean {
  return (
    SYNCED_EXACT_KEYS.has(key) ||
    key.startsWith("pawcare_chat_") ||
    key.startsWith("pawcare-weight-history-")
  );
}

let isApplyingRemoteState = false;
let interceptorInstalled = false;

function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = window.localStorage.getItem(key);
    if (current === value) return false;
    isApplyingRemoteState = true;
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  } finally {
    isApplyingRemoteState = false;
  }
}

function isRecentlyDirty(key: string, windowMs = 8000): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ts = Number(window.sessionStorage.getItem(`pawcare_dirty_${key}`) || "0");
    return ts > 0 && Date.now() - ts < windowMs;
  } catch {
    return false;
  }
}

function markKeyDirty(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`pawcare_dirty_${key}`, String(Date.now()));
  } catch {}
}

function pushStorageKeyToBackend(key: string, rawValue: string | null) {
  if (typeof window === "undefined") return;
  let parsed: unknown = rawValue;
  if (rawValue !== null) {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = rawValue;
    }
  }
  markKeyDirty(key);
  fetch("/api/portal/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      action: "sync_storage_key",
      key,
      payload: parsed,
    }),
  }).catch(() => {});
}

function installLocalStorageInterceptor() {
  if (typeof window === "undefined" || interceptorInstalled) return;
  interceptorInstalled = true;

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  window.localStorage.setItem = function (key: string, value: string) {
    originalSetItem(key, value);
    if (!isApplyingRemoteState && isSyncedKey(key)) {
      pushStorageKeyToBackend(key, value);
    }
  };

  window.localStorage.removeItem = function (key: string) {
    originalRemoveItem(key);
    if (!isApplyingRemoteState && key === "pawcare-active-sos-lead") {
      pushStorageKeyToBackend(key, null);
    }
  };
}

export function PortalSyncBridge({ role }: { role: "owner" | "clinic" }) {
  const syncingRef = useRef(false);

  useEffect(() => {
    installLocalStorageInterceptor();

    const pullFromBackend = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        const res = await fetch(`/api/portal/state?role=${role === "clinic" ? "clinic_admin" : "owner"}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success) return;

        let changedPets = false;
        let changedApts = false;
        let changedPlans = false;
        let changedProfile = false;
        let changedPlanTier = false;

        if (role === "owner" && data.ownerAccount) {
          const prevOwnerId = window.localStorage.getItem("pawcare_synced_owner_id");
          const accountSwitched = prevOwnerId !== data.ownerAccount.id;

          if (accountSwitched) {
            safeSetLocalStorage("pawcare_synced_owner_id", data.ownerAccount.id);
          }

          // 1. Subscription Plan (4 Premium Accounts)
          if (data.plan && (accountSwitched || !isRecentlyDirty("pawcare_subscription_plan"))) {
            const c1 = safeSetLocalStorage("pawcare_subscription_plan", data.plan);
            const c2 = safeSetLocalStorage("pawcare_plan", data.plan);
            if (c1 || c2) changedPlanTier = true;
          }

          // 2. Owner Profile
          if (data.userProfile && (accountSwitched || !isRecentlyDirty("pawcare-user-profile"))) {
            const pChanged = safeSetLocalStorage(
              "pawcare-user-profile",
              JSON.stringify(data.userProfile)
            );
            safeSetLocalStorage("pawcare-owner-name", data.userProfile.fullName || "");
            safeSetLocalStorage("pawcare-user-phone", data.userProfile.phone || "");
            safeSetLocalStorage("pawcare-user-district", data.userProfile.district || "");
            if (pChanged) changedProfile = true;
          }

          // 3. Owner Pets (Paired with Clinic EMR)
          if (Array.isArray(data.userPets) && (accountSwitched || !isRecentlyDirty("pawcare-user-pets"))) {
            if (safeSetLocalStorage("pawcare-user-pets", JSON.stringify(data.userPets))) {
              changedPets = true;
            }
          }

          if (data.activePetId && (accountSwitched || !window.localStorage.getItem("pawcare_active_pet_id"))) {
            safeSetLocalStorage("pawcare_active_pet_id", data.activePetId);
          }

          // 4. Weight History
          if (data.weightHistory && typeof data.weightHistory === "object") {
            for (const [petId, logs] of Object.entries(data.weightHistory)) {
              const wKey = `pawcare-weight-history-${petId}`;
              if (!isRecentlyDirty(wKey)) {
                safeSetLocalStorage(wKey, JSON.stringify(logs));
              }
            }
          }

          // 5. Reminders
          if (Array.isArray(data.reminders) && !isRecentlyDirty("pawcare-care-reminders")) {
            safeSetLocalStorage("pawcare-care-reminders", JSON.stringify(data.reminders));
          }

          // 6. Paired Clinic Profile reference
          if (data.clinicProfile && !isRecentlyDirty("pawcare-registered-clinic")) {
            safeSetLocalStorage("pawcare-registered-clinic", JSON.stringify(data.clinicProfile));
          }
        }

        if (role === "clinic") {
          // 1. Clinic EMR Pet Records (All 4 Premium Owners' Pets + Newly Registered Pets)
          if (
            Array.isArray(data.clinicPetRecords) &&
            !isRecentlyDirty("pawcare-clinic-pet-records")
          ) {
            if (
              safeSetLocalStorage(
                "pawcare-clinic-pet-records",
                JSON.stringify(data.clinicPetRecords)
              )
            ) {
              changedPets = true;
            }
          }

          // 2. Clinic Profile (only hydrate if not already customized locally)
          if (
            data.clinicProfile &&
            !isRecentlyDirty("pawcare-registered-clinic") &&
            !window.localStorage.getItem("pawcare-registered-clinic")
          ) {
            safeSetLocalStorage("pawcare-registered-clinic", JSON.stringify(data.clinicProfile));
            safeSetLocalStorage("pawcare-clinic-profile", JSON.stringify(data.clinicProfile));
          }
        }

        // Shared Cross-Portal Collections (Appointments, Care Plans, Chat, SOS)
        if (Array.isArray(data.appointments) && !isRecentlyDirty("pawcare-appointments")) {
          if (safeSetLocalStorage("pawcare-appointments", JSON.stringify(data.appointments))) {
            changedApts = true;
          }
        }

        if (Array.isArray(data.carePlans) && !isRecentlyDirty("pawcare-care-plans")) {
          if (safeSetLocalStorage("pawcare-care-plans", JSON.stringify(data.carePlans))) {
            changedPlans = true;
          }
        }

        if (data.carePlanChats && typeof data.carePlanChats === "object") {
          for (const [planId, msgs] of Object.entries(data.carePlanChats)) {
            const cKey = `pawcare_chat_${planId}`;
            if (!isRecentlyDirty(cKey)) {
              safeSetLocalStorage(cKey, JSON.stringify(msgs));
            }
          }
        }

        if (data.activeSosLead && !isRecentlyDirty("pawcare-active-sos-lead")) {
          safeSetLocalStorage("pawcare-active-sos-lead", JSON.stringify(data.activeSosLead));
        }

        // Notify active views if any paired collection updated
        if (changedPets) {
          window.dispatchEvent(new Event("pawcare-pets-updated"));
        }
        if (changedApts) {
          window.dispatchEvent(new Event("pawcare-appointments-updated"));
        }
        if (changedPlans) {
          window.dispatchEvent(new CustomEvent("pawcare-careplans-updated"));
        }
        if (changedProfile) {
          window.dispatchEvent(new Event("pawcare-user-profile-updated"));
        }
        if (changedPlanTier) {
          window.dispatchEvent(new Event("pawcare_plan_changed"));
        }
        if (changedPets || changedApts || changedPlans || changedProfile) {
          window.dispatchEvent(new Event("storage"));
        }
      } catch {
      } finally {
        syncingRef.current = false;
      }
    };

    pullFromBackend();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        pullFromBackend();
      }
    }, 4000);

    const handleFocus = () => pullFromBackend();
    const handleManualSync = () => pullFromBackend();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pawcare-force-portal-sync", handleManualSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pawcare-force-portal-sync", handleManualSync);
    };
  }, [role]);

  return null;
}
