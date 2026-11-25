import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashSosValue } from "@/modules/sos/security";

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const rawGuestToken = request.headers.get("x-sos-access-token");
  if (!user && !rawGuestToken) return Response.json({ error: "owner_access_required" }, { status: 401 });
  const tokenHash = rawGuestToken ? hashSosValue(rawGuestToken) : null;
  const rpc = user ? session : createServiceClient();
  const { data, error } = await rpc.rpc("owner_sos_status", { p_request: requestId, p_guest_token_hash: tokenHash });
  if (error || !data?.length) return Response.json({ error: "sos_not_found" }, { status: 404 });
  const status = data[0];
  let acceptedClinic = null;
  let pet = null;
  let round = null;
  const db = createServiceClient();
  if (status.status === "searching") {
    const { data: currentRound } = await db.from("sos_rounds").select("id,started_at,deadline_at").eq("request_id", requestId).eq("radius_m", status.radius_m).order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (currentRound) {
      const { count } = await db.from("sos_dispatches").select("id", { count: "exact", head: true }).eq("round_id", currentRound.id);
      round = { started_at: currentRound.started_at, deadline_at: currentRound.deadline_at, notified_count: count ?? 0 };
    }
  }
  if (status.status === "accepted" && status.accepted_clinic_id) {
    const [{ data: clinic }, { data: requestData }, { data: dispatch }] = await Promise.all([
      db.from("clinics").select("name,address,phone").eq("id", status.accepted_clinic_id).maybeSingle(),
      db.from("sos_requests").select("pet_id,eta_minutes").eq("id", requestId).maybeSingle(),
      db.from("sos_dispatches").select("distance_m").eq("request_id", requestId).eq("clinic_id", status.accepted_clinic_id).maybeSingle(),
    ]);
    acceptedClinic = clinic ? { ...clinic, distance_m: dispatch?.distance_m ?? null, eta_minutes: requestData?.eta_minutes ?? null } : null;
    if (requestData?.pet_id) {
      const { data: petData } = await db.from("pets").select("id,name,species,breed").eq("id", requestData.pet_id).maybeSingle();
      pet = petData;
    }
  }
  return Response.json({ ...status, ...(round ?? {}), acceptedClinic, pet, hotline: process.env.SOS_FALLBACK_HOTLINE ?? null });
}

export async function PATCH(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await context.params;
  if (!z.string().uuid().safeParse(requestId).success) return Response.json({ error: "invalid_request_id" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const guestToken = _request.headers.get("x-sos-access-token");
  if (!user && !guestToken) return Response.json({ error: "owner_access_required" }, { status: 401 });
  const rpc = user ? supabase : createServiceClient();
  const { data, error } = await rpc.rpc("cancel_sos_v2", { p_request: requestId, p_guest_token_hash: guestToken ? hashSosValue(guestToken) : null });
  if (error) return Response.json({ error: "cancel_failed" }, { status: 409 });
  if (data !== true) return Response.json({ error: "request_not_cancelable" }, { status: 409 });
  return Response.json({ canceled: true });
}
