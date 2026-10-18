const CACHE="pawcare-shell-v2";
const PRECACHE=["/offline.html","/offline.js","/icons/pawcare.svg"];
self.addEventListener("push",event=>{let payload={};try{payload=event.data?event.data.json():{};}catch{}event.waitUntil(self.registration.showNotification(payload.title||"PawCare",{body:payload.body||"",data:{href:typeof payload.href==="string"&&payload.href.startsWith("/")?payload.href:"/"},tag:"pawcare-"+(payload.tag||"notice")}));});
self.addEventListener("notificationclick",event=>{event.notification.close();const destination=new URL(event.notification.data?.href||"/",self.location.origin).href;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>client.url.startsWith(self.location.origin));if(existing)return existing.navigate(destination).then(()=>existing.focus());return self.clients.openWindow(destination);}));});
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("pawcare-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(url.origin!==self.location.origin||request.method!=="GET"||url.pathname.startsWith("/api/")||url.pathname.startsWith("/auth/")||url.pathname.startsWith("/_next/data/"))return;
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).catch(()=>caches.match("/offline.html")));
    return;
  }
  if(url.pathname.startsWith("/_next/static/"))event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;})));
});
async function syncClinicQueue(){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open("pawcare-offline-v1",1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const entries=await new Promise((resolve,reject)=>{const request=db.transaction("clinicEntries","readonly").objectStore("clinicEntries").getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  for(const entry of entries){if(entry.state!=="queued")continue;try{const response=await fetch(`/api/clinic/pets/${encodeURIComponent(entry.petId)}/vaccinations`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({...entry.body,actorId:entry.actorId,idempotencyKey:entry.key})});if(response.ok){await new Promise((resolve,reject)=>{const request=db.transaction("clinicEntries","readwrite").objectStore("clinicEntries").delete(entry.key);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});continue;}if(response.status>=500)throw new Error("retry");entry.state=response.status===409||response.status===403?"conflict":"failed";entry.lastError=response.status===403?"grant_or_identity_changed":"record_conflict";await new Promise((resolve,reject)=>{const request=db.transaction("clinicEntries","readwrite").objectStore("clinicEntries").put(entry);request.onsuccess=resolve;request.onerror=()=>reject(request.error);});}catch(error){if(error instanceof TypeError||error instanceof Error&&error.message==="retry")throw error;}}
  db.close();
}
self.addEventListener("sync",event=>{if(event.tag==="pawcare-clinic-outbox")event.waitUntil(syncClinicQueue());});
self.addEventListener("message",event=>{if(event.data?.type==="SYNC_CLINIC_OUTBOX")event.waitUntil(syncClinicQueue());});
