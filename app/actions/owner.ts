"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";

const petInput=z.object({name:z.string().trim().min(1).max(80),species:z.enum(["dog","cat","other"]),birth_date:z.string().optional().transform((value)=>value||null)});
export async function addPetAction(formData:FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  const parsed=petInput.safeParse({name:formData.get("name"),species:formData.get("species"),birth_date:formData.get("birth_date")});
  if(!parsed.success) redirect(`/${locale}/owner?error=pet`);
  const {supabase,userId}=await requireRole(["owner"],locale);
  const {error}=await supabase.from("pets").insert({owner_id:userId,...parsed.data});
  if(error) redirect(`/${locale}/owner?error=save`);
  redirect(`/${locale}/owner?created=1`);
}
