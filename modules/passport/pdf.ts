import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type PassportPdfInput = { locale: "vi" | "en"; petName: string; species: string; generatedAt: Date; records: Array<{ date: string; type: string; summary: string }> };

export async function createPassportPdf(input: PassportPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(join(process.cwd(), "public", "fonts", "be-vietnam-pro-vietnamese-400.woff"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const title = input.locale === "vi" ? "Hồ sơ sức khỏe thú cưng" : "Pet health passport";
  const generated = new Intl.DateTimeFormat(input.locale === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(input.generatedAt);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const draw = (text: string, size = 11, color = rgb(0.12, 0.25, 0.21)) => { page.drawText(text, { x: 48, y, size, font, color, maxWidth: 495 }); y -= size + 12; };
  draw(title, 20);
  draw(`${input.petName} · ${input.species}`, 13);
  draw(`${input.locale === "vi" ? "Xuất lúc" : "Generated"}: ${generated}`, 9, rgb(0.35, 0.42, 0.39));
  y -= 12;
  draw(input.locale === "vi" ? "Lịch sử hồ sơ" : "Record history", 15);
  for (const record of input.records) {
    if (y < 90) { page = pdf.addPage([595, 842]); y = 790; }
    draw(`${record.date} · ${record.type}`, 10);
    draw(record.summary, 10, rgb(0.29, 0.37, 0.33));
    y -= 5;
  }
  const disclaimer = input.locale === "vi" ? "Bản sao hồ sơ do chủ nuôi cung cấp. Không thay thế tư vấn của bác sĩ thú y." : "Owner-provided record copy. This does not replace veterinary advice.";
  page.drawText(disclaimer, { x: 48, y: 36, size: 8, font, color: rgb(0.35, 0.42, 0.39), maxWidth: 495 });
  return pdf.save();
}
