"use client";

import {clinicEntryFailureState,shouldRetryClinicEntry} from "./outbox";

export type OwnerOfflineSnapshot = {
  userId: string;
  savedAt: string;
  pets: Array<{id:string;name:string;species:string;birth_date:string|null;allergies:unknown[];conditions:unknown[];vaccinations:unknown[];records:Array<{record_type:string;occurred_at:string;summary:string}>;prescriptions:Array<{medication_name:string;dose:string;started_at:string}>}>;
  careTasks: Array<{id:string;task_key:string;category:string;due_from:string|null;due_to:string|null;status:string;pet_name:string}>;
};
export type QueuedClinicEntry = {key:string;petId:string;actorId:string;body:Record<string,string>;createdAt:string;state:"queued"|"conflict"|"failed";lastError?:string};

const DB_NAME="pawcare-offline-v1";
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("ownerSnapshots"))db.createObjectStore("ownerSnapshots",{keyPath:"userId"});if(!db.objectStoreNames.contains("clinicEntries"))db.createObjectStore("clinicEntries",{keyPath:"key"});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function store<T>(name:string,mode:IDBTransactionMode,run:(objectStore:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await openDb();return new Promise((resolve,reject)=>{const transaction=db.transaction(name,mode);const request=run(transaction.objectStore(name));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);transaction.oncomplete=()=>db.close();transaction.onerror=()=>reject(transaction.error);});}

export function saveOwnerSnapshot(snapshot:OwnerOfflineSnapshot){return store("ownerSnapshots","readwrite",table=>table.put(snapshot));}
export function getOwnerSnapshot(userId?:string){return userId?store<OwnerOfflineSnapshot|undefined>("ownerSnapshots","readonly",table=>table.get(userId)):store<OwnerOfflineSnapshot[]>("ownerSnapshots","readonly",table=>table.getAll()).then(rows=>rows.sort((a,b)=>b.savedAt.localeCompare(a.savedAt))[0]);}
export function clearOwnerSnapshot(userId:string){return store("ownerSnapshots","readwrite",table=>table.delete(userId));}
export async function clearAllOwnerSnapshots(){const rows=await store<OwnerOfflineSnapshot[]>("ownerSnapshots","readonly",table=>table.getAll());await Promise.all(rows.map(row=>clearOwnerSnapshot(row.userId)));}
export function listClinicEntries(){return store<QueuedClinicEntry[]>("clinicEntries","readonly",table=>table.getAll());}
export function putClinicEntry(entry:QueuedClinicEntry){return store("clinicEntries","readwrite",table=>table.put(entry));}
export function deleteClinicEntry(key:string){return store("clinicEntries","readwrite",table=>table.delete(key));}

export async function syncClinicEntry(entry:QueuedClinicEntry){
  let status:number|null=null;
  try{const response=await fetch(`/api/clinic/pets/${encodeURIComponent(entry.petId)}/vaccinations`,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({...entry.body,actorId:entry.actorId,idempotencyKey:entry.key})});status=response.status;if(response.ok){await deleteClinicEntry(entry.key);return "sent" as const;}if(shouldRetryClinicEntry(status))return "queued" as const;await putClinicEntry({...entry,state:clinicEntryFailureState(status),lastError:status===403?"grant_or_identity_changed":"record_conflict"});return "conflict" as const;}catch{await putClinicEntry({...entry,state:"queued",lastError:"offline"});return "queued" as const;}
}
export async function syncQueuedClinicEntries(){for(const entry of await listClinicEntries())if(entry.state==="queued")await syncClinicEntry(entry);}
