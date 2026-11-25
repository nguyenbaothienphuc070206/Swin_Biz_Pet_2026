import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createServiceClient } from "@/lib/supabase/service";
export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const { supabase } = await requireRole(["clinic_staff", "clinic_admin"], "vi");
  const { data, error } = await supabase.rpc("accepted_sos_details", { p_request: requestId });
  if (error || !data?.length) return Response.json({ error: "accepted_details_unavailable" }, { status: 403 });
  const photo = await supabase.rpc("accepted_sos_photo", { p_request: requestId });
  let photoUrl: string | null = null;
  if (!photo.error && photo.data) {
    const { data: signed } = await createServiceClient().storage.from("sos-private").createSignedUrl(photo.data, 300);
    photoUrl = signed?.signedUrl ?? null;
  }
  return Response.json({ details: data[0], photoUrl }, { headers: { "cache-control": "private, no-store" } });
}
