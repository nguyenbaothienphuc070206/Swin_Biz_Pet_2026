"use client";

import { useEffect } from "react";
import { syncQueuedClinicEntries } from "@/modules/pwa/offline-store";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      process.env.NODE_ENV !== "production";

    if (isLocalhost) {
      // In development / localhost, proactively unregister any active service worker
      // and purge CacheStorage to prevent stale dev chunks, layout breaking, or FOUC.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    let active = true;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (!active) return;
        void registration.update().catch(() => {});
        const sync = () => {
          void syncQueuedClinicEntries();
          registration.active?.postMessage({ type: "SYNC_CLINIC_OUTBOX" });
        };
        window.addEventListener("online", sync);
        if ("sync" in registration) {
          void (
            registration as ServiceWorkerRegistration & {
              sync: { register: (tag: string) => Promise<void> };
            }
          ).sync
            .register("pawcare-clinic-outbox")
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return null;
}
