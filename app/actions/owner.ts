"use server";
import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {z} from "zod";
import {requireRole} from "@/lib/auth/server";

export async function ensureOwnerSessionAction(locale: "vi" | "en" = "vi") {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get("pawcare_dev_session");
  if (!existingCookie?.value) {
    const devUser = {
      sub: "dev-owner-id",
      email: "",
      role: "owner",
      name: "",
    };
    cookieStore.set("pawcare_dev_session", JSON.stringify(devUser), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return { success: true };
}

const petInput=z.object({name:z.string().trim().min(1).max(80),species:z.enum(["dog","cat","other"]),birth_date:z.string().optional().transform((value)=>value||null)});
export async function addPetAction(formData:FormData) {
  const locale=formData.get("locale")==="en"?"en":"vi";
  const parsed=petInput.safeParse({name:formData.get("name"),species:formData.get("species"),birth_date:formData.get("birth_date")});
  if(!parsed.success) redirect(`/${locale}/owner/pets?error=pet`);
  const {supabase,userId}=await requireRole(["owner"],locale);
  const {error}=await supabase.from("pets").insert({owner_id:userId,...parsed.data});
  if(error) redirect(`/${locale}/owner/pets?error=save`);
  redirect(`/${locale}/owner/pets?created=1`);
}
