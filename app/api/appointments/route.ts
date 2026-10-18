import { z } from "zod";
import { requireRole } from "@/lib/auth/server";

const inputSchema = z.object({ slotId: z.string().uuid(), petId: z.string().uuid(), idempotencyKey: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_booking", details: parsed.error.flatten() }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const { data, error } = await supabase.rpc("book_slot", { p_slot: parsed.data.slotId, p_pet: parsed.data.petId, p_key: parsed.data.idempotencyKey });
  if (error) return Response.json({ error: error.message }, { status: 409 });
  return Response.json({ appointmentId: data, status: "requested" }, { status: 201 });
}
