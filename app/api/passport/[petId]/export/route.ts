import { createPassportPdf } from "@/modules/passport/pdf";
import { requireRole } from "@/lib/auth/server";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const { petId } = await context.params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
  const { supabase } = await requireRole(["owner"], locale);
  const { data: pet, error } = await supabase.from("pets").select("id,name,species").eq("id", petId).is("deleted_at", null).maybeSingle();
  if (error || !pet) return Response.json({ error: "not_found" }, { status: 404 });
  const { data: records } = await supabase.from("medical_records").select("occurred_at,record_type,summary").eq("pet_id", petId).order("occurred_at", { ascending: true });
  await supabase.from("audit_logs").insert({ actor_id: (await supabase.auth.getUser()).data.user?.id, pet_id: petId, action: "export", entity_type: "passport", entity_id: petId });
  const bytes = await createPassportPdf({ locale, petName: pet.name, species: pet.species, generatedAt: new Date(), records: (records ?? []).map((record) => ({ date: record.occurred_at.slice(0, 10), type: record.record_type, summary: record.summary })) });
  return new Response(bytes as BodyInit, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="pawcare-passport-${petId}.pdf"`, "cache-control": "private, no-store" } });
}
