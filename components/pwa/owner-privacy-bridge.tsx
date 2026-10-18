"use client";
import {useEffect} from "react";
import {createClient} from "@/lib/supabase/client";
import {clearAllOwnerSnapshots} from "@/modules/pwa/offline-store";

export function OwnerOfflinePrivacyBridge(){useEffect(()=>{try{const supabase=createClient();const {data}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")void clearAllOwnerSnapshots();});return()=>data.subscription.unsubscribe();}catch{return;}},[]);return null;}
