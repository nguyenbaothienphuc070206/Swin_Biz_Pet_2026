"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";

// ==================== INTERFACES ====================

export interface VaccineRecord {
  id: string;
  name: string;
  brand: string;
  batchNo: string;
  adminDate: string;
  nextDue: string;
  veterinarian: string;
  clinic: string;
  status: "valid" | "due_soon" | "expired";
  isExportCertified?: boolean;
}

export interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ClinicalEncounter {
  id: string;
  date: string;
  type: "dermatology" | "wellness" | "surgery" | "travel_cert" | "dental" | "other";
  title: string;
  veterinarian: string;
  clinic: string;
  soapNotes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  vitals: {
    weightKg: number;
    tempC: number;
    heartRateBpm: number;
    respiratoryRateBpm: number;
    bodyConditionScore: string;
  };
  prescriptions: PrescriptionItem[];
}

export interface DiagnosticReport {
  id: string;
  date: string;
  title: string;
  type: "cytology" | "titer_favn" | "bloodwork" | "radiology" | "urinalysis";
  resultSummary: string;
  isNormal: boolean;
  labName: string;
  certNumber?: string;
}

export interface CarePlanLink {
  planId: string;
  title: string;
  status: "active" | "completed";
  adherencePct: number;
  doctorNotes: string;
  tasksCount: number;
}

export interface PetRecordData {
  id: string;
  name: string;
  species: "cat" | "dog";
  breed: string;
  gender: "male_neutered" | "female_spayed" | "male" | "female";
  birthDate: string;
  ageDisplay: string;
  weightKg: number;
  microchip: string;
  color: string;
  status: "in_treatment" | "up_to_date" | "due_soon";
  statusText: string;
  owner: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  allergies: string[];
  conditions: string[];
  dietaryNotes: string;
  vaccinations: VaccineRecord[];
  encounters: ClinicalEncounter[];
  diagnostics: DiagnosticReport[];
  carePlan?: CarePlanLink;
  verificationToken: string;
}

// ==================== DEFAULT SAMPLE PETS ====================

