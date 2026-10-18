import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { calculateInvoiceTotal } from "@/modules/billing/invoice";

export async function GET() {
  const items = [
    { description: "Demo booking commission", quantity: 2, unitAmountMinor: 25_000 },
    { description: "Demo SOS routing commission", quantity: 1, unitAmountMinor: 15_000 },
  ];
  const total = calculateInvoiceTotal(items);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("PawCare demo invoice (fictional)", { x: 48, y: 780, size: 20, font, color: rgb(0.12, 0.31, 0.28) });
  page.drawText("SANDBOX ONLY - NOT A TAX INVOICE", { x: 48, y: 750, size: 12, font, color: rgb(0.7, 0.18, 0.12) });
  let y = 690;
  for (const item of items) {
    page.drawText(`${item.description} x ${item.quantity}`, { x: 48, y, size: 12, font });
    page.drawText(`${(item.quantity * item.unitAmountMinor).toLocaleString("en-US")} VND`, { x: 390, y, size: 12, font });
    y -= 32;
  }
  page.drawText(`Total: ${total.totalMinor.toLocaleString("en-US")} VND`, { x: 390, y: y - 12, size: 14, font });
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="pawcare-demo-invoice.pdf"', "cache-control": "no-store" } });
}
