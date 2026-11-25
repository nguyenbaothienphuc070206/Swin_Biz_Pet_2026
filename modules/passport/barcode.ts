export interface CatalogItem {
  code: string;
  name: string;
  kind: "vaccine" | "medication";
  manufacturer?: string;
  standardLot?: string;
  defaultDose?: string;
  nextDueDays?: number;
  activeIngredient?: string;
  speciesTarget?: "dog" | "cat" | "all";
  description?: string;
}

export const COMMON_POC_CATALOG: CatalogItem[] = [
  {
    code: "893850123401",
    name: "Rabisin (Vắc-xin phòng bệnh dại)",
    kind: "vaccine",
    manufacturer: "Boehringer Ingelheim",
    standardLot: "RAB-2026-X1",
    defaultDose: "1 ml",
    nextDueDays: 365,
    speciesTarget: "all",
    description: "Vắc-xin phòng dại bất hoạt chuẩn quốc tế. Cấp tem dán y bạ hợp lệ theo Thông tư 07/2016/TT-BNNPTNT.",
  },
  {
    code: "893850123402",
    name: "Defensor 3 (Vắc-xin phòng bệnh dại)",
    kind: "vaccine",
    manufacturer: "Zoetis",
    standardLot: "DEF-2026-Z3",
    defaultDose: "1 ml",
    nextDueDays: 365,
    speciesTarget: "all",
    description: "Phòng bệnh dại cho chó mèo từ 3 tháng tuổi.",
  },
  {
    code: "893850123403",
    name: "Vanguard Plus 5/CV-L (Vắc-xin 7 bệnh chó)",
    kind: "vaccine",
    manufacturer: "Zoetis",
    standardLot: "VG7-2026-09",
    defaultDose: "1 liều (1ml)",
    nextDueDays: 365,
    speciesTarget: "dog",
    description: "Phòng Care, Parvovirus, Viêm gan truyền nhiễm, Phó cúm, Ho cũi chó và 2 thể Lepto.",
  },
  {
    code: "893850123404",
    name: "Felocell 4 (Vắc-xin 4 bệnh mèo)",
    kind: "vaccine",
    manufacturer: "Zoetis",
    standardLot: "FEL4-2026-15",
    defaultDose: "1 liều (1ml)",
    nextDueDays: 365,
    speciesTarget: "cat",
    description: "Phòng Giảm bạch cầu (FPV), Viêm mũi khí quản (FHV), Viêm kết mạc hô hấp (FCV) và Chlamydia.",
  },
  {
    code: "893850123405",
    name: "Purevax RCP (Vắc-xin 3 bệnh mèo)",
    kind: "vaccine",
    manufacturer: "Boehringer Ingelheim",
    standardLot: "PUR-2026-77",
    defaultDose: "1 liều (1ml)",
    nextDueDays: 365,
    speciesTarget: "cat",
    description: "Vắc-xin công nghệ không tá dược, an toàn cho mèo nhạy cảm.",
  },
  {
    code: "893850123406",
    name: "ProHeart 12 (Phòng giun tim tiêm chó)",
    kind: "vaccine",
    manufacturer: "Zoetis",
    standardLot: "PH12-2026",
    defaultDose: "0.05 ml/kg",
    nextDueDays: 365,
    speciesTarget: "dog",
    description: "Moxidecin vi cầu giải phóng chậm, bảo vệ 12 tháng liên tục.",
  },
  {
    code: "893850123407",
    name: "Bravecto Chewable 10-20kg (Trị ve rận & ghẻ)",
    kind: "medication",
    manufacturer: "MSD Animal Health",
    standardLot: "BRV-2026-B1",
    defaultDose: "1 viên nhai (500mg)",
    nextDueDays: 84, // 12 weeks
    speciesTarget: "dog",
    activeIngredient: "Fluralaner",
    description: "Tác dụng kéo dài 12 tuần chống ve, bọ chét và ghẻ Demodex.",
  },
  {
    code: "893850123408",
    name: "NexGard Spectra 7.5-15kg (Viên nhai nội & ngoại ký sinh)",
    kind: "medication",
    manufacturer: "Boehringer Ingelheim",
    standardLot: "NXG-2026-S3",
    defaultDose: "1 viên nhai",
    nextDueDays: 30,
    speciesTarget: "dog",
    activeIngredient: "Afoxolaner + Milbemycin Oxime",
    description: "Phòng ve rận, giun tim, giun phổi và giun đường tiêu hóa hàng tháng.",
  },
  {
    code: "893850123409",
    name: "Drontal Plus (Thuốc tẩy giun tổng hợp chó)",
    kind: "medication",
    manufacturer: "Vetoquinol",
    standardLot: "DRT-2026-P9",
    defaultDose: "1 viên / 10kg",
    nextDueDays: 90,
    speciesTarget: "dog",
    activeIngredient: "Praziquantel + Pyrantel embonate + Febantel",
    description: "Tẩy sạch sán dây, giun đũa, giun móc, giun tóc.",
  },
  {
    code: "893850123410",
    name: "Drontal For Cats (Thuốc tẩy giun mèo)",
    kind: "medication",
    manufacturer: "Vetoquinol",
    standardLot: "DRTC-2026-C4",
    defaultDose: "1 viên / 4kg",
    nextDueDays: 90,
    speciesTarget: "cat",
    activeIngredient: "Praziquantel + Pyrantel embonate",
    description: "Tẩy sạch giun tròn và sán dây ở mèo.",
  },
];

export function lookupBarcode(code: string, catalog: CatalogItem[] = COMMON_POC_CATALOG): CatalogItem | null {
  const normalized = code.replace(/[\s-]+/g, "").toUpperCase();
  if (!normalized || normalized.length > 80) return null;

  // Direct code match
  const exact = catalog.find((item) => item.code.replace(/[\s-]+/g, "").toUpperCase() === normalized);
  if (exact) return exact;

  // Prefix / substring match
  return catalog.find((item) => item.code.includes(normalized) || normalized.includes(item.code)) ?? null;
}