function getDefaultDemoPets(isEn: boolean): PetRecordData[] {
  return [
    {
      id: "demo-bo-cat",
      name: isEn ? "Bo" : "Bơ",
      species: "cat",
      breed: isEn ? "British Shorthair" : "Mèo Anh lông ngắn",
      gender: "male_neutered",
      birthDate: "2024-04-15",
      ageDisplay: isEn ? "2 years old (DOB: Apr 15, 2024)" : "2 tuổi (Sinh: 15/04/2024)",
      weightKg: 4.8,
      microchip: "981098102345678",
      color: isEn ? "Lilac Blue" : "Xám xanh (Lilac Blue)",
      status: "in_treatment",
      statusText: isEn ? "In treatment: Allergic dermatitis" : "Đang điều trị: Viêm da dị ứng",
      owner: {
        name: isEn ? "Nguyen Van An" : "Nguyễn Văn An",
        phone: "0903 123 456",
        email: "an.nguyen@example.com",
        address: isEn ? "124 Le Loi, Dist 1, Ho Chi Minh City" : "124 Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM",
      },
      allergies: isEn
        ? ["Poultry / chicken protein hypersensitivity", "Seasonal environmental pruritus"]
        : ["Dị ứng đạm gia cầm (gà)", "Dễ viêm da cơ địa theo mùa"],
      conditions: isEn
        ? ["Allergic contact dermatitis (excoriation behind left pinna)"]
        : ["Viêm da dị ứng cấp kèm trầy xước sau tai trái"],
      dietaryNotes: isEn
        ? "Hydrolyzed protein kibble (Royal Canin Hypoallergenic). Strictly avoid poultry treats."
        : "Hạt đạm thủy phân (Royal Canin Hypoallergenic). Tuyệt đối tránh thức ăn thưởng có đạm gà.",
      vaccinations: [
        {
          id: "vax-bo-1",
          name: isEn ? "Rabies Vaccine (Rabisin)" : "Vắc-xin Dại (Rabisin)",
          brand: "Boehringer Ingelheim",
          batchNo: "RB-2026-891",
          adminDate: "2026-10-20",
          nextDue: "2027-10-20",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "valid",
          isExportCertified: true,
        },
        {
          id: "vax-bo-2",
          name: isEn ? "Purevax RCPCh (4-in-1 Core)" : "Purevax RCPCh (4-trong-1 Mèo)",
          brand: "Boehringer Ingelheim",
          batchNo: "PX-4421",
          adminDate: "2026-06-12",
          nextDue: "2027-06-12",
          veterinarian: isEn ? "Dr. Le Thi Mai" : "BS. Lê Thị Mai",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "valid",
        },
        {
          id: "vax-bo-3",
          name: isEn ? "Felocell 4-in-1 (Juvenile)" : "Felocell 4-trong-1 (Mũi sơ sinh)",
          brand: "Zoetis",
          batchNo: "FC-1109",
          adminDate: "2025-05-10",
          nextDue: "2026-05-10",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "expired",
        },
      ],
      encounters: [
        {
          id: "enc-bo-1",
          date: "2026-10-25",
          type: "dermatology",
          title: isEn ? "Dermatology Exam & Ear Cytology" : "Khám da liễu & Soi tế bào học tai",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          soapNotes: {
            subjective: isEn
              ? "Owner reports intense itching and scratching behind left pinna for 3 days. Patient is active and eating normally."
              : "Chủ nuôi báo mèo gãi liên tục sau tai trái 3 ngày nay, rụng lông và xuất hiện vết trầy. Mèo vẫn ăn uống bình thường.",
            objective: isEn
              ? "Vitals: Temp 38.6°C, HR 160 bpm, RR 28, Weight 4.8kg. Erythema and linear excoriations on left ear base. Wood's lamp: Negative. Skin scrape: No mites. Cytology: Mild cocci overgrowth."
              : "Nhiệt độ 38.6°C, nhịp tim 160 lần/phút, thở 28 lần/phút, cân nặng 4.8kg. Vùng da gốc tai trái có ban đỏ và vết trầy xước. Đèn Wood: Âm tính nấm. Cạo da: Không phát hiện ve tai hay Demodex.",
            assessment: isEn
              ? "Acute allergic dermatitis with secondary bacterial excoriation."
              : "Viêm da dị ứng cấp tính kèm vết trầy xước thứ phát do cào gãi.",
            plan: isEn
              ? "1. Apoquel 3.6mg: 1 tab PO SID for 7 days.\n2. Medicated bath with Douxo S3 Seb Shampoo: twice weekly.\n3. Re-evaluate in 14 days."
              : "1. Kê đơn Apoquel 3.6mg: Uống 1 viên/ngày trong 7 ngày.\n2. Tắm Douxo S3 Seb Shampoo: Ủ bọt 10 phút, 2 lần/tuần.\n3. Hẹn tái khám sau 14 ngày.",
          },
          vitals: {
            weightKg: 4.8,
            tempC: 38.6,
            heartRateBpm: 160,
            respiratoryRateBpm: 28,
            bodyConditionScore: "5/9",
          },
          prescriptions: [
            {
              medication: "Apoquel (Oclacitinib) 3.6mg",
              dosage: "1 tablet",
              frequency: isEn ? "Once daily (SID)" : "1 lần / ngày",
              duration: isEn ? "7 days" : "7 ngày",
              instructions: isEn ? "Administer with food in the morning" : "Cho uống cùng thức ăn buổi sáng",
            },
            {
              medication: "Douxo S3 Seb Shampoo",
              dosage: "10 ml",
              frequency: isEn ? "Twice weekly" : "2 lần / tuần",
              duration: isEn ? "3 weeks" : "3 tuần",
              instructions: isEn ? "Lather for 10 minutes before warm rinse" : "Thoa ủ bọt 10 phút trước khi xả nước ấm",
            },
          ],
        },
        {
          id: "enc-bo-2",
          date: "2026-06-12",
          type: "wellness",
          title: isEn ? "Annual Wellness Checkup & 4-in-1 Booster" : "Khám sức khỏe định kỳ & Tiêm nhắc 4 bệnh",
          veterinarian: isEn ? "Dr. Le Thi Mai" : "BS. Lê Thị Mai",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          soapNotes: {
            subjective: isEn
              ? "Routine 2-year wellness visit. No vomiting, diarrhea, or appetite changes."
              : "Khám định kỳ tròn 2 năm tuổi. Không nôn, tiêu chảy, ăn uống tốt.",
            objective: isEn
              ? "Vitals: Temp 38.4°C, HR 150 bpm, RR 26, Weight 4.6kg. Heart and lungs clear. Mild grade 1 dental tartar. Administered Purevax RCPCh."
              : "Nhiệt độ 38.4°C, nhịp tim 150 lần/phút, thở 26 lần/phút, cân nặng 4.6kg. Tim phổi bình thường. Vôi răng độ 1 nhẹ. Đã tiêm Purevax RCPCh.",
            assessment: isEn
              ? "Healthy feline companion with mild dental tartar."
              : "Mèo khỏe mạnh, có ít mảng bám vôi răng nhẹ.",
            plan: isEn
              ? "Continue indoor care. Add enzymatic dental toothpaste. Next vaccine due June 2027."
              : "Duy trì chế độ ăn và vận động. Dùng gel vệ sinh răng enzyme. Tái chủng tháng 6/2027.",
          },
          vitals: {
            weightKg: 4.6,
            tempC: 38.4,
            heartRateBpm: 150,
            respiratoryRateBpm: 26,
            bodyConditionScore: "5/9",
          },
          prescriptions: [],
        },
      ],
      diagnostics: [
        {
          id: "diag-bo-1",
          date: "2026-10-25",
          title: isEn ? "Skin Cytology & Scraping (Ear Base)" : "Soi tế bào học & Cạo da vùng tai",
          type: "cytology",
          resultSummary: isEn
            ? "Wood's Lamp: Negative. Microscopy: No Demodex / Otodectes mites. Cytology shows mild Cocci overgrowth (2+)."
            : "Đèn Wood: Âm tính. Soi kính: Không có Demodex hay ve tai. Tế bào học thấy tăng sinh cầu khuẩn nhẹ (2+).",
          isNormal: false,
          labName: isEn ? "PawCare Central Diagnostic Lab" : "Trung Tâm Chẩn Đoán PawCare",
        },
        {
          id: "diag-bo-2",
          date: "2026-06-12",
          title: isEn ? "Annual Renal & Hepatic Chemistry Panel" : "Sinh hóa máu kiểm tra gan thận định kỳ",
          type: "bloodwork",
          resultSummary: isEn
            ? "BUN: 22 mg/dL, Creatinine: 1.2 mg/dL, ALT: 48 U/L. All physiological values within normal limits."
            : "BUN: 22 mg/dL, Creatinine: 1.2 mg/dL, ALT: 48 U/L. Các chỉ số gan thận trong giới hạn bình thường.",
          isNormal: true,
          labName: isEn ? "PawCare Central Diagnostic Lab" : "Trung Tâm Chẩn Đoán PawCare",
        },
      ],
      carePlan: {
        planId: "cp-bo-derma",
        title: isEn ? "Allergic Dermatitis Post-Exam Plan" : "Phác đồ điều trị viêm da dị ứng hậu khám",
        status: "active",
        adherencePct: 85,
        doctorNotes: isEn
          ? "Complete 7-day Apoquel course and maintain twice-weekly Douxo baths. Re-evaluate on Day 14."
          : "Uống đủ 7 ngày thuốc Apoquel và tắm thuốc Douxo 2 lần/tuần. Tái khám vào ngày thứ 14.",
        tasksCount: 4,
      },
      verificationToken: "pawcare-rec-bo-2026-verified",
    },
    {
      id: "demo-mochi-dog",
      name: "Mochi",
      species: "dog",
      breed: isEn ? "Red Toy Poodle" : "Toy Poodle (Nâu đỏ)",
      gender: "female_spayed",
      birthDate: "2024-11-10",
      ageDisplay: isEn ? "1.5 years old (DOB: Nov 10, 2024)" : "18 tháng tuổi (Sinh: 10/11/2024)",
      weightKg: 3.5,
      microchip: "981098109876543",
      color: isEn ? "Red Apricot" : "Nâu đỏ (Apricot)",
      status: "up_to_date",
      statusText: isEn ? "Travel ready: EU / US certified" : "Đủ điều kiện xuất cảnh: Đã kiểm định FAVN",
      owner: {
        name: isEn ? "Le Thi Mai" : "Lê Thị Mai",
        phone: "0912 345 678",
        email: "mai.le@example.com",
        address: isEn ? "88 Nguyen Thi Thap, Dist 7, Ho Chi Minh City" : "88 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP. HCM",
      },
      allergies: isEn
        ? ["No known drug or environmental allergies"]
        : ["Chưa ghi nhận tiền sử dị ứng thuốc hay thức ăn"],
      conditions: isEn
        ? ["Healthy canine companion. Dental care maintenance."]
        : ["Thể trạng ổn định. Duy trì vệ sinh răng miệng định kỳ."],
      dietaryNotes: isEn
        ? "Grain-free salmon formula with daily dental chew. 30-min daily exercise."
        : "Thức ăn hạt cá hồi không ngũ cốc + que gặm sạch răng mỗi ngày. Vận động 30 phút/ngày.",
      vaccinations: [
        {
          id: "vax-mochi-1",
          name: isEn ? "Rabies Vaccine (Nobivac Rabies)" : "Vắc-xin Dại (Nobivac Rabies)",
          brand: "MSD Animal Health",
          batchNo: "NV-9901",
          adminDate: "2026-10-20",
          nextDue: "2027-10-20",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "valid",
          isExportCertified: true,
        },
        {
          id: "vax-mochi-2",
          name: isEn ? "Vanguard Plus 5/L (7-in-1 Core)" : "Vanguard Plus 5/L (7-trong-1 Chó)",
          brand: "Zoetis",
          batchNo: "VG-7712",
          adminDate: "2026-08-05",
          nextDue: "2027-08-05",
          veterinarian: isEn ? "Dr. Tran Quoc Toan" : "BS. Trần Quốc Toản",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "valid",
        },
        {
          id: "vax-mochi-3",
          name: isEn ? "Nobivac KC (Bordetella Intranasal)" : "Nobivac KC (Ngừa ho cũi chó)",
          brand: "MSD Animal Health",
          batchNo: "KC-3310",
          adminDate: "2026-01-15",
          nextDue: "2027-01-15",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          status: "valid",
        },
      ],
      encounters: [
        {
          id: "enc-mochi-1",
          date: "2026-10-20",
          type: "travel_cert",
          title: isEn ? "International Travel Certification & Microchip Audit" : "Khám kiểm dịch xuất cảnh & Kiểm tra vi mạch",
          veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          soapNotes: {
            subjective: isEn
              ? "Owner requesting pre-export health check and IATA veterinary certification for travel to Europe."
              : "Chủ nuôi yêu cầu khám kiểm dịch và cấp giấy chứng nhận sức khỏe IATA xuất cảnh Châu Âu.",
            objective: isEn
              ? "Vitals: Temp 38.3°C, HR 110 bpm, RR 22, Weight 3.5kg. Microchip verified: 981098109876543. Rabies FAVN titer: 1.20 IU/mL."
              : "Nhiệt độ 38.3°C, nhịp tim 110 lần/phút, thở 22 lần/phút, cân nặng 3.5kg. Vi mạch ISO: 981098109876543. Kháng thể dại FAVN đạt 1.20 IU/mL.",
            assessment: isEn
              ? "Fit for international airline transportation. Cleared for travel."
              : "Đạt chuẩn kiểm dịch động vật sống. Đủ điều kiện xuất cảnh quốc tế.",
            plan: isEn
              ? "Issued official PawCare Bilingual Digital Health Passport and EU health certificate."
              : "Cấp sổ y bạ số song ngữ PawCare và giấy kiểm dịch xuất cảnh EU.",
          },
          vitals: {
            weightKg: 3.5,
            tempC: 38.3,
            heartRateBpm: 110,
            respiratoryRateBpm: 22,
            bodyConditionScore: "4/9",
          },
          prescriptions: [
            {
              medication: "NexGard Spectra 3.5-7.5kg",
              dosage: "1 chewable",
              frequency: isEn ? "Monthly" : "1 viên / tháng",
              duration: isEn ? "Ongoing preventative" : "Phòng bệnh định kỳ",
              instructions: isEn ? "Give directly or mix with food" : "Cho nhai trực tiếp hoặc trộn thức ăn",
            },
          ],
        },
        {
          id: "enc-mochi-2",
          date: "2026-08-05",
          type: "dental",
          title: isEn ? "Ultrasonic Dental Scaling & Polishing" : "Lấy cao răng siêu âm & Đánh bóng men răng",
          veterinarian: isEn ? "Dr. Tran Quoc Toan" : "BS. Trần Quốc Toản",
          clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
          soapNotes: {
            subjective: isEn
              ? "Owner noticed mild halitosis. Brought pet in for routine dental hygiene."
              : "Chủ phát hiện hơi thở có mùi nhẹ, đưa thú cưng đến vệ sinh răng.",
            objective: isEn
              ? "Performed ultrasonic supragingival scaling under light propofol sedation. Gums intact, no periodontal pockets."
              : "Lấy cao răng siêu âm dưới tiền mê nhẹ. Đã làm sạch mảng bám, nướu hồng hào.",
            assessment: isEn
              ? "Grade 1 periodontal tartar, resolved."
              : "Vôi răng độ 1, đã xử lý hoàn tất.",
            plan: isEn
              ? "Apply Orozyme dental gel 2x weekly."
              : "Thoa gel Orozyme 2 lần/tuần.",
          },
          vitals: {
            weightKg: 3.4,
            tempC: 38.2,
            heartRateBpm: 115,
            respiratoryRateBpm: 20,
            bodyConditionScore: "4/9",
          },
          prescriptions: [],
        },
      ],
      diagnostics: [
        {
          id: "diag-mochi-1",
          date: "2026-10-20",
          title: isEn ? "Rabies Neutralizing Antibody Titer (FAVN Test)" : "Xét nghiệm hiệu giá kháng thể dại (FAVN)",
          type: "titer_favn",
          resultSummary: isEn
            ? "Rabies Neutralizing Antibody Level: 1.20 IU/mL (WHO / EU threshold: >= 0.50 IU/mL)."
            : "Mức kháng thể trung hòa dại: 1.20 IU/mL (Ngưỡng yêu cầu WHO / EU: >= 0.50 IU/mL).",
          isNormal: true,
          labName: isEn ? "WOAH / EU Approved Reference Serology Lab" : "Phòng Xét Nghiệm Huyết Thanh Đạt Chuẩn WOAH/EU",
          certNumber: "FAVN-VN-2026-77881",
        },
        {
          id: "diag-mochi-2",
          date: "2026-08-05",
          title: isEn ? "Pre-Anesthetic Blood Screening Panel" : "Xét nghiệm máu tiền phẫu thuật",
          type: "bloodwork",
          resultSummary: isEn
            ? "Complete blood count & liver/kidney panel normal. Platelets: 320 K/uL. ALT: 35 U/L. Creatinine: 0.9 mg/dL."
            : "Công thức máu và chức năng gan thận bình thường. Tiểu cầu: 320 K/uL. ALT: 35 U/L. Creatinine: 0.9 mg/dL.",
          isNormal: true,
          labName: isEn ? "PawCare Central Diagnostic Lab" : "Trung Tâm Chẩn Đoán PawCare",
        },
      ],
      carePlan: {
        planId: "cp-mochi-preventive",
        title: isEn ? "Preventive Wellness & Dental Maintenance" : "Phòng bệnh định kỳ & Chăm sóc răng miệng",
        status: "active",
        adherencePct: 92,
        doctorNotes: isEn
          ? "Administer monthly NexGard Spectra chewable on the 1st of every month. Brush teeth twice weekly."
          : "Cho nhai viên NexGard Spectra vào ngày 1 hàng tháng. Vệ sinh răng 2 lần/tuần.",
        tasksCount: 3,
      },
      verificationToken: "pawcare-rec-mochi-2026-verified",
    },
  ];
}

