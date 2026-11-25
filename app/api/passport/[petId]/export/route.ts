import { createPassportPdf } from "@/modules/passport/pdf";
import { evaluateRabiesStatus } from "@/modules/passport/share-service";
import { requireRole } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const { petId } = await context.params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "vi";
  const sectionsParam = url.searchParams.get("sections");
  const includeOwnerParam = url.searchParams.get("include_owner") === "1";

  const { supabase, userId } = await requireRole(["owner", "clinic_staff", "clinic_admin"], locale);

  let petData: any = null;
  let records: any[] = [];
  let vaccinations: any[] = [];
  let prescriptions: any[] = [];
  let allergies: any[] = [];
  let conditions: any[] = [];
  let visits: any[] = [];
  let ownerContact: any = undefined;

  if (isSupabaseConfigured()) {
    const { data: pet, error } = await supabase
      .from("pets")
      .select("id, name, species, breed, birth_date, microchip")
      .eq("id", petId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !pet) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    petData = pet;

    // Fetch vaccinations
    const { data: vaxList } = await supabase
      .from("vaccinations")
      .select("vaccine_name, code, dose, lot, administered_at, next_due_at, is_demo")
      .eq("pet_id", petId)
      .order("administered_at", { ascending: false });

    vaccinations = (vaxList ?? []).map((v: any) => ({
      name: v.vaccine_name,
      code: v.code,
      dose: v.dose,
      lot: v.lot,
      administeredAt: v.administered_at,
      nextDueAt: v.next_due_at,
      verified: true,
      clinic: "PawCare Partner Clinic",
    }));

    // Fetch prescriptions
    const { data: rxList } = await supabase
      .from("prescriptions")
      .select("medication_name, dose, started_at, ended_at, instructions")
      .eq("pet_id", petId)
      .order("started_at", { ascending: false });

    prescriptions = (rxList ?? []).map((r: any) => ({
      name: r.medication_name,
      dose: r.dose,
      instructions: r.instructions,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      verified: true,
    }));

    // Fetch allergies
    const { data: allergyList } = await supabase
      .from("pet_allergies")
      .select("name, severity, source")
      .eq("pet_id", petId);
    allergies = allergyList ?? [];

    // Fetch conditions
    const { data: condList } = await supabase
      .from("pet_conditions")
      .select("name, status, source")
      .eq("pet_id", petId);
    conditions = condList ?? [];

    // Fetch visits from medical_records
    const { data: recList } = await supabase
      .from("medical_records")
      .select("occurred_at, summary")
      .eq("pet_id", petId)
      .order("occurred_at", { ascending: false })
      .limit(10);

    visits = (recList ?? []).map((m: any) => ({
      date: m.occurred_at.slice(0, 10),
      clinicName: "PawCare Clinic",
      summary: m.summary,
    }));

    // Audit log
    await supabase.from("audit_logs").insert({
      actor_id: userId,
      pet_id: petId,
      action: "export_pdf",
      entity_type: "passport",
      entity_id: petId,
    });
  } else {
    // Development / fallback data
    petData = {
      id: petId,
      name: "Mochi",
      species: "dog",
      breed: "Corgi Wales Pembroke",
      gender: "male",
      birthDate: "2022-03-15",
      weightKg: 11.5,
      microchip: "982000412345678",
    };

    vaccinations = [
      {
        name: "Vắc-xin phòng dại Rabisin (Boehringer Ingelheim)",
        lot: "RAB-2026-09",
        administeredAt: "2026-05-10",
        nextDueAt: "2027-05-10",
        clinic: "Phòng khám Thú y Bác Sĩ Tâm · Q3",
        vetName: "BS. Nguyễn Văn Tâm",
        verified: true,
      },
      {
        name: "Vanguard Plus 5/CV-L (Phòng 7 bệnh chó)",
        lot: "VG-2026-44",
        administeredAt: "2026-05-10",
        nextDueAt: "2027-05-10",
        clinic: "Phòng khám Thú y Bác Sĩ Tâm · Q3",
        verified: true,
      },
      {
        name: "Xổ giun Drontal Plus",
        lot: "DR-55",
        administeredAt: "2026-08-01",
        nextDueAt: "2026-11-01",
        clinic: "Tự thực hiện tại nhà",
        verified: false,
      },
    ];

    prescriptions = [
      {
        name: "Bravecto 10-20kg (Trị ve rận & ghẻ Demodex)",
        dose: "1 viên nhai",
        instructions: "Uống sau bữa ăn, bảo vệ trong 12 tuần",
        startedAt: "2026-08-15",
        verified: true,
      },
    ];

    allergies = [{ name: "Dị ứng đạm bò", severity: "trung bình", source: "clinic" }];
    conditions = [{ name: "Viêm da tiếp xúc cơ địa", status: "đang kiểm soát", source: "clinic" }];
    visits = [
      {
        date: "2026-05-10",
        clinicName: "Phòng khám Thú y Bác Sĩ Tâm · Quận 3",
        summary: "Tiêm chủng định kỳ vắc-xin 7 bệnh và phòng dại. Tình trạng sức khỏe tốt, thân nhiệt 38.4°C.",
      },
    ];

    if (includeOwnerParam) {
      ownerContact = {
        name: "Nguyễn Văn An",
        phone: "0908 123 456",
        district: "Quận 3, TP.HCM",
      };
    }
  }

  const rabiesStatus = evaluateRabiesStatus(
    vaccinations.map((v) => ({
      name: v.name,
      date: v.administeredAt,
      nextDue: v.nextDueAt,
      lot: v.lot,
      clinic: v.clinic,
    }))
  );

  const sections = sectionsParam ? sectionsParam.split(",") : undefined;

  const pdfBytes = await createPassportPdf({
    locale,
    pet: petData,
    rabiesStatus,
    vaccinations,
    prescriptions,
    allergies,
    conditions,
    visits,
    ownerContact,
    sections,
    generatedAt: new Date(),
    recordId: petId,
    verificationUrl: `${url.origin}/${locale}/records/verify/${petId}`,
  });

  return new Response(pdfBytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="pawcare-passport-${petId}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
