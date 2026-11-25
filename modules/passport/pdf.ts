import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, StandardFonts, grayscale, PDFPage, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { RabiesStatusResult } from "./share-service";

export interface PassportPdfInput {
  locale: "vi" | "en";
  pet: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    gender?: string;
    birthDate?: string;
    weightKg?: number;
    microchip?: string;
  };
  rabiesStatus: RabiesStatusResult;
  vaccinations: Array<{
    name: string;
    code?: string;
    dose?: string;
    lot?: string;
    administeredAt: string;
    nextDueAt?: string;
    clinic?: string;
    vetName?: string;
    verified?: boolean;
  }>;
  prescriptions?: Array<{
    name: string;
    dose: string;
    instructions: string;
    startedAt: string;
    endedAt?: string;
    verified?: boolean;
  }>;
  allergies?: Array<{
    name: string;
    severity?: string;
    source?: "clinic" | "owner";
  }>;
  conditions?: Array<{
    name: string;
    status?: string;
    source?: "clinic" | "owner";
  }>;
  visits?: Array<{
    date: string;
    clinicName: string;
    summary: string;
  }>;
  ownerContact?: {
    name?: string;
    phone?: string;
    district?: string;
  };
  sections?: string[];
  generatedAt: Date;
  recordId: string;
  verificationUrl?: string;
}

