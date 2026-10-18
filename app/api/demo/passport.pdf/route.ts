import { createPassportPdf } from "@/modules/passport/pdf";
import { demoPet, demoTimeline } from "@/modules/demo/fixtures";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
  const bytes = await createPassportPdf({
    locale, petName: `${demoPet.name} — FICTIONAL DEMO`, species: demoPet.species,
    generatedAt: new Date(), records: demoTimeline.map((record) => ({ date: record.date, type: record.type, summary: `${record.detail} · FICTIONAL DEMO` })),
  });
  return new Response(bytes as BodyInit, { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="pawcare-demo-passport.pdf"', "cache-control": "no-store" } });
}
