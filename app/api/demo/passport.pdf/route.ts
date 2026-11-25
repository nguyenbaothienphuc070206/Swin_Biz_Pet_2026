import { createPassportPdf } from "@/modules/passport/pdf";
import { demoPet, demoTimeline } from "@/modules/demo/fixtures";
import { evaluateRabiesStatus } from "@/modules/passport/share-service";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
  const vaccinations = [
    {
      name: "Vắc-xin phòng dại Rabisin (FICTIONAL DEMO)",
      lot: "DEMO-RAB-01",
      administeredAt: "2026-05-01",
      nextDueAt: "2027-05-01",
      clinic: "Phòng khám Thú y Bác Sĩ Tâm · Demo Q3",
      verified: true,
    },
    {
      name: "Vanguard Plus 5/CV-L (FICTIONAL DEMO)",
      lot: "DEMO-VG-02",
      administeredAt: "2026-05-01",
      nextDueAt: "2027-05-01",
      clinic: "Phòng khám Thú y Bác Sĩ Tâm · Demo Q3",
      verified: true,
    },
  ];

  const rabiesStatus = evaluateRabiesStatus([
    {
      name: "Vắc-xin phòng dại Rabisin",
      date: "2026-05-01",
      nextDue: "2027-05-01",
      lot: "DEMO-RAB-01",
      clinic: "Phòng khám Thú y Bác Sĩ Tâm · Demo Q3",
    },
  ]);

  const bytes = await createPassportPdf({
    locale,
    pet: {
      id: demoPet.id,
      name: `${demoPet.name} (Demo)`,
      species: demoPet.species,
      breed: demoPet.breed,
      birthDate: demoPet.birthDate,
      microchip: "982000412345678",
      weightKg: 11.5,
    },
    rabiesStatus,
    vaccinations,
    prescriptions: [
      {
        name: "NexGard Spectra 7.5-15kg (Demo)",
        dose: "1 viên",
        instructions: "Phòng ve rận & giun tim",
        startedAt: "2026-08-01",
        verified: true,
      },
    ],
    allergies: [{ name: "Dị ứng đạm bò (Demo)", severity: "trung bình", source: "clinic" }],
    conditions: [{ name: "Viêm da cơ địa (Demo)", status: "ổn định", source: "clinic" }],
    visits: demoTimeline.map((record) => ({
      date: record.date,
      clinicName: "PawCare Demo Clinic",
      summary: `${record.detail} · FICTIONAL DEMO`,
    })),
    generatedAt: new Date(),
    recordId: demoPet.id,
    verificationUrl: `https://pawcare.vn/records/verify/${demoPet.id}`,
  });

  return new Response(bytes as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="pawcare-demo-passport.pdf"',
      "cache-control": "no-store",
    },
  });
}
