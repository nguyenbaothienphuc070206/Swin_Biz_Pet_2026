import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { recommendProducts, type ProductCandidate } from "@/modules/commerce/recommendations";

export async function GET(request: Request) {
  const petId = new URL(request.url).searchParams.get("petId");
  if (!z.string().uuid().safeParse(petId).success) return Response.json({ error: "invalid_pet_id" }, { status: 400 });
  const { supabase } = await requireRole(["owner"], "vi");
  const [petResult, allergyResult, conditionResult, productResult] = await Promise.all([
    supabase.from("pets").select("id,species,birth_date").eq("id", petId!).is("deleted_at", null).maybeSingle(),
    supabase.from("pet_allergies").select("name").eq("pet_id", petId!),
    supabase.from("pet_conditions").select("name").eq("pet_id", petId!).eq("status", "active"),
    supabase.from("products").select("id,species,life_stages,ingredients,allergens,dietary_tags,condition_exclusions,safety_reviewed,sponsored").eq("published", true),
  ]);
  if (petResult.error || !petResult.data) return Response.json({ error: "pet_not_found" }, { status: 404 });
  if (allergyResult.error || conditionResult.error || productResult.error) return Response.json({ error: "catalog_unavailable" }, { status: 503 });
  const ageMonths = petResult.data.birth_date ? Math.max(0, Math.floor((Date.now() - Date.parse(petResult.data.birth_date)) / 2_629_800_000)) : 0;
  const lifeStage = ageMonths < 12 ? "juvenile" : ageMonths >= 84 ? "senior" : "adult";
  const pet = { species: petResult.data.species, lifeStage, allergies: allergyResult.data.map((item) => item.name), conditions: conditionResult.data.map((item) => item.name) };
  const products: ProductCandidate[] = (productResult.data ?? []).map((row) => ({
    id: row.id, species: row.species, lifeStages: row.life_stages, ingredients: row.ingredients,
    allergens: row.allergens, dietaryTags: row.dietary_tags, conditionExclusions: row.condition_exclusions,
    safetyReviewed: row.safety_reviewed, sponsored: row.sponsored, relevance: 0,
  }));
  return Response.json({ results: recommendProducts(pet, products) }, { headers: { "cache-control": "private, no-store" } });
}
