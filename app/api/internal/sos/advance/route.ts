import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

function authorized(value: string | null) {
  const secret = process.env.SOS_DISPATCH_JOB_TOKEN;
  if (!secret || !value?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = createServiceClient();
  const { data, error } = await db.rpc("advance_sos_rounds");
  if (error) return Response.json({ error: "sos_rounds_unavailable" }, { status: 503 });
  return Response.json({ advanced: Number(data ?? 0) });
}