export async function createPassportPdf(input: PassportPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Load Be Vietnam Pro Regular & Bold fonts for full Vietnamese diacritics
  let regularFontBytes: Buffer;
  let boldFontBytes: Buffer;

  try {
    regularFontBytes = await readFile(join(process.cwd(), "public", "fonts", "be-vietnam-pro-vietnamese-400.woff"));
  } catch {
    regularFontBytes = await readFile(join(process.cwd(), "node_modules", "@fontsource", "be-vietnam-pro", "files", "be-vietnam-pro-vietnamese-400-normal.woff"));
  }

  try {
    boldFontBytes = await readFile(join(process.cwd(), "public", "fonts", "be-vietnam-pro-vietnamese-700.woff"));
  } catch {
    boldFontBytes = await readFile(join(process.cwd(), "node_modules", "@fontsource", "be-vietnam-pro", "files", "be-vietnam-pro-vietnamese-700-normal.woff"));
  }

  const regularFont = await pdf.embedFont(regularFontBytes, { subset: true });
  const boldFont = await pdf.embedFont(boldFontBytes, { subset: true });

  const isVi = input.locale === "vi";
  const sections = new Set(input.sections || ["vaccinations", "medications", "allergies", "conditions", "visits"]);

  // Colors
  const cPrimary = rgb(0.06, 0.45, 0.35); // #0f766e teal
  const cDark = rgb(0.1, 0.15, 0.13);
  const cMuted = rgb(0.42, 0.47, 0.45);
  const cBorder = rgb(0.82, 0.86, 0.84);
  const cBgLight = rgb(0.96, 0.98, 0.97);
  const cValidGreen = rgb(0.08, 0.55, 0.28);
  const cValidBg = rgb(0.92, 0.98, 0.94);
  const cAlertRed = rgb(0.78, 0.15, 0.15);
  const cAlertBg = rgb(0.99, 0.93, 0.93);

  // A4 size: 595 x 842 pt
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const leftX = 40;
  const contentWidth = 515;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    page.drawText(`PawCare · ${input.pet.name} (${input.pet.species}) · ID: ${input.recordId.slice(0, 8)}`, {
      x: leftX,
      y,
      size: 8,
      font: regularFont,
      color: cMuted,
    });
    page.drawLine({
      start: { x: leftX, y: y - 5 },
      end: { x: leftX + contentWidth, y: y - 5 },
      thickness: 0.5,
      color: cBorder,
    });
    y -= 20;
  };

  // --- 1. Top Document Header ---
  page.drawText("PAWCARE VIETNAM", {
    x: leftX,
    y,
    size: 9,
    font: boldFont,
    color: cPrimary,
  });
  y -= 18;

  const docTitle = isVi ? "SỔ Y BẠ & HỒ SƠ SỨC KHỎE ĐIỆN TỬ" : "DIGITAL PET HEALTH PASSPORT";
  page.drawText(docTitle, {
    x: leftX,
    y,
    size: 16,
    font: boldFont,
    color: cDark,
  });

  const generatedDateStr = new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(input.generatedAt);

  page.drawText(`${isVi ? "Mã hồ sơ" : "Record ID"}: #${input.recordId.slice(0, 8)} · ${isVi ? "Xuất ngày" : "Generated"}: ${generatedDateStr}`, {
    x: leftX,
    y: y - 14,
    size: 8.5,
    font: regularFont,
    color: cMuted,
  });

  // Verification QR code in Top-Right
  const verifyUrl = input.verificationUrl || `https://pawcare.vn/records/verify/${input.recordId}`;
  try {
    const qrPngBuffer = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      margin: 1,
      width: 140,
      errorCorrectionLevel: "M",
    });
    const qrImage = await pdf.embedPng(qrPngBuffer);
    const qrSize = 64;
    const qrX = leftX + contentWidth - qrSize;
    const qrY = y - 36;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawText(isVi ? "Quét để đối chiếu" : "Scan to verify", {
      x: qrX - 5,
      y: qrY - 8,
      size: 6.5,
      font: regularFont,
      color: cMuted,
    });
  } catch {}

  y -= 45;

  // --- 2. Pet Identity Card ---
  checkPageBreak(90);
  const cardHeight = input.ownerContact ? 84 : 70;
  page.drawRectangle({
    x: leftX,
    y: y - cardHeight,
    width: contentWidth,
    height: cardHeight,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  const petName = input.pet.name.toUpperCase();
  page.drawText(petName, {
    x: leftX + 14,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: cPrimary,
  });

  const speciesBreed = `${input.pet.species === "dog" ? (isVi ? "Chó" : "Dog") : input.pet.species === "cat" ? (isVi ? "Mèo" : "Cat") : (input.pet.species)} · ${input.pet.breed || (isVi ? "Giống hỗn hợp" : "Mixed breed")} · ${input.pet.gender === "female" ? (isVi ? "Cái" : "Female") : (isVi ? "Đực" : "Male")}`;
  page.drawText(speciesBreed, {
    x: leftX + 14,
    y: y - 35,
    size: 9.5,
    font: regularFont,
    color: cDark,
  });

  const chipStr = `${isVi ? "Vi mạch" : "Microchip"}: ${input.pet.microchip || (isVi ? "Chưa gắn chip" : "None")}`;
  const weightStr = `${isVi ? "Cân nặng" : "Weight"}: ${input.pet.weightKg ? `${input.pet.weightKg} kg` : (isVi ? "Chưa đo" : "N/A")}`;
  const dobStr = `${isVi ? "Ngày sinh" : "DOB"}: ${input.pet.birthDate || (isVi ? "Không rõ" : "Unknown")}`;

  page.drawText(`${chipStr}  |  ${weightStr}  |  ${dobStr}`, {
    x: leftX + 14,
    y: y - 50,
    size: 8.5,
    font: regularFont,
    color: cMuted,
  });

  if (input.ownerContact) {
    const ownerStr = `${isVi ? "Chủ nuôi" : "Owner"}: ${input.ownerContact.name || "N/A"} · ${input.ownerContact.phone || ""} · ${input.ownerContact.district || ""}`;
    page.drawText(ownerStr, {
      x: leftX + 14,
      y: y - 66,
      size: 8.5,
      font: boldFont,
      color: cDark,
    });
  }

  y -= cardHeight + 14;

  // --- 3. Rabies Compliance Badge (Mandatory under VN Law) ---
  checkPageBreak(50);
  const rabies = input.rabiesStatus;
  const isRabiesValid = rabies.hasRabiesVaccine && rabies.isValid;

  page.drawRectangle({
    x: leftX,
    y: y - 38,
    width: contentWidth,
    height: 38,
    color: isRabiesValid ? cValidBg : cAlertBg,
    borderColor: isRabiesValid ? cValidGreen : cAlertRed,
    borderWidth: 1,
  });

  const rabiesTitle = isRabiesValid
    ? (isVi ? "✓ ĐÃ TIÊM PHÒNG DẠI HỢP LỆ (RABIES VALID)" : "✓ RABIES VACCINATION CERTIFIED (VALID)")
    : (isVi ? "⚠ CẢNH BÁO: CHƯA CÓ CHỨNG NHẬN TIÊM DẠI HỢP LỆ (EXPIRED / NONE)" : "⚠ WARNING: NO VALID RABIES RECORD FOUND");

  page.drawText(rabiesTitle, {
    x: leftX + 12,
    y: y - 16,
    size: 9.5,
    font: boldFont,
    color: isRabiesValid ? cValidGreen : cAlertRed,
  });

  const rabiesSub = isRabiesValid
    ? (isVi
        ? `Có giá trị đến: ${rabies.expiresAt} (còn ${rabies.daysRemaining} ngày) · Lô: ${rabies.lot || "N/A"} · Cơ sở cấp: ${rabies.issuingClinic || "Phòng khám thú y"}`
        : `Valid until: ${rabies.expiresAt} (${rabies.daysRemaining} days left) · Lot: ${rabies.lot || "N/A"} · Clinic: ${rabies.issuingClinic || "Verified Practice"}`)
    : (isVi
        ? "Theo Nghị định 90/2017/NĐ-CP & Thông tư 07/2016/TT-BNNPTNT, tiêm phòng dại là bắt buộc. Phạt 600.000 - 800.000đ nếu vi phạm."
        : "Mandatory under Vietnam Veterinary Regulations. Unvaccinated pets risk animal quarantine and administrative penalties.");

  page.drawText(rabiesSub, {
    x: leftX + 12,
    y: y - 30,
    size: 7.5,
    font: regularFont,
    color: isRabiesValid ? cValidGreen : cAlertRed,
  });

  y -= 52;

  // --- 4. Vaccination History Section ---
  if (sections.has("vaccinations") && input.vaccinations.length > 0) {
    checkPageBreak(40);
    page.drawText(isVi ? "LỊCH SỬ TIÊM CHỦNG VẮC-XIN" : "VACCINATION RECORDS", {
      x: leftX,
      y,
      size: 11,
      font: boldFont,
      color: cPrimary,
    });
    y -= 14;

    // Table Header
    page.drawRectangle({
      x: leftX,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: cBgLight,
      borderColor: cBorder,
      borderWidth: 0.5,
    });

    page.drawText(isVi ? "Vắc-xin & Số lô" : "Vaccine & Lot", { x: leftX + 8, y: y - 13, size: 8, font: boldFont, color: cDark });
    page.drawText(isVi ? "Ngày tiêm" : "Date", { x: leftX + 180, y: y - 13, size: 8, font: boldFont, color: cDark });
    page.drawText(isVi ? "Tái chủng" : "Next Due", { x: leftX + 250, y: y - 13, size: 8, font: boldFont, color: cDark });
    page.drawText(isVi ? "Cơ sở / Bác sĩ" : "Clinic / Vet", { x: leftX + 330, y: y - 13, size: 8, font: boldFont, color: cDark });
    page.drawText(isVi ? "Nguồn" : "Status", { x: leftX + 440, y: y - 13, size: 8, font: boldFont, color: cDark });
    y -= 22;

    for (const vax of input.vaccinations) {
      checkPageBreak(24);
      const isVerified = vax.verified ?? true;
      const rowY = y;

      const vaxName = `${vax.name.slice(0, 32)}${vax.lot ? ` (Lô: ${vax.lot})` : ""}`;
      page.drawText(vaxName, { x: leftX + 8, y: rowY - 10, size: 8, font: boldFont, color: cDark });
      page.drawText(vax.administeredAt, { x: leftX + 180, y: rowY - 10, size: 8, font: regularFont, color: cDark });
      page.drawText(vax.nextDueAt || (isVi ? "Theo chỉ định" : "As instructed"), { x: leftX + 250, y: rowY - 10, size: 8, font: regularFont, color: cMuted });
      page.drawText((vax.clinic || "PawCare").slice(0, 20), { x: leftX + 330, y: rowY - 10, size: 8, font: regularFont, color: cDark });

      const statusBadge = isVerified
        ? (isVi ? "[Xác thực]" : "[Verified]")
        : (isVi ? "[Chủ khai]" : "[Owner]");
      page.drawText(statusBadge, {
        x: leftX + 440,
        y: rowY - 10,
        size: 7.5,
        font: boldFont,
        color: isVerified ? cValidGreen : cMuted,
      });

      page.drawLine({
        start: { x: leftX, y: rowY - 16 },
        end: { x: leftX + contentWidth, y: rowY - 16 },
        thickness: 0.5,
        color: cBorder,
      });
      y -= 20;
    }
    y -= 10;
  }

  // --- 5. Prescriptions & Medications ---
  if (sections.has("medications") && input.prescriptions && input.prescriptions.length > 0) {
    checkPageBreak(40);
    page.drawText(isVi ? "ĐƠN THUỐC & ĐIỀU TRỊ HIỆN TẠI" : "CURRENT PRESCRIPTIONS & MEDICATIONS", {
      x: leftX,
      y,
      size: 11,
      font: boldFont,
      color: cPrimary,
    });
    y -= 14;

    for (const med of input.prescriptions) {
      checkPageBreak(30);
      page.drawText(`• ${med.name} - ${med.dose}`, { x: leftX + 8, y: y - 10, size: 8.5, font: boldFont, color: cDark });
      page.drawText(`${isVi ? "Bắt đầu" : "Started"}: ${med.startedAt}${med.endedAt ? ` · ${isVi ? "Kết thúc" : "Ended"}: ${med.endedAt}` : ""} · ${med.instructions}`, {
        x: leftX + 16,
        y: y - 22,
        size: 8,
        font: regularFont,
        color: cMuted,
      });
      y -= 28;
    }
    y -= 10;
  }

  // --- 6. Allergies & Chronic Conditions ---
  if ((sections.has("allergies") && input.allergies && input.allergies.length > 0) ||
      (sections.has("conditions") && input.conditions && input.conditions.length > 0)) {
    checkPageBreak(50);
    page.drawText(isVi ? "DỊ ỨNG & TÌNH TRẠNG MÃN TÍNH" : "ALLERGIES & CHRONIC CONDITIONS", {
      x: leftX,
      y,
      size: 11,
      font: boldFont,
      color: cPrimary,
    });
    y -= 14;

    if (input.allergies && input.allergies.length > 0) {
      const allergyStr = input.allergies.map((a) => `${a.name} (${a.severity || "theo dõi"})`).join(", ");
      page.drawText(`${isVi ? "Dị ứng" : "Allergies"}: ${allergyStr}`, {
        x: leftX + 8,
        y: y - 10,
        size: 8.5,
        font: regularFont,
        color: cAlertRed,
      });
      y -= 18;
    }

    if (input.conditions && input.conditions.length > 0) {
      const condStr = input.conditions.map((c) => `${c.name} [${c.status || "đang điều trị"}]`).join(", ");
      page.drawText(`${isVi ? "Bệnh nền" : "Conditions"}: ${condStr}`, {
        x: leftX + 8,
        y: y - 10,
        size: 8.5,
        font: regularFont,
        color: cDark,
      });
      y -= 18;
    }
    y -= 10;
  }

  // --- 7. Clinical Visits Timeline ---
  if (sections.has("visits") && input.visits && input.visits.length > 0) {
    checkPageBreak(40);
    page.drawText(isVi ? "LỊCH SỬ THĂM KHÁM & THỦ THUẬT" : "CLINICAL VISITS & PROCEDURES", {
      x: leftX,
      y,
      size: 11,
      font: boldFont,
      color: cPrimary,
    });
    y -= 14;

    for (const visit of input.visits.slice(0, 5)) {
      checkPageBreak(26);
      page.drawText(`${visit.date} · ${visit.clinicName}`, { x: leftX + 8, y: y - 10, size: 8.5, font: boldFont, color: cDark });
      page.drawText(visit.summary, { x: leftX + 16, y: y - 22, size: 8, font: regularFont, color: cMuted });
      y -= 28;
    }
    y -= 10;
  }

  // --- 8. Footers on All Pages ---
  const pages = pdf.getPages();
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    const disclaimer = isVi
      ? "PawCare · Bản sao y bạ điện tử dùng để tra cứu thông tin tiêm chủng & khám chữa bệnh. Không thay thế chẩn đoán lâm sàng của bác sĩ thú y. Tuân thủ Nghị định 13/2023/NĐ-CP."
      : "PawCare · Digital health passport for veterinary tracking. Does not substitute in-person veterinary diagnosis. Complies with Decree 13/2023/ND-CP.";

    p.drawText(disclaimer, {
      x: leftX,
      y: 28,
      size: 7,
      font: regularFont,
      color: cMuted,
      maxWidth: 450,
    });

    p.drawText(`${isVi ? "Trang" : "Page"} ${idx + 1} / ${totalPages}`, {
      x: leftX + contentWidth - 45,
      y: 28,
      size: 7,
      font: regularFont,
      color: cMuted,
    });

    p.drawLine({
      start: { x: leftX, y: 40 },
      end: { x: leftX + contentWidth, y: 40 },
      thickness: 0.5,
      color: cBorder,
    });
  });

  return pdf.save();
}
