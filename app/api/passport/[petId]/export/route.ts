import { createPassportPdf } from "@/modules/passport/pdf";
import { evaluateRabiesStatus } from "@/modules/passport/share-service";
import { getOptionalUser, requireRole } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getPortalDatabase,
  ownerPetToClinicPet,
  resolveOwnerAccount,
} from "@/lib/portal-store/server-store";
import { DEMO_PETS_20 } from "@/modules/demo/hcmc-competition-dataset";

export async function GET(request: Request, context: { params: Promise<{ petId: string }> }) {
  const { petId } = await context.params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "vi";
  const sectionsParam = url.searchParams.get("sections");
  const includeOwnerParam = url.searchParams.get("include_owner") === "1";
  const snapshotParam = url.searchParams.get("snapshot");

  let petData: any = null;
  let vaccinations: any[] = [];
  let prescriptions: any[] = [];
  let allergies: any[] = [];
  let conditions: any[] = [];
  let visits: any[] = [];
  let ownerContact: any = undefined;

  if (isSupabaseConfigured()) {
    const { supabase, userId } = await requireRole(
      ["owner", "clinic_staff", "clinic_admin"],
      locale
    );
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

    const { data: allergyList } = await supabase
      .from("pet_allergies")
      .select("name, severity, source")
      .eq("pet_id", petId);
    allergies = allergyList ?? [];

    const { data: condList } = await supabase
      .from("pet_conditions")
      .select("name, status, source")
      .eq("pet_id", petId);
    conditions = condList ?? [];

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

    await supabase.from("audit_logs").insert({
      actor_id: userId,
      pet_id: petId,
      action: "export_pdf",
      entity_type: "passport",
      entity_id: petId,
    });
  } else {
    const user = await getOptionalUser();
    const portalDb = getPortalDatabase();

    // 1. Try optional live snapshot passed from Owner or Clinic UI
    let parsedSnapshot: any = null;
    if (snapshotParam) {
      try {
        parsedSnapshot = JSON.parse(snapshotParam);
      } catch {}
    }

    // 2. Resolve from clinicPetRecords, ownerPets, or DEMO_PETS_20
    let storedClinicPet = portalDb.clinicPetRecords[petId];
    if (!storedClinicPet && portalDb.ownerPets[petId]) {
      const op = portalDb.ownerPets[petId];
      const ownerAcc = resolveOwnerAccount(op.ownerEmail || op.ownerId || user?.email);
      storedClinicPet = ownerPetToClinicPet(op, undefined, ownerAcc.profile);
    }

    if (parsedSnapshot && parsedSnapshot.name) {
      const ownerAcc = resolveOwnerAccount(user?.email || user?.id);
      const baseClinic = storedClinicPet;
      petData = {
        id: parsedSnapshot.id || petId,
        name: parsedSnapshot.name,
        species: parsedSnapshot.species || baseClinic?.species || "dog",
        breed: parsedSnapshot.breed || baseClinic?.breed || "Thú cưng",
        gender: parsedSnapshot.gender || baseClinic?.gender || "male",
        birthDate: parsedSnapshot.birthDate || baseClinic?.birthDate || "2024-01-01",
        weightKg: Number(parsedSnapshot.weightKg) || baseClinic?.weightKg || 4.0,
        microchip:
          parsedSnapshot.microchip ||
          baseClinic?.microchip ||
          "981098102345678",
      };

      const rawVaxes = Array.isArray(parsedSnapshot.vaccinations)
        ? parsedSnapshot.vaccinations
        : baseClinic?.vaccinations || [];
      vaccinations = rawVaxes.map((v: any) => ({
        name: v.name || "Vắc-xin định kỳ",
        lot: v.lot || v.batchNo || "LOT-2026",
        administeredAt: v.date || v.adminDate || "2026-10-20",
        nextDueAt: v.nextDue || "2027-10-20",
        clinic: v.clinic || "Phòng Khám Thú Y PetCare · Quận 1",
        vetName: v.veterinarian || "BS. Nguyễn Văn Cường",
        verified: v.status !== "overdue" && v.status !== "expired",
      }));

      const rawEncounters = Array.isArray(parsedSnapshot.encounters)
        ? parsedSnapshot.encounters
        : baseClinic?.encounters || [];
      prescriptions = rawEncounters.flatMap((enc: any) =>
        (enc.prescriptions || []).map((rx: any) => ({
          name: rx.medication,
          dose: rx.dosage,
          instructions: rx.instructions || `${rx.frequency} (${rx.duration})`,
          startedAt: enc.date,
          verified: true,
        }))
      );
      visits = rawEncounters.map((enc: any) => ({
        date: enc.date,
        clinicName: enc.clinic || "Phòng Khám Thú Y PetCare · Quận 1",
        summary: `${enc.title}: ${enc.soapNotes?.assessment || ""}`,
      }));

      const rawAllergies = Array.isArray(parsedSnapshot.allergies)
        ? parsedSnapshot.allergies
        : baseClinic?.allergies || [];
      allergies = rawAllergies.map((a: any) => ({
        name: typeof a === "string" ? a : a.name,
        severity: "trung bình",
        source: "clinic",
      }));

      const rawConditions = Array.isArray(parsedSnapshot.conditions)
        ? parsedSnapshot.conditions
        : parsedSnapshot.medicalHistory
        ? [parsedSnapshot.medicalHistory]
        : baseClinic?.conditions || [];
      conditions = rawConditions.map((c: any) => ({
        name: typeof c === "string" ? c : c.name,
        status: "đang kiểm soát",
        source: "clinic",
      }));

      if (includeOwnerParam) {
        ownerContact = {
          name: parsedSnapshot.owner?.name || baseClinic?.owner.name || ownerAcc.profile.fullName,
          phone: parsedSnapshot.owner?.phone || baseClinic?.owner.phone || ownerAcc.profile.phone,
          district: parsedSnapshot.owner?.address || baseClinic?.owner.address || ownerAcc.profile.address,
        };
      }
    } else if (storedClinicPet) {
      petData = {
        id: storedClinicPet.id,
        name: storedClinicPet.name,
        species: storedClinicPet.species,
        breed: storedClinicPet.breed,
        gender: storedClinicPet.gender,
        birthDate: storedClinicPet.birthDate,
        weightKg: storedClinicPet.weightKg,
        microchip: storedClinicPet.microchip,
      };
      vaccinations = (storedClinicPet.vaccinations || []).map((v) => ({
        name: v.name,
        lot: v.batchNo,
        administeredAt: v.adminDate,
        nextDueAt: v.nextDue,
        clinic: v.clinic,
        vetName: v.veterinarian,
        verified: v.status === "valid",
      }));
      prescriptions = (storedClinicPet.encounters || []).flatMap((enc) =>
        (enc.prescriptions || []).map((rx) => ({
          name: rx.medication,
          dose: rx.dosage,
          instructions: rx.instructions || `${rx.frequency} (${rx.duration})`,
          startedAt: enc.date,
          verified: true,
        }))
      );
      allergies = (storedClinicPet.allergies || []).map((a) => ({
        name: a,
        severity: "trung bình",
        source: "clinic",
      }));
      conditions = (storedClinicPet.conditions || []).map((c) => ({
        name: c,
        status: "đang kiểm soát",
        source: "clinic",
      }));
      visits = (storedClinicPet.encounters || []).map((enc) => ({
        date: enc.date,
        clinicName: enc.clinic,
        summary: `${enc.title}: ${enc.soapNotes.assessment}`,
      }));
      if (includeOwnerParam) {
        ownerContact = {
          name: storedClinicPet.owner.name,
          phone: storedClinicPet.owner.phone,
          district: storedClinicPet.owner.address,
        };
      }
    } else {
      const demoMatch = DEMO_PETS_20.find((p) => p.id === petId) || DEMO_PETS_20[0];
      petData = {
        id: petId,
        name: demoMatch.name,
        species: demoMatch.species,
        breed: demoMatch.breed,
        gender: demoMatch.gender,
        birthDate: demoMatch.birthDate,
        weightKg: demoMatch.weightKg,
        microchip: demoMatch.microchip,
      };
      vaccinations = (demoMatch.vaccinations || []).map((v) => ({
        name: v.name,
        lot: v.lot,
        administeredAt: v.date,
        nextDueAt: v.nextDue,
        clinic: v.clinic,
        vetName: v.vetName,
        verified: v.verified,
      }));
      prescriptions = (demoMatch.prescriptions || []).map((rx) => ({
        name: rx.name,
        dose: rx.dose,
        instructions: rx.instructions,
        startedAt: rx.startedAt,
        verified: rx.verified,
      }));
      allergies = (demoMatch.allergies || []).map((a) => ({
        name: a,
        severity: "trung bình",
        source: "clinic",
      }));
      conditions = (demoMatch.conditions || []).map((c) => ({
        name: c,
        status: "đang kiểm soát",
        source: "clinic",
      }));
      visits = [
        {
          date: "2026-10-20",
          clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
          summary: "Khám lâm sàng định kỳ và đối chiếu sổ tiêm chủng điện tử. Thể trạng ổn định.",
        },
      ];
      if (includeOwnerParam) {
        ownerContact = {
          name: demoMatch.ownerName,
          phone: demoMatch.ownerPhone,
          district: demoMatch.ownerDistrict,
        };
      }
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

  const safeFilename = `pawcare-passport-${petId.replace(/[^a-zA-Z0-9_-]/g, "") || "record"}.pdf`;

  return new Response(pdfBytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeFilename}"`,
      "cache-control": "private, no-store",
    },
  });
}
