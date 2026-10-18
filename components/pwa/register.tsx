"use client";
import {useEffect} from "react";
import {syncQueuedClinicEntries} from "@/modules/pwa/offline-store";

export function PwaRegister(){useEffect(()=>{if(!(typeof navigator!=="undefined"&&"serviceWorker" in navigator))return;let active=true;navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}).then(registration=>{if(!active)return;void registration.update().catch(()=>{});const sync=()=>{void syncQueuedClinicEntries();registration.active?.postMessage({type:"SYNC_CLINIC_OUTBOX"});};window.addEventListener("online",sync);if("sync" in registration)void (registration as ServiceWorkerRegistration&{sync:{register:(tag:string)=>Promise<void>}}).sync.register("pawcare-clinic-outbox").catch(()=>{});}).catch(()=>{});return()=>{active=false;};},[]);return null;}