// ==================== MAIN COMPONENT ====================

export function ClinicPetRecordsView({ locale }: { locale: string }) {
  const isEn = locale === "en";

  const [petList, setPetList] = useState<PetRecordData[]>(() => getDefaultDemoPets(isEn));
  const [selectedPetId, setSelectedPetId] = useState<string>("demo-bo-cat");
  const [searchQuery, setSearchQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<"all" | "cat" | "dog">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_treatment" | "up_to_date">("all");
  const [activeTab, setActiveTab] = useState<"overview" | "vaccines" | "encounters" | "diagnostics" | "careplan">("overview");

  // Modals
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [showAddVaccineModal, setShowAddVaccineModal] = useState(false);
  const [showAddEncounterModal, setShowAddEncounterModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Pet Form State
  const [newPetName, setNewPetName] = useState("");
  const [newPetSpecies, setNewPetSpecies] = useState<"cat" | "dog">("cat");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetGender, setNewPetGender] = useState<"male_neutered" | "female_spayed" | "male" | "female">("male_neutered");
  const [newPetBirthDate, setNewPetBirthDate] = useState("2024-01-01");
  const [newPetWeight, setNewPetWeight] = useState("4.0");
  const [newPetMicrochip, setNewPetMicrochip] = useState("");
  const [newPetOwnerName, setNewPetOwnerName] = useState("");
  const [newPetOwnerPhone, setNewPetOwnerPhone] = useState("");
  const [newPetAllergies, setNewPetAllergies] = useState("");

  // New Vaccine Form State
  const [newVaxName, setNewVaxName] = useState("");
  const [newVaxBrand, setNewVaxBrand] = useState("Boehringer Ingelheim");
  const [newVaxBatch, setNewVaxBatch] = useState("");
  const [newVaxNextDue, setNewVaxNextDue] = useState("");

  // New Encounter Form State
  const [newEncTitle, setNewEncTitle] = useState("");
  const [newEncSubjective, setNewEncSubjective] = useState("");
  const [newEncObjective, setNewEncObjective] = useState("");
  const [newEncAssessment, setNewEncAssessment] = useState("");
  const [newEncPlan, setNewEncPlan] = useState("");

  const loadSavedRecords = useCallback(() => {
    const defaultPets = getDefaultDemoPets(isEn);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pawcare-clinic-pet-records");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPetList(parsed);
            return;
          }
        }
      } catch {}
    }
    setPetList(defaultPets);
  }, [isEn]);

  useEffect(() => {
    loadSavedRecords();
  }, [loadSavedRecords]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const petParam = urlParams.get("petId");
      if (petParam) setSelectedPetId(petParam);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetDemo = () => {
    const defaults = getDefaultDemoPets(isEn);
    setPetList(defaults);
    setSelectedPetId("demo-bo-cat");
    try {
      localStorage.setItem("pawcare-clinic-pet-records", JSON.stringify(defaults));
    } catch {}
    showToast(isEn ? "Sample pet records restored." : "Đã khôi phục hồ sơ mẫu (Bơ & Mochi).");
  };

  const filteredPets = useMemo(() => {
    return petList.filter((pet) => {
      if (speciesFilter !== "all" && pet.species !== speciesFilter) return false;
      if (statusFilter !== "all" && pet.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = pet.name.toLowerCase().includes(q);
        const matchBreed = pet.breed.toLowerCase().includes(q);
        const matchChip = pet.microchip.toLowerCase().includes(q);
        const matchOwner = pet.owner.name.toLowerCase().includes(q);
        const matchPhone = pet.owner.phone.toLowerCase().includes(q);
        if (!matchName && !matchBreed && !matchChip && !matchOwner && !matchPhone) return false;
      }
      return true;
    });
  }, [petList, speciesFilter, statusFilter, searchQuery]);

  const activePet = useMemo(() => {
    return petList.find((p) => p.id === selectedPetId) || petList[0] || null;
  }, [petList, selectedPetId]);

  useEffect(() => {
    if (!showQrModal || !activePet) return;
    const verifyPayload = `PAWCARE-CLINIC-CERT:${activePet.microchip}:${activePet.verificationToken}`;
    QRCode.toDataURL(verifyPayload, {
      width: 240,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [showQrModal, activePet, locale]);

  const handleCopyChip = (chip: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(chip);
      showToast(isEn ? `Microchip ${chip} copied.` : `Đã sao chép mã vi mạch ${chip}.`);
    }
  };

  const handleCreatePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName.trim()) return;

    const newPet: PetRecordData = {
      id: `pet-rec-${Date.now()}`,
      name: newPetName.trim(),
      species: newPetSpecies,
      breed:
        newPetBreed.trim() ||
        (newPetSpecies === "cat" ? (isEn ? "Domestic Cat" : "Mèo ta") : (isEn ? "Mixed Breed" : "Chó lai")),
      gender: newPetGender,
      birthDate: newPetBirthDate,
      ageDisplay: isEn ? "Under 1 year" : "Dưới 1 tuổi",
      weightKg: parseFloat(newPetWeight) || 3.0,
      microchip: newPetMicrochip.trim() || `9810981${Math.floor(10000000 + Math.random() * 90000000)}`,
      color: isEn ? "Standard coat" : "Màu lông tự nhiên",
      status: "up_to_date",
      statusText: isEn ? "Healthy: Newly registered" : "Khỏe mạnh: Vừa tiếp nhận",
      owner: {
        name: newPetOwnerName.trim() || (isEn ? "Pet owner" : "Chủ nuôi"),
        phone: newPetOwnerPhone.trim() || "0900 000 000",
        email: "owner@example.com",
        address: isEn ? "District 1, Ho Chi Minh City" : "Quận 1, TP. Hồ Chí Minh",
      },
      allergies: newPetAllergies.trim() ? [newPetAllergies.trim()] : [],
      conditions: [],
      dietaryNotes: isEn ? "Standard veterinary diet." : "Khẩu phần thức ăn thú y tiêu chuẩn.",
      vaccinations: [],
      encounters: [],
      diagnostics: [],
      verificationToken: `pawcare-rec-${Date.now()}-verified`,
    };

    const updated = [newPet, ...petList];
    setPetList(updated);
    setSelectedPetId(newPet.id);
    try {
      localStorage.setItem("pawcare-clinic-pet-records", JSON.stringify(updated));
    } catch {}
    setShowAddPetModal(false);
    setNewPetName("");
    setNewPetBreed("");
    setNewPetMicrochip("");
    setNewPetOwnerName("");
    setNewPetOwnerPhone("");
    setNewPetAllergies("");
    showToast(isEn ? `Record created for ${newPet.name}.` : `Đã tạo hồ sơ cho ${newPet.name}.`);
  };

  const handleAddVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaxName.trim() || !activePet) return;

    const newVax: VaccineRecord = {
      id: `vax-${Date.now()}`,
      name: newVaxName.trim(),
      brand: newVaxBrand.trim() || "Boehringer Ingelheim",
      batchNo: newVaxBatch.trim() || `BCH-${Math.floor(1000 + Math.random() * 9000)}`,
      adminDate: new Date().toISOString().split("T")[0],
      nextDue: newVaxNextDue || new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
      clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
      status: "valid",
      isExportCertified: newVaxName.toLowerCase().includes("dại") || newVaxName.toLowerCase().includes("rabies"),
    };

    const updatedList = petList.map((p) =>
      p.id === activePet.id ? { ...p, vaccinations: [newVax, ...p.vaccinations] } : p
    );

    setPetList(updatedList);
    try {
      localStorage.setItem("pawcare-clinic-pet-records", JSON.stringify(updatedList));
    } catch {}
    setShowAddVaccineModal(false);
    setNewVaxName("");
    setNewVaxBatch("");
    setNewVaxNextDue("");
    showToast(isEn ? `Vaccination recorded for ${activePet.name}.` : `Đã ghi nhận mũi tiêm cho ${activePet.name}.`);
  };

  const handleAddEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEncTitle.trim() || !activePet) return;

    const newEnc: ClinicalEncounter = {
      id: `enc-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      type: "wellness",
      title: newEncTitle.trim(),
      veterinarian: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
      clinic: isEn ? "PawCare Partner Veterinary Clinic" : "Phòng Khám Thú Y PawCare Partner",
      soapNotes: {
        subjective: newEncSubjective.trim() || (isEn ? "Patient presented for examination." : "Bệnh nhân đến kiểm tra lâm sàng."),
        objective: newEncObjective.trim() || (isEn ? "Vitals normal. Alert and responsive." : "Dấu hiệu sinh tồn ổn định. Tỉnh táo."),
        assessment: newEncAssessment.trim() || (isEn ? "Clinical evaluation unremarkable." : "Đánh giá lâm sàng không ghi nhận bất thường."),
        plan: newEncPlan.trim() || (isEn ? "Maintain routine preventive care." : "Duy trì chăm sóc và phòng ngừa định kỳ."),
      },
      vitals: {
        weightKg: activePet.weightKg,
        tempC: 38.5,
        heartRateBpm: activePet.species === "cat" ? 155 : 110,
        respiratoryRateBpm: 24,
        bodyConditionScore: "5/9",
      },
      prescriptions: [],
    };

    const updatedList = petList.map((p) =>
      p.id === activePet.id ? { ...p, encounters: [newEnc, ...p.encounters] } : p
    );

    setPetList(updatedList);
    try {
      localStorage.setItem("pawcare-clinic-pet-records", JSON.stringify(updatedList));
    } catch {}
    setShowAddEncounterModal(false);
    setNewEncTitle("");
    setNewEncSubjective("");
    setNewEncObjective("");
    setNewEncAssessment("");
    setNewEncPlan("");
    showToast(isEn ? `SOAP note saved for ${activePet.name}.` : `Đã lưu bệnh án cho ${activePet.name}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-card px-4 py-3 text-xs sm:text-sm font-semibold text-foreground shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isEn ? "Veterinary Clinical Registry · ISO 11784" : "Kho y bạ thú y · Chuẩn vi mạch ISO 11784"}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isEn ? "Pet Records" : "Hồ sơ thú cưng"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            {isEn
              ? "Electronic medical charts, digital vaccination records, SOAP notes, and lab results."
              : "Quản lý hồ sơ y bạ điện tử, lịch sử tiêm phòng, bệnh án lâm sàng SOAP và kết quả xét nghiệm."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
          >
            {isEn ? "Reset sample records" : "Khôi phục dữ liệu mẫu"}
          </button>

          <button
            type="button"
            onClick={() => setShowAddPetModal(true)}
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
          >
            {isEn ? "+ New pet record" : "+ Tạo hồ sơ mới"}
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card sm:grid-cols-4">
        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {isEn ? "Registered pets" : "Tổng hồ sơ lưu trữ"}
          </span>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
            {petList.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {isEn ? "patients" : "thú cưng"}
            </span>
          </p>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {isEn ? "Vaccine compliance" : "Tiêm phòng đạt chuẩn"}
          </span>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            100%
          </p>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {isEn ? "Active care plans" : "Đang theo phác đồ"}
          </span>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {petList.filter((p) => p.carePlan?.status === "active").length}
          </p>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-muted-foreground">
            {isEn ? "Microchip verified" : "Định danh vi mạch"}
          </span>
          <p className="mt-1 text-xl font-bold tabular-nums text-primary">
            {petList.filter((p) => Boolean(p.microchip)).length}/{petList.length}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? "Search pet name, microchip ID, breed, or owner phone..."
                : "Tìm theo tên bé, mã vi mạch, giống hoặc số điện thoại chủ..."
            }
            className="w-full rounded-lg border border-border bg-background py-2 px-3.5 text-xs sm:text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isEn ? "Clear" : "Xóa"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: isEn ? "All species" : "Tất cả loài" },
            { id: "cat", label: isEn ? "Cats" : "Mèo" },
            { id: "dog", label: isEn ? "Dogs" : "Chó" },
          ].map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => setSpeciesFilter(sp.id as "all" | "cat" | "dog")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                speciesFilter === sp.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {sp.label}
            </button>
          ))}

          <span className="h-4 w-px bg-border mx-1" aria-hidden="true" />

          {[
            { id: "all", label: isEn ? "All statuses" : "Tất cả trạng thái" },
            { id: "in_treatment", label: isEn ? "In treatment" : "Đang điều trị" },
            { id: "up_to_date", label: isEn ? "Travel ready" : "Đạt chuẩn" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id as "all" | "in_treatment" | "up_to_date")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === st.id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Master-Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Roster */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isEn ? "Patients" : "Danh sách thú cưng"} ({filteredPets.length})
            </h2>
          </div>

          {filteredPets.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium">
                {isEn ? "No pet records match your search." : "Không tìm thấy hồ sơ phù hợp."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSpeciesFilter("all");
                  setStatusFilter("all");
                }}
                className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {isEn ? "Clear filters" : "Xóa bộ lọc"}
              </button>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPets.map((pet) => {
                const isSelected = activePet?.id === pet.id;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`w-full text-left rounded-xl border p-3.5 transition cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-sm font-bold text-secondary-foreground">
                        {pet.name.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-sm text-foreground truncate">
                            {pet.name}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                              pet.status === "in_treatment"
                                ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                                : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                            }`}
                          >
                            {pet.status === "in_treatment"
                              ? isEn ? "In treatment" : "Đang điều trị"
                              : isEn ? "Travel ready" : "Đạt chuẩn"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {pet.species === "cat" ? (isEn ? "Cat" : "Mèo") : (isEn ? "Dog" : "Chó")} · {pet.breed} ·{" "}
                          <span className="tabular-nums">{pet.weightKg} kg</span>
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/70 pt-1.5">
                          <span className="font-mono tabular-nums truncate max-w-[140px]">
                            {pet.microchip}
                          </span>
                          <span className="truncate font-medium text-foreground">
                            {pet.owner.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-8 space-y-5">
          {activePet ? (
            <>
              <Card className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-secondary font-display text-xl font-bold text-secondary-foreground">
                      {activePet.name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">
                          {activePet.name}
                        </h2>
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                            activePet.status === "in_treatment"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          {activePet.statusText}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {activePet.species === "cat" ? (isEn ? "Cat" : "Mèo") : (isEn ? "Dog" : "Chó")} ·{" "}
                        {activePet.breed} · {activePet.color} ·{" "}
                        {activePet.gender === "male_neutered"
                          ? isEn ? "Male (Neutered)" : "Đực (Đã triệt sản)"
                          : activePet.gender === "female_spayed"
                          ? isEn ? "Female (Spayed)" : "Cái (Đã triệt sản)"
                          : activePet.gender}
                      </p>

                      <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums text-foreground">
                          <span>ISO: {activePet.microchip}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyChip(activePet.microchip)}
                            className="font-sans text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {isEn ? "Copy" : "Sao chép"}
                          </button>
                        </div>

                        <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium tabular-nums text-foreground">
                          {activePet.weightKg} kg
                        </span>

                        <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                          {activePet.ageDisplay}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
                    >
                      {isEn ? "Passport QR" : "Mã QR y bạ"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddVaccineModal(true)}
                        className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
                      >
                        {isEn ? "+ Vaccine" : "+ Tiêm chủng"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAddEncounterModal(true)}
                        className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer"
                      >
                        {isEn ? "+ SOAP note" : "+ Bệnh án SOAP"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Owner Strip */}
                <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{isEn ? "Pet owner:" : "Chủ nuôi:"}</span>{" "}
                    <span className="font-semibold text-foreground">{activePet.owner.name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <a
                      href={`tel:${activePet.owner.phone.replace(/\s+/g, "")}`}
                      className="font-semibold text-primary hover:underline tabular-nums"
                    >
                      {activePet.owner.phone}
                    </a>
                    <span className="truncate max-w-[260px]">{activePet.owner.address}</span>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <div className="flex overflow-x-auto border-b border-border gap-1 text-xs sm:text-sm font-medium">
                {[
                  { id: "overview", label: isEn ? "Overview" : "Tổng quan y tế" },
                  { id: "vaccines", label: `${isEn ? "Vaccinations" : "Sổ tiêm chủng"} (${activePet.vaccinations.length})` },
                  { id: "encounters", label: `${isEn ? "Encounters (SOAP)" : "Bệnh án lâm sàng"} (${activePet.encounters.length})` },
                  { id: "diagnostics", label: `${isEn ? "Diagnostics" : "Xét nghiệm"} (${activePet.diagnostics.length})` },
                  ...(activePet.carePlan
                    ? [{ id: "careplan", label: isEn ? "Active Care Plan" : "Phác đồ đang theo" }]
                    : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`border-b-2 px-3 py-2.5 transition whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id
                        ? "border-primary text-primary font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {activePet.allergies.length > 0 && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                      <h3 className="text-sm font-bold text-destructive">
                        {isEn ? "Allergy & clinical precaution notes" : "Cảnh báo dị ứng & tiền sử lâm sàng"}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {activePet.allergies.map((allergy, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-destructive/25 bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Card className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-sm text-foreground">
                        {isEn ? "Latest recorded vital signs" : "Chỉ số sinh tồn gần nhất"}
                      </h3>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {activePet.encounters[0]?.date || "2026-10-25"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="text-xs text-muted-foreground">{isEn ? "Weight" : "Cân nặng"}</span>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                          {activePet.weightKg} kg
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="text-xs text-muted-foreground">{isEn ? "Temperature" : "Thân nhiệt"}</span>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                          {activePet.encounters[0]?.vitals.tempC ?? 38.5}°C
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="text-xs text-muted-foreground">{isEn ? "Heart rate" : "Nhịp tim"}</span>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                          {activePet.encounters[0]?.vitals.heartRateBpm ?? 150} bpm
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <span className="text-xs text-muted-foreground">{isEn ? "Body score (BCS)" : "Thể trạng (BCS)"}</span>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                          {activePet.encounters[0]?.vitals.bodyConditionScore ?? "5/9"}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-5 space-y-2">
                    <h3 className="font-display font-bold text-sm text-foreground">
                      {isEn ? "Dietary & lifestyle notes" : "Chế độ dinh dưỡng & chăm sóc"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {activePet.dietaryNotes}
                    </p>
                  </Card>

                  <Card className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-sm text-foreground">
                        {isEn ? "Upcoming clinical milestones" : "Lịch nhắc khám & tái chủng"}
                      </h3>
                      <Link
                        href={`/${locale}/clinic/care-plans`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {isEn ? "Manage plans" : "Quản lý phác đồ"}
                      </Link>
                    </div>

                    <div className="divide-y divide-border text-xs">
                      {activePet.vaccinations[0] && (
                        <div className="flex items-center justify-between py-2.5 first:pt-0">
                          <span className="text-foreground">
                            {isEn ? "Rabies booster due:" : "Tái chủng vắc-xin dại:"}{" "}
                            <strong className="tabular-nums">{activePet.vaccinations[0].nextDue}</strong>
                          </span>
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            {isEn ? "Annual" : "Định kỳ"}
                          </span>
                        </div>
                      )}
                      {activePet.carePlan && (
                        <div className="flex items-center justify-between py-2.5 last:pb-0">
                          <span className="text-foreground">
                            {isEn ? "Care plan recheck:" : "Tái khám đánh giá phác đồ:"}{" "}
                            <strong className="tabular-nums">2026-11-08</strong>
                          </span>
                          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            {isEn ? "Day 14 recheck" : "Sau 14 ngày"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 2: VACCINATIONS */}
              {activeTab === "vaccines" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {isEn ? "Vaccination history" : "Lịch sử tiêm chủng"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isEn
                          ? "Immunizations linked with ISO microchip record."
                          : "Hồ sơ tiêm chủng liên kết mã vi mạch ISO."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddVaccineModal(true)}
                      className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer shrink-0"
                    >
                      {isEn ? "+ Add vaccine" : "+ Thêm mũi tiêm"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activePet.vaccinations.map((vax) => (
                      <Card key={vax.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-sm text-foreground">{vax.name}</h4>
                              {vax.isExportCertified && (
                                <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                  {isEn ? "Export certified" : "Đạt chuẩn xuất cảnh"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {vax.brand} · {isEn ? "Batch:" : "Lô:"}{" "}
                              <span className="font-mono font-semibold text-foreground">{vax.batchNo}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {isEn ? "Administered:" : "Ngày tiêm:"} <strong>{vax.adminDate}</strong> · {vax.veterinarian} ({vax.clinic})
                            </p>
                          </div>

                          <div className="sm:text-right sm:border-l sm:border-border sm:pl-4 shrink-0">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                vax.status === "valid"
                                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {vax.status === "valid"
                                ? isEn ? "Valid" : "Còn hiệu lực"
                                : isEn ? "Expired" : "Đã quá hạn"}
                            </span>
                            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                              {isEn ? "Valid until:" : "Hiệu lực đến:"} <strong className="text-foreground">{vax.nextDue}</strong>
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ENCOUNTERS */}
              {activeTab === "encounters" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {isEn ? "Clinical encounters (SOAP)" : "Bệnh án lâm sàng (SOAP)"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isEn
                          ? "Structured clinical notes, vitals, and prescriptions."
                          : "Ghi chép khám bệnh theo chuẩn SOAP: Chủ quan, Khách quan, Đánh giá, Kế hoạch."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddEncounterModal(true)}
                      className="min-h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer shrink-0"
                    >
                      {isEn ? "+ New SOAP note" : "+ Ghi bệnh án mới"}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {activePet.encounters.map((enc) => (
                      <Card key={enc.id} className="p-4 sm:p-5 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
                                {enc.date}
                              </span>
                              <h4 className="font-display font-bold text-base text-foreground">{enc.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {isEn ? "Attending vet:" : "Bác sĩ:"} <strong className="text-foreground">{enc.veterinarian}</strong> · {enc.clinic}
                            </p>
                          </div>

                          <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs tabular-nums text-muted-foreground shrink-0">
                            {enc.vitals.weightKg} kg · {enc.vitals.tempC}°C · {enc.vitals.heartRateBpm} bpm
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg border border-border bg-background p-3">
                            <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                              S — {isEn ? "Subjective" : "Chủ quan"}
                            </span>
                            <p className="mt-1 text-foreground leading-relaxed">{enc.soapNotes.subjective}</p>
                          </div>

                          <div className="rounded-lg border border-border bg-background p-3">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                              O — {isEn ? "Objective" : "Khách quan"}
                            </span>
                            <p className="mt-1 text-foreground leading-relaxed">{enc.soapNotes.objective}</p>
                          </div>

                          <div className="rounded-lg border border-border bg-background p-3">
                            <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[10px]">
                              A — {isEn ? "Assessment" : "Chẩn đoán"}
                            </span>
                            <p className="mt-1 font-semibold text-foreground leading-relaxed">{enc.soapNotes.assessment}</p>
                          </div>

                          <div className="rounded-lg border border-border bg-background p-3">
                            <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                              P — {isEn ? "Plan" : "Hướng điều trị"}
                            </span>
                            <p className="mt-1 text-foreground leading-relaxed whitespace-pre-line">{enc.soapNotes.plan}</p>
                          </div>
                        </div>

                        {enc.prescriptions && enc.prescriptions.length > 0 && (
                          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                            <span className="font-semibold text-foreground block mb-1.5">
                              {isEn ? "Prescribed medications" : "Thuốc kê đơn"}
                            </span>
                            <div className="divide-y divide-border">
                              {enc.prescriptions.map((rx, rIdx) => (
                                <div key={rIdx} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">{rx.medication}</span>
                                  <span className="text-muted-foreground">
                                    {rx.dosage} · {rx.frequency} · {rx.duration}
                                  </span>
                                  {rx.instructions && (
                                    <span className="text-[11px] text-muted-foreground italic">
                                      ({rx.instructions})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: DIAGNOSTICS */}
              {activeTab === "diagnostics" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground">
                      {isEn ? "Diagnostic & lab reports" : "Kết quả xét nghiệm & cận lâm sàng"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? "Laboratory chemistries, cytology, and antibody titration records."
                        : "Kết quả tế bào học, sinh hóa máu và định lượng kháng thể."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {activePet.diagnostics.map((diag) => (
                      <Card key={diag.id} className="p-4 sm:p-5 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
                              {diag.date}
                            </span>
                            <h4 className="font-semibold text-sm text-foreground">{diag.title}</h4>
                          </div>

                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border self-start sm:self-auto ${
                              diag.isNormal
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {diag.isNormal
                              ? isEn ? "Normal" : "Bình thường"
                              : isEn ? "Clinical finding" : "Có ghi nhận"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed rounded-lg border border-border bg-background p-3">
                          {diag.resultSummary}
                        </p>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {isEn ? "Lab:" : "Cơ sở:"} <strong className="text-foreground">{diag.labName}</strong>
                          </span>
                          {diag.certNumber && (
                            <span className="font-mono font-semibold text-foreground">
                              {isEn ? "Cert #:" : "Mã chứng thư:"} {diag.certNumber}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: CARE PLAN */}
              {activeTab === "careplan" && activePet.carePlan && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {isEn ? "Active care plan" : "Phác đồ đang theo dõi"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isEn
                          ? "Shared home care adherence between clinic and owner."
                          : "Theo dõi tuân thủ điều trị giữa phòng khám và chủ nuôi."}
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/clinic/care-plans`}
                      className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:brightness-95 transition shrink-0"
                    >
                      {isEn ? "Open care plans" : "Mở mục phác đồ"}
                    </Link>
                  </div>

                  <Card className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                          {isEn ? "Active" : "Đang điều trị"}
                        </span>
                        <h4 className="mt-1.5 font-display font-bold text-lg text-foreground">
                          {activePet.carePlan.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activePet.carePlan.doctorNotes}
                        </p>
                      </div>

                      <div className="sm:text-right sm:border-l sm:border-border sm:pl-5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {isEn ? "Compliance" : "Mức độ tuân thủ"}
                        </span>
                        <p className="text-2xl font-bold tabular-nums text-primary">
                          {activePet.carePlan.adherencePct}%
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {isEn ? "Scheduled tasks:" : "Đầu việc chăm sóc:"}{" "}
                        <strong className="text-foreground tabular-nums">{activePet.carePlan.tasksCount}</strong>
                      </span>
                      <Link
                        href={`/${locale}/clinic/care-plans`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {isEn ? "Manage tasks" : "Quản lý chi tiết"}
                      </Link>
                    </div>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <p className="text-sm font-medium">
                {isEn ? "Select a patient record to view details." : "Chọn một thú cưng để xem hồ sơ."}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* 1. QR PASSPORT MODAL */}
      {showQrModal && activePet && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQrModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-lg text-foreground">
                {isEn ? "Verifiable Passport QR" : "Mã QR Y Bạ Số"}
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border text-center space-y-3">
              {qrDataUrl ? (
                <div className="bg-white p-3 rounded-xl border border-border shadow-xs">
                  <img
                    src={qrDataUrl}
                    alt={`QR passport for ${activePet.name}`}
                    className="size-44 object-contain"
                  />
                </div>
              ) : (
                <div className="grid size-44 place-items-center rounded-xl border border-border bg-background text-xs text-muted-foreground">
                  {isEn ? "Generating QR..." : "Đang tạo mã QR..."}
                </div>
              )}

              <div>
                <h4 className="font-bold text-base text-foreground">
                  {activePet.name} ({activePet.species === "cat" ? (isEn ? "Cat" : "Mèo") : (isEn ? "Dog" : "Chó")})
                </h4>
                <p className="text-xs font-mono tabular-nums text-muted-foreground mt-0.5">
                  ISO Microchip: {activePet.microchip}
                </p>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">
                  {isEn ? "Verified by PawCare Network" : "Chứng thực bởi mạng lưới PawCare"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleCopyChip(activePet.verificationToken);
                  showToast(isEn ? "Verification token copied." : "Đã sao chép mã xác thực y bạ.");
                }}
                className="flex-1 min-h-9 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                {isEn ? "Copy token" : "Sao chép mã"}
              </button>

              <a
                href={`/api/passport/${encodeURIComponent(activePet.id)}/export?locale=${locale}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex min-h-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:brightness-95"
              >
                {isEn ? "Export PDF" : "Tải PDF y bạ"}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD PET MODAL */}
      {showAddPetModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddPetModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-lg text-foreground">
                {isEn ? "Register New Pet Record" : "Tạo Mới Hồ Sơ Thú Cưng"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPetModal(false)}
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <form onSubmit={handleCreatePet} className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Pet name *" : "Tên thú cưng *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    placeholder="Milo, Bella, Simba..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Species *" : "Loài *"}
                  </label>
                  <select
                    value={newPetSpecies}
                    onChange={(e) => setNewPetSpecies(e.target.value as "cat" | "dog")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="cat">{isEn ? "Cat" : "Mèo"}</option>
                    <option value="dog">{isEn ? "Dog" : "Chó"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Breed" : "Giống loài"}
                  </label>
                  <input
                    type="text"
                    value={newPetBreed}
                    onChange={(e) => setNewPetBreed(e.target.value)}
                    placeholder={newPetSpecies === "cat" ? "British Shorthair, Persian..." : "Poodle, Golden, Corgi..."}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Sex & neutering" : "Giới tính & triệt sản"}
                  </label>
                  <select
                    value={newPetGender}
                    onChange={(e) => setNewPetGender(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  >
                    <option value="male_neutered">{isEn ? "Male (Neutered)" : "Đực (Đã triệt sản)"}</option>
                    <option value="female_spayed">{isEn ? "Female (Spayed)" : "Cái (Đã triệt sản)"}</option>
                    <option value="male">{isEn ? "Male (Intact)" : "Đực (Chưa triệt sản)"}</option>
                    <option value="female">{isEn ? "Female (Intact)" : "Cái (Chưa triệt sản)"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Birth date" : "Ngày sinh"}
                  </label>
                  <input
                    type="date"
                    value={newPetBirthDate}
                    onChange={(e) => setNewPetBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Weight (kg)" : "Cân nặng (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPetWeight}
                    onChange={(e) => setNewPetWeight(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "ISO microchip" : "Số vi mạch ISO"}
                  </label>
                  <input
                    type="text"
                    value={newPetMicrochip}
                    onChange={(e) => setNewPetMicrochip(e.target.value)}
                    placeholder="98109810..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">
                  {isEn ? "Owner information" : "Thông tin chủ nuôi"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      {isEn ? "Owner full name *" : "Họ tên chủ nuôi *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newPetOwnerName}
                      onChange={(e) => setNewPetOwnerName(e.target.value)}
                      placeholder="Nguyen Van A..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      {isEn ? "Contact phone *" : "Số điện thoại *"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={newPetOwnerPhone}
                      onChange={(e) => setNewPetOwnerPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {isEn ? "Known allergies / precautions" : "Tiền sử dị ứng / lưu ý"}
                </label>
                <input
                  type="text"
                  value={newPetAllergies}
                  onChange={(e) => setNewPetAllergies(e.target.value)}
                  placeholder={isEn ? "e.g. Poultry allergy, flea sensitivity..." : "VD: Dị ứng đạm gà, nhạy cảm ve rận..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddPetModal(false)}
                  className="min-h-9 rounded-lg border border-border px-4 font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
                >
                  {isEn ? "Save record" : "Lưu hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD VACCINE MODAL */}
      {showAddVaccineModal && activePet && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddVaccineModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-lg text-foreground">
                {isEn ? `Record Vaccine — ${activePet.name}` : `Ghi Nhận Mũi Tiêm — ${activePet.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVaccineModal(false)}
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <form onSubmit={handleAddVaccine} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {isEn ? "Vaccine name *" : "Tên vắc-xin *"}
                </label>
                <input
                  type="text"
                  required
                  value={newVaxName}
                  onChange={(e) => setNewVaxName(e.target.value)}
                  placeholder={activePet.species === "cat" ? "Purevax RCPCh / Rabisin..." : "Vanguard Plus 5/L / Nobivac..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Manufacturer" : "Hãng sản xuất"}
                  </label>
                  <input
                    type="text"
                    value={newVaxBrand}
                    onChange={(e) => setNewVaxBrand(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {isEn ? "Lot / batch no." : "Số lô sản xuất"}
                  </label>
                  <input
                    type="text"
                    value={newVaxBatch}
                    onChange={(e) => setNewVaxBatch(e.target.value)}
                    placeholder="BCH-9821"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {isEn ? "Next booster due date" : "Ngày tái chủng tiếp theo"}
                </label>
                <input
                  type="date"
                  value={newVaxNextDue}
                  onChange={(e) => setNewVaxNextDue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddVaccineModal(false)}
                  className="min-h-9 rounded-lg border border-border px-4 font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
                >
                  {isEn ? "Save vaccine" : "Lưu mũi tiêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD SOAP ENCOUNTER MODAL */}
      {showAddEncounterModal && activePet && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddEncounterModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-lg text-foreground">
                {isEn ? `Clinical SOAP Note — ${activePet.name}` : `Ghi Bệnh Án Lâm Sàng — ${activePet.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEncounterModal(false)}
                className="min-h-8 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isEn ? "Close" : "Đóng"}
              </button>
            </div>

            <form onSubmit={handleAddEncounter} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {isEn ? "Visit title / reason *" : "Lý do khám / tiêu đề bệnh án *"}
                </label>
                <input
                  type="text"
                  required
                  value={newEncTitle}
                  onChange={(e) => setNewEncTitle(e.target.value)}
                  placeholder={isEn ? "General Wellness Check, Dental Scaling..." : "Khám da liễu, Khám răng, Kiểm tra tổng quát..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-primary block mb-1">
                  S — {isEn ? "Subjective (History)" : "Chủ quan (Tiền sử)"}
                </label>
                <textarea
                  rows={2}
                  value={newEncSubjective}
                  onChange={(e) => setNewEncSubjective(e.target.value)}
                  placeholder={isEn ? "Pet scratched ears for 2 days..." : "Thú cưng gãi tai nhiều, ăn uống bình thường..."}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
                  O — {isEn ? "Objective (Physical exam & vitals)" : "Khách quan (Khám lâm sàng)"}
                </label>
                <textarea
                  rows={2}
                  value={newEncObjective}
                  onChange={(e) => setNewEncObjective(e.target.value)}
                  placeholder={isEn ? "Vitals normal. Left ear pinna mild erythema..." : "Nhiệt độ 38.5, tai trái đỏ nhẹ, tim phổi đều..."}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                  A — {isEn ? "Assessment (Diagnosis)" : "Đánh giá (Chẩn đoán)"}
                </label>
                <input
                  type="text"
                  value={newEncAssessment}
                  onChange={(e) => setNewEncAssessment(e.target.value)}
                  placeholder={isEn ? "Mild contact dermatitis..." : "Viêm da tiếp xúc nhẹ..."}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  P — {isEn ? "Plan (Treatment & prescriptions)" : "Kế hoạch (Phác đồ & kê đơn)"}
                </label>
                <textarea
                  rows={2}
                  value={newEncPlan}
                  onChange={(e) => setNewEncPlan(e.target.value)}
                  placeholder={isEn ? "Topical cream twice daily, recheck in 7 days..." : "Bôi thuốc 2 lần/ngày, tái khám sau 7 ngày..."}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-foreground focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddEncounterModal(false)}
                  className="min-h-9 rounded-lg border border-border px-4 font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  {isEn ? "Cancel" : "Hủy"}
                </button>
                <button
                  type="submit"
                  className="min-h-9 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:brightness-95 cursor-pointer"
                >
                  {isEn ? "Save encounter" : "Lưu bệnh án"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
