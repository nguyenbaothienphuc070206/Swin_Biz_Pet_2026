import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { RabiesStatusResult } from "./share-service";
import {
  localizePetName,
  localizeBreed,
  localizePersonName,
  localizeClinicName,
  localizeClinicAddress,
  localizeVaccineName,
  localizePrescriptionDose,
  localizePrescriptionInstructions,
  localizeAllergy,
  localizeAllergySeverity,
  localizeCondition,
  localizeConditionStatus,
  localizeVisitSummary,
} from "@/modules/i18n/localize-data";

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

/**
 * Normalizes Unicode NFC (converting any decomposed NFD Vietnamese characters into
 * precomposed NFC characters) and replaces dingbats/unsupported symbols with clean
 * glyph-safe equivalents.
 */
export function sanitizePdfText(raw: string | undefined | null, supportedSet?: Set<number>): string {
  if (!raw) return "";
  const normalized = String(raw)
    .normalize("NFC")
    .replace(/\u2713|\u2714|\u2611/g, "[OK]")
    .replace(/\u26A0|\uFE0F/g, "[!]")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/[\r\n\t]+/g, " ");

  if (!supportedSet) return normalized;

  let out = "";
  for (const ch of normalized) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && supportedSet.has(cp)) {
      out += ch;
    } else if (cp !== undefined && cp > 0x7f) {
      out += " ";
    }
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function wrapPdfText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  supportedSet?: Set<number>
): string[] {
  const clean = sanitizePdfText(text, supportedSet);
  if (!clean) return [""];

  const words = clean.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    let width = 0;
    try {
      width = font.widthOfTextAtSize(candidate, fontSize);
    } catch {
      width = candidate.length * (fontSize * 0.55);
    }

    if (width <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function truncateToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  supportedSet?: Set<number>
): string {
  const clean = sanitizePdfText(text, supportedSet);
  if (!clean) return "";
  try {
    if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) return clean;
    let truncated = clean;
    while (truncated.length > 3 && font.widthOfTextAtSize(`${truncated}...`, fontSize) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
  } catch {
    return clean.slice(0, 32);
  }
}

export async function createPassportPdf(input: PassportPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Load full Be Vietnam Pro Regular & Bold fonts (complete Latin + Latin-Ext + Vietnamese glyphs)
  const regularFontBytes = await readFile(
    join(process.cwd(), "public", "fonts", "be-vietnam-pro-vietnamese-400.woff")
  );
  const boldFontBytes = await readFile(
    join(process.cwd(), "public", "fonts", "be-vietnam-pro-vietnamese-700.woff")
  );

  // Disable OpenType ligatures (liga/clig/dlig/calt) because pdf-lib's CustomFontEmbedder
  // only populates /W widths for direct Unicode codepoints in font.characterSet.
  // Unmapped GSUB ligatures like "fi" in "[Verified]" would otherwise default to DW=1000 ("Verifi ed").
  const noLigatureFeatures = {
    liga: false,
    clig: false,
    dlig: false,
    calt: false,
    rlig: false,
  };
  const regularFont = await pdf.embedFont(regularFontBytes, {
    subset: false,
    features: noLigatureFeatures,
  });
  const boldFont = await pdf.embedFont(boldFontBytes, {
    subset: false,
    features: noLigatureFeatures,
  });

  const regularSet = new Set<number>(regularFont.getCharacterSet());
  const boldSet = new Set<number>(boldFont.getCharacterSet());

  const safeReg = (s?: string | null) => sanitizePdfText(s, regularSet);
  const safeBold = (s?: string | null) => sanitizePdfText(s, boldSet);

  const isVi = input.locale === "vi";
  const isEn = !isVi;

  // Normalize all dynamic input fields to match the requested PDF locale (vi or en)
  const localizedPetName = localizePetName(input.pet.name, isEn);
  const localizedBreed = localizeBreed(input.pet.breed, input.pet.species, isEn);
  const localizedIssuingClinic = input.rabiesStatus.issuingClinic
    ? localizeClinicName(input.rabiesStatus.issuingClinic, isEn)
    : undefined;
  const sections = new Set(
    input.sections || ["vaccinations", "medications", "allergies", "conditions", "visits"]
  );

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

  // A4 size: 595.28 x 841.89 pt
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const leftX = 40;
  const contentWidth = 515;

  const drawPageHeaderMini = () => {
    page.drawText(
      safeReg(`PawCare · ${localizedPetName} (${input.pet.species}) · ID: ${input.recordId.slice(0, 8)}`),
      {
        x: leftX,
        y,
        size: 8,
        font: regularFont,
        color: cMuted,
      }
    );
    page.drawLine({
      start: { x: leftX, y: y - 5 },
      end: { x: leftX + contentWidth, y: y - 5 },
      thickness: 0.5,
      color: cBorder,
    });
    y -= 20;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < 65) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
      drawPageHeaderMini();
    }
  };

  // --- 1. Top Document Header ---
  page.drawText(safeBold("PAWCARE VIETNAM · DIGITAL VETERINARY REGISTRY"), {
    x: leftX,
    y,
    size: 9,
    font: boldFont,
    color: cPrimary,
  });
  y -= 18;

  const docTitle = isVi ? "SỔ Y BẠ & HỒ SƠ SỨC KHỎE ĐIỆN TỬ" : "DIGITAL PET HEALTH PASSPORT";
  page.drawText(safeBold(docTitle), {
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

  page.drawText(
    safeReg(
      `${isVi ? "Mã hồ sơ" : "Record ID"}: #${input.recordId.slice(0, 12)} · ${
        isVi ? "Xuất ngày" : "Generated"
      }: ${generatedDateStr}`
    ),
    {
      x: leftX,
      y: y - 15,
      size: 8.5,
      font: regularFont,
      color: cMuted,
    }
  );

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
    page.drawText(safeReg(isVi ? "Quét mã xác thực" : "Scan to verify"), {
      x: qrX - 2,
      y: qrY - 9,
      size: 6.5,
      font: regularFont,
      color: cMuted,
    });
  } catch {}

  y -= 48;

  // --- 2. Pet Identity Card ---
  checkPageBreak(92);
  const cardHeight = input.ownerContact ? 86 : 72;
  page.drawRectangle({
    x: leftX,
    y: y - cardHeight,
    width: contentWidth,
    height: cardHeight,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  const petName = safeBold(localizedPetName.toUpperCase());
  page.drawText(petName, {
    x: leftX + 14,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: cPrimary,
  });

  const genderLabel =
    input.pet.gender === "female" || input.pet.gender === "female_spayed"
      ? isVi
        ? "Cái"
        : "Female"
      : input.pet.gender === "neutered" || input.pet.gender === "male_neutered"
      ? isVi
        ? "Đực (Đã triệt sản)"
        : "Male (Neutered)"
      : isVi
      ? "Đực"
      : "Male";

  const speciesLabel =
    input.pet.species === "dog"
      ? isVi
        ? "Chó (Canine)"
        : "Dog (Canine)"
      : input.pet.species === "cat"
      ? isVi
        ? "Mèo (Feline)"
        : "Cat (Feline)"
      : input.pet.species;

  const speciesBreed = safeReg(
    `${speciesLabel} · ${localizedBreed || (isVi ? "Giống tiêu chuẩn" : "Standard breed")} · ${genderLabel}`
  );
  page.drawText(speciesBreed, {
    x: leftX + 14,
    y: y - 36,
    size: 9.5,
    font: regularFont,
    color: cDark,
  });

  const chipStr = `${isVi ? "Vi mạch ISO" : "Microchip"}: ${
    input.pet.microchip || (isVi ? "Chưa gắn chip" : "None")
  }`;
  const weightStr = `${isVi ? "Cân nặng" : "Weight"}: ${
    input.pet.weightKg ? `${input.pet.weightKg} kg` : isVi ? "Chưa đo" : "N/A"
  }`;
  const dobStr = `${isVi ? "Ngày sinh" : "DOB"}: ${
    input.pet.birthDate || (isVi ? "Không rõ" : "Unknown")
  }`;

  page.drawText(safeReg(`${chipStr}  |  ${weightStr}  |  ${dobStr}`), {
    x: leftX + 14,
    y: y - 52,
    size: 8.5,
    font: regularFont,
    color: cMuted,
  });

  if (input.ownerContact) {
    const localizedOwnerName = localizePersonName(input.ownerContact.name, isEn);
    const localizedOwnerDistrict = localizeClinicAddress(input.ownerContact.district || "", isEn);
    const ownerStr = safeBold(
      `${isVi ? "Chủ nuôi" : "Owner"}: ${localizedOwnerName || "N/A"} · ${
        input.ownerContact.phone || ""
      } · ${localizedOwnerDistrict}`
    );
    page.drawText(ownerStr, {
      x: leftX + 14,
      y: y - 68,
      size: 8.5,
      font: boldFont,
      color: cDark,
    });
  }

  y -= cardHeight + 14;

  // --- 3. Rabies Compliance Badge (Mandatory under VN Law) ---
  checkPageBreak(52);
  const rabies = input.rabiesStatus;
  const isRabiesValid = rabies.hasRabiesVaccine && rabies.isValid;

  page.drawRectangle({
    x: leftX,
    y: y - 40,
    width: contentWidth,
    height: 40,
    color: isRabiesValid ? cValidBg : cAlertBg,
    borderColor: isRabiesValid ? cValidGreen : cAlertRed,
    borderWidth: 1,
  });

  const rabiesTitle = isRabiesValid
    ? isVi
      ? "[ĐẠT CHUẨN] ĐÃ TIÊM PHÒNG DẠI HỢP LỆ (RABIES VACCINATION VALID)"
      : "[CERTIFIED] RABIES VACCINATION VALID & COMPLIANT"
    : isVi
    ? "[CẢNH BÁO] CHƯA CÓ CHỨNG NHẬN TIÊM DẠI HỢP LỆ (EXPIRED / NONE)"
    : "[WARNING] NO VALID RABIES VACCINATION RECORD FOUND";

  page.drawText(safeBold(rabiesTitle), {
    x: leftX + 12,
    y: y - 16,
    size: 9.5,
    font: boldFont,
    color: isRabiesValid ? cValidGreen : cAlertRed,
  });

  const rabiesSub = isRabiesValid
    ? isVi
      ? `Hiệu lực đến: ${rabies.expiresAt} (còn ${rabies.daysRemaining} ngày) · Lô: ${
          rabies.lot || "N/A"
        } · Cơ sở cấp: ${localizedIssuingClinic || "Phòng khám thú y PawCare"}`
      : `Valid until: ${rabies.expiresAt} (${rabies.daysRemaining} days left) · Lot: ${
          rabies.lot || "N/A"
        } · Clinic: ${localizedIssuingClinic || "Verified Practice"}`
    : isVi
    ? "Theo Nghị định 90/2017/NĐ-CP & Thông tư 07/2016/TT-BNNPTNT, tiêm phòng dại là bắt buộc đối với chó mèo."
    : "Mandatory under Vietnam Veterinary Regulations. Unvaccinated pets risk animal quarantine and penalties.";

  page.drawText(
    truncateToWidth(rabiesSub, regularFont, 7.8, contentWidth - 24, regularSet),
    {
      x: leftX + 12,
      y: y - 30,
      size: 7.8,
      font: regularFont,
      color: isRabiesValid ? cValidGreen : cAlertRed,
    }
  );

  y -= 54;

  // --- 4. Vaccination History Section ---
  if (sections.has("vaccinations") && input.vaccinations.length > 0) {
    checkPageBreak(45);
    page.drawText(safeBold(isVi ? "LỊCH SỬ TIÊM CHỦNG VẮC-XIN" : "VACCINATION RECORDS"), {
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

    page.drawText(safeBold(isVi ? "Vắc-xin & Số lô" : "Vaccine & Lot"), {
      x: leftX + 8,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: cDark,
    });
    page.drawText(safeBold(isVi ? "Ngày tiêm" : "Date"), {
      x: leftX + 190,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: cDark,
    });
    page.drawText(safeBold(isVi ? "Tái chủng" : "Next Due"), {
      x: leftX + 255,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: cDark,
    });
    page.drawText(safeBold(isVi ? "Cơ sở / Bác sĩ" : "Clinic / Vet"), {
      x: leftX + 325,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: cDark,
    });
    page.drawText(safeBold(isVi ? "Trạng thái" : "Status"), {
      x: leftX + 448,
      y: y - 13,
      size: 8,
      font: boldFont,
      color: cDark,
    });
    y -= 22;

    for (const vax of input.vaccinations) {
      checkPageBreak(24);
      const isVerified = vax.verified ?? true;
      const rowY = y;

      const localizedVaxName = localizeVaccineName(vax.name, isEn);
      const localizedVaxClinic = localizeClinicName(
        vax.clinic || "PawCare Partner Clinic",
        isEn
      );
      const rawVaxTitle = `${localizedVaxName}${vax.lot ? ` (${vax.lot})` : ""}`;
      const vaxName = truncateToWidth(rawVaxTitle, boldFont, 8, 176, boldSet);
      const clinicLabel = truncateToWidth(
        localizedVaxClinic,
        regularFont,
        8,
        116,
        regularSet
      );

      page.drawText(vaxName, {
        x: leftX + 8,
        y: rowY - 10,
        size: 8,
        font: boldFont,
        color: cDark,
      });
      page.drawText(safeReg(vax.administeredAt), {
        x: leftX + 190,
        y: rowY - 10,
        size: 8,
        font: regularFont,
        color: cDark,
      });
      page.drawText(safeReg(vax.nextDueAt || (isVi ? "Theo chỉ định" : "As scheduled")), {
        x: leftX + 255,
        y: rowY - 10,
        size: 8,
        font: regularFont,
        color: cMuted,
      });
      page.drawText(clinicLabel, {
        x: leftX + 325,
        y: rowY - 10,
        size: 8,
        font: regularFont,
        color: cDark,
      });

      const statusBadge = isVerified
        ? isVi
          ? "[Xác thực]"
          : "[Verified]"
        : isVi
        ? "[Chủ khai]"
        : "[Owner]";
      page.drawText(safeBold(statusBadge), {
        x: leftX + 448,
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
    checkPageBreak(42);
    page.drawText(
      safeBold(isVi ? "ĐƠN THUỐC & ĐIỀU TRỊ HIỆN TẠI" : "CURRENT PRESCRIPTIONS & MEDICATIONS"),
      {
        x: leftX,
        y,
        size: 11,
        font: boldFont,
        color: cPrimary,
      }
    );
    y -= 14;

    for (const med of input.prescriptions) {
      const localizedDose = localizePrescriptionDose(med.dose, isEn);
      const localizedInstructions = localizePrescriptionInstructions(med.instructions, isEn);
      const detailText = `${isVi ? "Bắt đầu" : "Started"}: ${med.startedAt}${
        med.endedAt ? ` · ${isVi ? "Kết thúc" : "Ended"}: ${med.endedAt}` : ""
      } · ${localizedInstructions}`;
      const wrappedDetails = wrapPdfText(detailText, regularFont, 8, contentWidth - 24, regularSet);
      checkPageBreak(18 + wrappedDetails.length * 12);

      page.drawText(safeBold(`• ${med.name} — ${localizedDose}`), {
        x: leftX + 8,
        y: y - 10,
        size: 8.5,
        font: boldFont,
        color: cDark,
      });
      y -= 22;

      for (const line of wrappedDetails) {
        page.drawText(line, {
          x: leftX + 16,
          y,
          size: 8,
          font: regularFont,
          color: cMuted,
        });
        y -= 12;
      }
      y -= 4;
    }
    y -= 8;
  }

  // --- 6. Allergies & Chronic Conditions ---
  if (
    (sections.has("allergies") && input.allergies && input.allergies.length > 0) ||
    (sections.has("conditions") && input.conditions && input.conditions.length > 0)
  ) {
    checkPageBreak(52);
    page.drawText(
      safeBold(isVi ? "DỊ ỨNG & TÌNH TRẠNG SỨC KHỎE" : "ALLERGIES & CHRONIC CONDITIONS"),
      {
        x: leftX,
        y,
        size: 11,
        font: boldFont,
        color: cPrimary,
      }
    );
    y -= 14;

    if (input.allergies && input.allergies.length > 0) {
      const allergyStr = `${isVi ? "Dị ứng" : "Allergies"}: ${input.allergies
        .map(
          (a) =>
            `${localizeAllergy(a.name, isEn)} (${localizeAllergySeverity(
              a.severity,
              isEn
            )})`
        )
        .join(", ")}`;
      const lines = wrapPdfText(allergyStr, regularFont, 8.5, contentWidth - 16, regularSet);
      for (const line of lines) {
        checkPageBreak(15);
        page.drawText(line, {
          x: leftX + 8,
          y: y - 10,
          size: 8.5,
          font: regularFont,
          color: cAlertRed,
        });
        y -= 14;
      }
      y -= 4;
    }

    if (input.conditions && input.conditions.length > 0) {
      const condStr = `${isVi ? "Bệnh nền & Ghi chú" : "Conditions"}: ${input.conditions
        .map(
          (c) =>
            `${localizeCondition(c.name, isEn)} [${localizeConditionStatus(
              c.status,
              isEn
            )}]`
        )
        .join(", ")}`;
      const lines = wrapPdfText(condStr, regularFont, 8.5, contentWidth - 16, regularSet);
      for (const line of lines) {
        checkPageBreak(15);
        page.drawText(line, {
          x: leftX + 8,
          y: y - 10,
          size: 8.5,
          font: regularFont,
          color: cDark,
        });
        y -= 14;
      }
      y -= 4;
    }
    y -= 8;
  }

  // --- 7. Clinical Visits Timeline ---
  if (sections.has("visits") && input.visits && input.visits.length > 0) {
    checkPageBreak(42);
    page.drawText(
      safeBold(isVi ? "LỊCH SỬ THĂM KHÁM & THỦ THUẬT" : "CLINICAL VISITS & PROCEDURES"),
      {
        x: leftX,
        y,
        size: 11,
        font: boldFont,
        color: cPrimary,
      }
    );
    y -= 14;

    for (const visit of input.visits.slice(0, 6)) {
      const localizedVisitClinic = localizeClinicName(visit.clinicName, isEn);
      const localizedSummary = localizeVisitSummary(visit.summary, isEn);
      const summaryLines = wrapPdfText(
        localizedSummary,
        regularFont,
        8,
        contentWidth - 24,
        regularSet
      );
      checkPageBreak(18 + summaryLines.length * 12);

      page.drawText(safeBold(`${visit.date} · ${localizedVisitClinic}`), {
        x: leftX + 8,
        y: y - 10,
        size: 8.5,
        font: boldFont,
        color: cDark,
      });
      y -= 22;

      for (const line of summaryLines) {
        page.drawText(line, {
          x: leftX + 16,
          y,
          size: 8,
          font: regularFont,
          color: cMuted,
        });
        y -= 12;
      }
      y -= 4;
    }
  }

  // --- 8. Footers on All Pages ---
  const pages = pdf.getPages();
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    const disclaimer = isVi
      ? "PawCare · Bản sao y bạ điện tử dùng để tra cứu thông tin tiêm chủng & khám chữa bệnh. Không thay thế chẩn đoán lâm sàng của bác sĩ thú y. Tuân thủ Nghị định 13/2023/NĐ-CP."
      : "PawCare · Digital health passport for veterinary tracking. Does not substitute in-person veterinary diagnosis. Complies with Decree 13/2023/ND-CP.";

    const footerLines = wrapPdfText(disclaimer, regularFont, 6.8, contentWidth - 65, regularSet);
    footerLines.slice(0, 2).forEach((line, lineIdx) => {
      p.drawText(line, {
        x: leftX,
        y: 30 - lineIdx * 9,
        size: 6.8,
        font: regularFont,
        color: cMuted,
      });
    });

    p.drawText(safeReg(`${isVi ? "Trang" : "Page"} ${idx + 1} / ${totalPages}`), {
      x: leftX + contentWidth - 48,
      y: 28,
      size: 7,
      font: regularFont,
      color: cMuted,
    });

    p.drawLine({
      start: { x: leftX, y: 42 },
      end: { x: leftX + contentWidth, y: 42 },
      thickness: 0.5,
      color: cBorder,
    });
  });

  return pdf.save();
}
