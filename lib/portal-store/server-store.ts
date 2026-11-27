import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppRole } from "@/lib/auth/roles";
import { INITIAL_SEED_CARE_PLANS, type CarePlanProposal } from "@/modules/careplans/types";
import type {
  PetRecordData,
  VaccineRecord,
  ClinicalEncounter,
  DiagnosticReport,
} from "@/components/clinic/clinic-pet-records-view";
import type { StoredGrant } from "@/modules/passport/mock-share-store";

export interface PortalUserProfile {
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  birthDate: string;
  city: string;
  district: string;
  address: string;
  emergencyContact: string;
  updatedAt: string;
}

export interface PortalOwnerAccount {
  id: string;
  email: string;
  aliases: string[];
  passwordHash: string;
  role: "owner";
  plan: "premium" | "free";
  onboardingCompleted: boolean;
  profile: PortalUserProfile;
  petIds: string[];
  activePetId: string;
  createdAt: string;
}

export interface PortalClinicProfile {
  id: string;
  name: string;
  licenseNumber: string;
  chiefVet: string;
  facilityType: "private_clinic" | "hospital" | "emergency_center";
  address: string;
  city: string;
  phone: string;
  hotline?: string;
  email: string;
  openHours: string;
  closeHours: string;
  is247: boolean;
  hasHomeVisit: boolean;
  services: string[];
  bio?: string;
  createdAt: string;
}

export interface PortalClinicAccount {
  id: string;
  email: string;
  aliases: string[];
  passwordHash: string;
  role: "clinic_admin" | "clinic_staff";
  clinicId: string;
  name: string;
  onboardingCompleted: boolean;
  profile: PortalClinicProfile;
  settings: Record<string, unknown>;
}

export interface OwnerPetRecord {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string;
  gender: "male" | "female" | "neutered";
  age: string;
  birthDate: string;
  weightKg: number;
  microchip: string;
  color?: string;
  medicalHistory: string;
  allergies: string[];
  conditions: string[];
  dietaryNotes?: string;
  isVaccinated: boolean;
  vaccinations: Array<{
    id?: string;
    name: string;
    brand?: string;
    date: string;
    nextDue: string;
    lot: string;
    clinic: string;
    veterinarian?: string;
    status: "completed" | "due_soon" | "overdue";
    isExportCertified?: boolean;
  }>;
  notes?: string;
  createdAt: string;
}

export interface WeightLogItem {
  id: string;
  date: string;
  weightKg: number;
  note?: string;
  createdAt?: number;
}

export interface PortalAppointment {
  id: string;
  ownerId?: string;
  ownerEmail?: string;
  petName: string;
  petCount: number;
  pets: Array<{
    id: string;
    name: string;
    species?: "dog" | "cat" | "other";
    breed?: string;
    gender?: string;
    age?: string;
    birthDate?: string;
    weightKg?: number;
    microchip?: string;
    allergies?: string[];
    service: string;
  }>;
  ownerName: string;
  ownerPhone: string;
  clinicId?: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  service: string;
  date: string;
  time: string;
  doctor: string;
  status: "confirmed" | "pending" | "completed" | "canceled" | "waiting" | "in_progress";
  notes?: string;
  isPriority?: boolean;
}

export interface PortalChatMessage {
  id: string;
  sender: "clinic" | "owner";
  senderName: string;
  senderRole?: string;
  avatarText?: string;
  text: string;
  timestamp: string;
  protocolCard?: {
    title: string;
    cadence: "daily" | "weekly" | "monthly";
    category: "vaccination" | "treatment" | "diet" | "hygiene" | "checkup";
    instructions: string;
    dueDate: string;
    synced?: boolean;
  };
}

export interface PortalSosLead {
  id: string;
  timestamp: string;
  petId?: string;
  petName: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName: string;
  ownerPhone: string;
  distanceKm: number;
  symptoms: string;
  status: "pending" | "accepted" | "completed";
  hasAllergy: string;
  vaccines: string;
  address: string;
  acceptedByClinic?: string;
  acceptedAt?: string;
}

export interface PortalReminderItem {
  id: string;
  petName: string;
  title: string;
  dueDate: string;
  category: "vaccine" | "deworm" | "medication" | "checkup" | "grooming" | "other";
  completed: boolean;
}

export interface PortalStateDatabase {
  version: number;
  updatedAt: string;
  ownerAccounts: Record<string, PortalOwnerAccount>;
  clinicAccounts: Record<string, PortalClinicAccount>;
  ownerPets: Record<string, OwnerPetRecord>;
  clinicPetRecords: Record<string, PetRecordData>;
  weightHistoryByPet: Record<string, WeightLogItem[]>;
  appointments: PortalAppointment[];
  carePlans: CarePlanProposal[];
  carePlanChats: Record<string, PortalChatMessage[]>;
  activeSosLead: PortalSosLead | null;
  remindersByOwner: Record<string, PortalReminderItem[]>;
  shareGrants: Record<string, StoredGrant>;
}

const STORE_VERSION = 2;

function getStoreFilePath(): string {
  const localDir = path.join(process.cwd(), ".pawcare-data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return path.join(localDir, "portal-store.json");
  } catch {
    const tmpDir = path.join(os.tmpdir(), "pawcare-data");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return path.join(tmpDir, "portal-store.json");
  }
}

export function buildInitialPortalDatabase(): PortalStateDatabase {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowIso = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // 1. FOUR PREMIUM OWNER ACCOUNTS (Paired with Clinic Portal)
  // ---------------------------------------------------------------------------
  const owner1: PortalOwnerAccount = {
    id: "owner-premium-01",
    email: "yen.le@pawcare.vn",
    aliases: [
      "yen.le@pawcare.vn",
      "owner1@pawcare.vn",
      "owner@pawcare.vn",
      "an.nguyen@example.com",
      "an.nguyen@pawcare.vn",
    ],
    passwordHash: "Pawcare@2026",
    role: "owner",
    plan: "premium",
    onboardingCompleted: true,
    profile: {
      fullName: "Lê Hoàng Yến",
      phone: "0987 654 321",
      email: "yen.le@pawcare.vn",
      gender: "female",
      birthDate: "1998-04-12",
      city: "TP. Hồ Chí Minh",
      district: "Quận 1",
      address: "124 Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM",
      emergencyContact: "Nguyễn Văn An - 0903 123 456",
      updatedAt: nowIso,
    },
    petIds: ["demo-bo-cat"],
    activePetId: "demo-bo-cat",
    createdAt: "2026-10-01T08:00:00.000Z",
  };

  const owner2: PortalOwnerAccount = {
    id: "owner-premium-02",
    email: "khoa.tran@pawcare.vn",
    aliases: ["khoa.tran@pawcare.vn", "owner2@pawcare.vn", "mai.le@example.com"],
    passwordHash: "Pawcare@2026",
    role: "owner",
    plan: "premium",
    onboardingCompleted: true,
    profile: {
      fullName: "Trần Anh Khoa",
      phone: "0912 345 678",
      email: "khoa.tran@pawcare.vn",
      gender: "male",
      birthDate: "1996-09-22",
      city: "TP. Hồ Chí Minh",
      district: "Quận 1",
      address: "88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. HCM",
      emergencyContact: "Lê Thị Mai - 0918 765 432",
      updatedAt: nowIso,
    },
    petIds: ["demo-mochi-dog"],
    activePetId: "demo-mochi-dog",
    createdAt: "2026-10-01T08:30:00.000Z",
  };

  const owner3: PortalOwnerAccount = {
    id: "owner-premium-03",
    email: "duc.pham@pawcare.vn",
    aliases: ["duc.pham@pawcare.vn", "owner3@pawcare.vn"],
    passwordHash: "Pawcare@2026",
    role: "owner",
    plan: "premium",
    onboardingCompleted: true,
    profile: {
      fullName: "Phạm Minh Đức",
      phone: "0903 112 233",
      email: "duc.pham@pawcare.vn",
      gender: "male",
      birthDate: "1995-11-05",
      city: "TP. Hồ Chí Minh",
      district: "Bình Thạnh",
      address: "45 Điện Biên Phủ, P. 15, Quận Bình Thạnh, TP. HCM",
      emergencyContact: "Phạm Thu Thủy - 0908 112 244",
      updatedAt: nowIso,
    },
    petIds: ["demo-lu-dog"],
    activePetId: "demo-lu-dog",
    createdAt: "2026-10-02T09:00:00.000Z",
  };

  const owner4: PortalOwnerAccount = {
    id: "owner-premium-04",
    email: "trang.nguyen@pawcare.vn",
    aliases: ["trang.nguyen@pawcare.vn", "owner4@pawcare.vn"],
    passwordHash: "Pawcare@2026",
    role: "owner",
    plan: "premium",
    onboardingCompleted: true,
    profile: {
      fullName: "Nguyễn Thu Trang",
      phone: "0934 889 900",
      email: "trang.nguyen@pawcare.vn",
      gender: "female",
      birthDate: "1999-02-19",
      city: "TP. Hồ Chí Minh",
      district: "Quận 10",
      address: "246 Lý Thường Kiệt, P. 14, Quận 10, TP. HCM",
      emergencyContact: "Nguyễn Minh Tuấn - 0934 889 911",
      updatedAt: nowIso,
    },
    petIds: ["demo-miumiu-cat"],
    activePetId: "demo-miumiu-cat",
    createdAt: "2026-10-03T10:00:00.000Z",
  };

  // ---------------------------------------------------------------------------
  // 2. PAIRED CLINIC ACCOUNT
  // ---------------------------------------------------------------------------
  const mainClinicProfile: PortalClinicProfile = {
    id: "petcare-d1",
    name: "Phòng Khám Thú Y PetCare · Quận 1",
    licenseNumber: "79-TY-00108/HCM",
    chiefVet: "BS. Nguyễn Văn Cường",
    facilityType: "hospital",
    address: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1",
    city: "TP. Hồ Chí Minh",
    phone: "028 3823 4567",
    hotline: "0909 115 247",
    email: "clinic@pawcare.vn",
    openHours: "08:00",
    closeHours: "21:00",
    is247: true,
    hasHomeVisit: true,
    services: [
      "Khám tổng quát & Nội khoa",
      "Tiêm phòng vắc-xin chuẩn quốc tế",
      "Da liễu & Soi tế bào học vi mô",
      "Nha khoa siêu âm & Phẫu thuật",
      "Cấp cứu ngoại khoa & Hồi sức 24/7",
      "Cấp chứng nhận kiểm dịch xuất cảnh FAVN",
    ],
    bio: "Trung tâm Thú y & Cấp cứu 24/7 PetCare Quận 1 liên kết trực tiếp với hệ thống Y bạ số PawCare.",
    createdAt: "2026-10-01T00:00:00.000Z",
  };

  const clinicAccount: PortalClinicAccount = {
    id: "dev-clinic-id",
    email: "clinic@pawcare.vn",
    aliases: [
      "clinic@pawcare.vn",
      "dev-clinic_admin@pawcare.vn",
      "dev-clinic_staff@pawcare.vn",
      "contact@petcare-clinic.vn",
    ],
    passwordHash: "Pawcare@2026",
    role: "clinic_admin",
    clinicId: "petcare-d1",
    name: "Phòng Khám Thú Y PetCare · Quận 1",
    onboardingCompleted: true,
    profile: mainClinicProfile,
    settings: {
      defaultSlotDuration: "30",
      sosPollSeconds: "10",
      autoSyncPassport: true,
    },
  };

  // ---------------------------------------------------------------------------
  // 3. PAIRED CLINIC EMR PET RECORDS (All 4 Premium Owners' Pets)
  // ---------------------------------------------------------------------------
  const clinicPetsList: PetRecordData[] = [
    {
      id: "demo-bo-cat",
      name: "Bơ",
      species: "cat",
      breed: "Mèo Anh lông ngắn",
      gender: "male_neutered",
      birthDate: "2024-04-15",
      ageDisplay: "2 tuổi (Sinh: 15/04/2024)",
      weightKg: 4.8,
      microchip: "981098102345678",
      color: "Xám xanh (Lilac Blue)",
      status: "in_treatment",
      statusText: "Đang điều trị: Viêm da dị ứng",
      owner: {
        name: owner1.profile.fullName,
        phone: owner1.profile.phone,
        email: owner1.profile.email,
        address: owner1.profile.address,
      },
      allergies: ["Dị ứng đạm gia cầm (gà)", "Dễ viêm da cơ địa theo mùa"],
      conditions: ["Viêm da dị ứng cấp kèm trầy xước sau tai trái"],
      dietaryNotes:
        "Hạt đạm thủy phân (Royal Canin Hypoallergenic). Tuyệt đối tránh thức ăn thưởng có đạm gà.",
      vaccinations: [
        {
          id: "vax-bo-1",
          name: "Vắc-xin Dại (Rabisin)",
          brand: "Boehringer Ingelheim",
          batchNo: "RB-2026-891",
          adminDate: "2026-10-20",
          nextDue: "2027-10-20",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
          isExportCertified: true,
        },
        {
          id: "vax-bo-2",
          name: "Purevax RCPCh (4-trong-1 Mèo)",
          brand: "Boehringer Ingelheim",
          batchNo: "PX-4421",
          adminDate: "2026-06-12",
          nextDue: "2027-06-12",
          veterinarian: "BS. Lê Thị Mai",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
        },
        {
          id: "vax-bo-3",
          name: "Felocell 4-trong-1 (Mũi sơ sinh)",
          brand: "Zoetis",
          batchNo: "FC-1109",
          adminDate: "2025-05-10",
          nextDue: "2026-05-10",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "expired",
        },
      ],
      encounters: [
        {
          id: "enc-bo-1",
          date: "2026-10-25",
          type: "dermatology",
          title: "Khám da liễu & Soi tế bào học tai",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          soapNotes: {
            subjective:
              "Chủ nuôi báo mèo gãi liên tục sau tai trái 3 ngày nay, rụng lông và xuất hiện vết trầy. Mèo vẫn ăn uống bình thường.",
            objective:
              "Nhiệt độ 38.6°C, nhịp tim 160 lần/phút, thở 28 lần/phút, cân nặng 4.8kg. Vùng da gốc tai trái có ban đỏ và vết trầy xước. Đèn Wood: Âm tính nấm.",
            assessment: "Viêm da dị ứng cấp tính kèm vết trầy xước thứ phát do cào gãi.",
            plan: "1. Kê đơn Apoquel 3.6mg: Uống 1 viên/ngày trong 7 ngày.\n2. Tắm Douxo S3 Seb Shampoo: Ủ bọt 10 phút, 2 lần/tuần.\n3. Hẹn tái khám sau 14 ngày.",
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
              dosage: "1 viên",
              frequency: "1 lần / ngày",
              duration: "7 ngày",
              instructions: "Cho uống cùng thức ăn buổi sáng",
            },
            {
              medication: "Douxo S3 Seb Shampoo",
              dosage: "10 ml",
              frequency: "2 lần / tuần",
              duration: "3 tuần",
              instructions: "Thoa ủ bọt 10 phút trước khi xả nước ấm",
            },
          ],
        },
      ],
      diagnostics: [
        {
          id: "diag-bo-1",
          date: "2026-10-25",
          title: "Soi tế bào học & Cạo da vùng tai",
          type: "cytology",
          resultSummary:
            "Đèn Wood: Âm tính. Soi kính: Không có Demodex hay ve tai. Tế bào học thấy tăng sinh cầu khuẩn nhẹ (2+).",
          isNormal: false,
          labName: "Trung Tâm Chẩn Đoán PawCare",
        },
      ],
      carePlan: {
        planId: "plan-petcare-01",
        title: "Phác đồ kiểm soát viêm da dị ứng tiếp xúc & hồi phục biểu bì",
        status: "active",
        adherencePct: 85,
        doctorNotes:
          "Uống đủ 7 ngày thuốc Apoquel và tắm thuốc Douxo 2 lần/tuần. Tái khám vào ngày thứ 14.",
        tasksCount: 8,
      },
      verificationToken: "pawcare-rec-bo-2026-verified",
    },
    {
      id: "demo-mochi-dog",
      name: "Mochi",
      species: "dog",
      breed: "Toy Poodle (Nâu đỏ)",
      gender: "female_spayed",
      birthDate: "2024-11-10",
      ageDisplay: "18 tháng tuổi (Sinh: 10/11/2024)",
      weightKg: 3.5,
      microchip: "981098109876543",
      color: "Nâu đỏ (Apricot)",
      status: "up_to_date",
      statusText: "Đủ điều kiện xuất cảnh: Đã kiểm định FAVN",
      owner: {
        name: owner2.profile.fullName,
        phone: owner2.profile.phone,
        email: owner2.profile.email,
        address: owner2.profile.address,
      },
      allergies: ["Chưa ghi nhận tiền sử dị ứng thuốc hay thức ăn"],
      conditions: ["Thể trạng ổn định. Duy trì vệ sinh răng miệng định kỳ."],
      dietaryNotes:
        "Thức ăn hạt cá hồi không ngũ cốc + que gặm sạch răng mỗi ngày. Vận động 30 phút/ngày.",
      vaccinations: [
        {
          id: "vax-mochi-1",
          name: "Vắc-xin Dại (Nobivac Rabies)",
          brand: "MSD Animal Health",
          batchNo: "NV-9901",
          adminDate: "2026-10-20",
          nextDue: "2027-10-20",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
          isExportCertified: true,
        },
        {
          id: "vax-mochi-2",
          name: "Vanguard Plus 5/L (7-trong-1 Chó)",
          brand: "Zoetis",
          batchNo: "VG-7712",
          adminDate: "2026-08-05",
          nextDue: "2027-08-05",
          veterinarian: "BS. Trần Quốc Toản",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
        },
      ],
      encounters: [
        {
          id: "enc-mochi-1",
          date: "2026-10-20",
          type: "travel_cert",
          title: "Khám kiểm dịch xuất cảnh & Kiểm tra vi mạch",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          soapNotes: {
            subjective:
              "Chủ nuôi yêu cầu khám kiểm dịch và cấp giấy chứng nhận sức khỏe IATA xuất cảnh Châu Âu.",
            objective:
              "Nhiệt độ 38.3°C, nhịp tim 110 lần/phút, thở 22 lần/phút, cân nặng 3.5kg. Vi mạch ISO: 981098109876543. Kháng thể dại FAVN đạt 1.20 IU/mL.",
            assessment: "Đạt chuẩn kiểm dịch động vật sống. Đủ điều kiện xuất cảnh quốc tế.",
            plan: "Cấp sổ y bạ số song ngữ PawCare và giấy kiểm dịch xuất cảnh EU.",
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
              dosage: "1 viên nhai",
              frequency: "1 viên / tháng",
              duration: "Phòng bệnh định kỳ",
              instructions: "Cho nhai trực tiếp hoặc trộn thức ăn",
            },
          ],
        },
      ],
      diagnostics: [
        {
          id: "diag-mochi-1",
          date: "2026-10-20",
          title: "Xét nghiệm hiệu giá kháng thể dại (FAVN)",
          type: "titer_favn",
          resultSummary:
            "Mức kháng thể trung hòa dại: 1.20 IU/mL (Ngưỡng yêu cầu WHO / EU: >= 0.50 IU/mL).",
          isNormal: true,
          labName: "Phòng Xét Nghiệm Huyết Thanh Đạt Chuẩn WOAH/EU",
          certNumber: "FAVN-VN-2026-77881",
        },
      ],
      carePlan: {
        planId: "plan-petcare-03",
        title: "Phòng bệnh định kỳ & Chăm sóc răng miệng chuẩn xuất cảnh",
        status: "active",
        adherencePct: 92,
        doctorNotes:
          "Cho nhai viên NexGard Spectra vào ngày 1 hàng tháng. Vệ sinh răng 2 lần/tuần.",
        tasksCount: 3,
      },
      verificationToken: "pawcare-rec-mochi-2026-verified",
    },
    {
      id: "demo-lu-dog",
      name: "Lu",
      species: "dog",
      breed: "Poodle Toy",
      gender: "male_neutered",
      birthDate: "2023-11-05",
      ageDisplay: "3 tuổi (Sinh: 05/11/2023)",
      weightKg: 3.8,
      microchip: "982000411223344",
      color: "Nâu socola",
      status: "in_treatment",
      statusText: "Đang điều trị: Chăm sóc nha khoa & ngừa giun tim",
      owner: {
        name: owner3.profile.fullName,
        phone: owner3.profile.phone,
        email: owner3.profile.email,
        address: owner3.profile.address,
      },
      allergies: ["Kháng sinh nhóm Penicillin"],
      conditions: ["Vôi răng độ 2 cần vệ sinh siêu âm & dự phòng giun tim"],
      dietaryNotes: "Hạt mềm nhỏ hạt cho giống chó nhỏ, tránh xương cứng.",
      vaccinations: [
        {
          id: "vax-lu-1",
          name: "Vắc-xin Dại (Rabisin)",
          brand: "Boehringer Ingelheim",
          batchNo: "RB-2026-512",
          adminDate: "2026-04-10",
          nextDue: "2027-04-10",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
          isExportCertified: true,
        },
      ],
      encounters: [
        {
          id: "enc-lu-1",
          date: "2026-10-18",
          type: "dental",
          title: "Khám tiền phẫu nha khoa & Xét nghiệm máu",
          veterinarian: "BS. Nguyễn Văn Cường",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          soapNotes: {
            subjective: "Chủ nuôi đưa bé đi khám răng định kỳ do hơi thở có mùi và mảng bám răng hàm.",
            objective: "Cân nặng 3.8kg, nhiệt độ 38.4°C. Cao răng độ 2 ở răng tiền hàm. Lưu ý tiền sử dị ứng Penicillin.",
            assessment: "Viêm nướu nhẹ do mảng bám cao răng, chỉ định lấy cao răng siêu âm.",
            plan: "Lên lịch lấy cao răng siêu âm buổi sáng (nhịn ăn 8 tiếng trước thủ thuật). Tuyệt đối không dùng kháng sinh nhóm Penicillin.",
          },
          vitals: {
            weightKg: 3.8,
            tempC: 38.4,
            heartRateBpm: 118,
            respiratoryRateBpm: 24,
            bodyConditionScore: "5/9",
          },
          prescriptions: [
            {
              medication: "Gel bôi nướu Orozyme",
              dosage: "1 cm gel",
              frequency: "1 lần / ngày",
              duration: "14 ngày",
              instructions: "Bôi dọc viền nướu mỗi tối sau ăn",
            },
          ],
        },
      ],
      diagnostics: [],
      carePlan: {
        planId: "plan-petcare-04",
        title: "Phác đồ vệ sinh nha khoa & dự phòng giun tim định kỳ",
        status: "active",
        adherencePct: 80,
        doctorNotes: "Lưu ý cảnh báo dị ứng Penicillin trên hồ sơ. Chải răng bằng gel enzyme mỗi tối.",
        tasksCount: 3,
      },
      verificationToken: "pawcare-rec-lu-2026-verified",
    },
    {
      id: "demo-miumiu-cat",
      name: "Miu Miu",
      species: "cat",
      breed: "Mèo Ta tam thể",
      gender: "female_spayed",
      birthDate: "2024-08-14",
      ageDisplay: "2 tuổi (Sinh: 14/08/2024)",
      weightKg: 3.5,
      microchip: "982000477665544",
      color: "Tam thể (Trắng - Vàng - Đen)",
      status: "up_to_date",
      statusText: "Đạt chuẩn: Đang theo dõi hậu triệt sản & tiết niệu",
      owner: {
        name: owner4.profile.fullName,
        phone: owner4.profile.phone,
        email: owner4.profile.email,
        address: owner4.profile.address,
      },
      allergies: ["Không ghi nhận dị ứng thuốc"],
      conditions: ["Hậu phẫu triệt sản ổn định, dự phòng búi lông & sỏi tiết niệu"],
      dietaryNotes: "Thức ăn kiểm soát búi lông & tiết niệu, khuyến khích uống nước qua đài phun.",
      vaccinations: [
        {
          id: "vax-miumiu-1",
          name: "Vắc-xin Dại (Rabisin)",
          brand: "Boehringer Ingelheim",
          batchNo: "RAB-2026-MM",
          adminDate: "2026-07-22",
          nextDue: "2027-07-22",
          veterinarian: "BS. Trần Thu Hà",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          status: "valid",
          isExportCertified: true,
        },
      ],
      encounters: [
        {
          id: "enc-miumiu-1",
          date: "2026-10-21",
          type: "surgery",
          title: "Tái khám sau triệt sản & Tư vấn dinh dưỡng tiết niệu",
          veterinarian: "BS. Trần Thu Hà",
          clinic: "Phòng Khám Thú Y PetCare · Quận 1",
          soapNotes: {
            subjective: "Tái khám ngày thứ 7 sau triệt sản, bé ăn uống tốt, vết mổ khô ráo.",
            objective: "Cân nặng 3.5kg, nhiệt độ 38.5°C. Vết khâu liền hoàn toàn, không sưng tấy.",
            assessment: "Hồi phục hoàn toàn sau triệt sản. Cần duy trì chế độ chống búi lông và sỏi tiết niệu.",
            plan: "Cắt chỉ ngoại khoa. Áp dụng phác đồ dinh dưỡng kiểm soát búi lông & tăng lượng nước uống.",
          },
          vitals: {
            weightKg: 3.5,
            tempC: 38.5,
            heartRateBpm: 148,
            respiratoryRateBpm: 26,
            bodyConditionScore: "5/9",
          },
          prescriptions: [],
        },
      ],
      diagnostics: [],
      carePlan: {
        planId: "plan-petcare-02",
        title: "Kế hoạch quản lý dinh dưỡng kiểm soát búi lông & phòng ngừa sỏi tiết niệu",
        status: "active",
        adherencePct: 60,
        doctorNotes: "Bổ sung gel tiêu búi lông 2 lần/tuần và duy trì ít nhất 2 bát nước sạch.",
        tasksCount: 7,
      },
      verificationToken: "pawcare-rec-miumiu-2026-verified",
    },
  ];

  const clinicPetRecords: Record<string, PetRecordData> = {};
  const ownerPets: Record<string, OwnerPetRecord> = {};
  const weightHistoryByPet: Record<string, WeightLogItem[]> = {};

  const ownerByPetId: Record<string, PortalOwnerAccount> = {
    "demo-bo-cat": owner1,
    "demo-mochi-dog": owner2,
    "demo-lu-dog": owner3,
    "demo-miumiu-cat": owner4,
  };

  for (const cp of clinicPetsList) {
    clinicPetRecords[cp.id] = cp;
    const ownerAcc = ownerByPetId[cp.id] || owner1;
    ownerPets[cp.id] = clinicPetToOwnerPet(cp, ownerAcc.id, ownerAcc.email);
    weightHistoryByPet[cp.id] = [
      {
        id: `w-init-${cp.id}`,
        date: todayStr,
        weightKg: cp.weightKg,
        note: "Cân nặng ghi nhận tại Phòng Khám Thú Y PetCare · Quận 1",
        createdAt: Date.now(),
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // 4. PAIRED APPOINTMENTS (All 4 Owners <-> Clinic Portal)
  // ---------------------------------------------------------------------------
  const appointments: PortalAppointment[] = [
    {
      id: "apt-demo-pending-01",
      ownerId: owner1.id,
      ownerEmail: owner1.email,
      petName: "Bơ",
      petCount: 1,
      pets: [
        {
          id: "demo-bo-cat",
          name: "Bơ",
          species: "cat",
          breed: "Mèo Anh lông ngắn (Golden)",
          age: "2 tuổi",
          birthDate: "2024-04-15",
          weightKg: 4.8,
          microchip: "981098102345678",
          allergies: ["Dị ứng đạm gia cầm (gà)", "Dễ viêm da cơ địa theo mùa"],
          service: "Khám da liễu & soi ký sinh trùng vi mô",
        },
      ],
      ownerName: owner1.profile.fullName,
      ownerPhone: owner1.profile.phone,
      clinicId: "petcare-d1",
      clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: "Khám da liễu & soi ký sinh trùng vi mô",
      date: todayStr,
      time: "14:30",
      doctor: "BS. Nguyễn Văn Cường",
      status: "pending",
      isPriority: true,
      notes:
        "Bé gãi nhiều vùng cổ và gốc tai 2 ngày nay, nghi viêm da dị ứng tiếp xúc. Chủ nuôi gửi yêu cầu đặt hẹn trực tuyến chờ phòng khám xác nhận.",
    },
    {
      id: "apt-demo-completed-02",
      ownerId: owner2.id,
      ownerEmail: owner2.email,
      petName: "Mochi",
      petCount: 1,
      pets: [
        {
          id: "demo-mochi-dog",
          name: "Mochi",
          species: "dog",
          breed: "Toy Poodle (Nâu đỏ)",
          age: "1.5 tuổi",
          birthDate: "2024-11-10",
          weightKg: 3.5,
          microchip: "981098109876543",
          allergies: [],
          service: "Tiêm phòng vắc-xin dại & 7 bệnh định kỳ",
        },
      ],
      ownerName: owner2.profile.fullName,
      ownerPhone: owner2.profile.phone,
      clinicId: "petcare-d1",
      clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: "Tiêm phòng vắc-xin dại & 7 bệnh định kỳ",
      date: todayStr,
      time: "09:00",
      doctor: "BS. Trần Thu Hà",
      status: "completed",
      isPriority: true,
      notes:
        "Đã hoàn thành khám lâm sàng & tiêm phòng vắc-xin Rabies + Vanguard Plus 5/L. Thân nhiệt 38.5°C, sức khỏe ổn định. Cấp chứng chỉ tiêm chủng điện tử thành công.",
    },
    {
      id: "apt-demo-declined-03",
      ownerId: owner3.id,
      ownerEmail: owner3.email,
      petName: "Lu",
      petCount: 1,
      pets: [
        {
          id: "demo-lu-dog",
          name: "Lu",
          species: "dog",
          breed: "Poodle Toy",
          age: "3 tuổi",
          birthDate: "2023-11-05",
          weightKg: 3.8,
          microchip: "982000411223344",
          allergies: ["Kháng sinh nhóm Penicillin"],
          service: "Phẫu thuật cạo vôi răng & nhổ răng sâu dưới gây mê",
        },
      ],
      ownerName: owner3.profile.fullName,
      ownerPhone: owner3.profile.phone,
      clinicId: "petcare-d1",
      clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: "Phẫu thuật cạo vôi răng & nhổ răng sâu dưới gây mê",
      date: todayStr,
      time: "11:00",
      doctor: "BS. Nguyễn Văn Cường",
      status: "canceled",
      isPriority: true,
      notes:
        "Từ chối lịch hẹn: Phòng mổ kín lịch phẫu thuật cấp cứu trưa nay. Phòng khám đã liên hệ chủ nuôi dời sang 09:00 sáng mai và dặn nhịn ăn 8 tiếng trước mổ.",
    },
    {
      id: "apt-demo-confirmed-04",
      ownerId: owner4.id,
      ownerEmail: owner4.email,
      petName: "Miu Miu",
      petCount: 1,
      pets: [
        {
          id: "demo-miumiu-cat",
          name: "Miu Miu",
          species: "cat",
          breed: "Mèo Ta tam thể",
          age: "2 tuổi",
          birthDate: "2024-08-14",
          weightKg: 3.5,
          microchip: "982000477665544",
          allergies: [],
          service: "Tái khám sau triệt sản & siêu âm tiết niệu",
        },
      ],
      ownerName: owner4.profile.fullName,
      ownerPhone: owner4.profile.phone,
      clinicId: "petcare-d1",
      clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: "Tái khám sau triệt sản & siêu âm tiết niệu",
      date: todayStr,
      time: "16:00",
      doctor: "BS. Trần Thu Hà",
      status: "confirmed",
      isPriority: true,
      notes: "Lịch hẹn ưu tiên gói Premium đã được Phòng Khám Thú Y PetCare · Quận 1 xác nhận.",
    },
  ];

  // ---------------------------------------------------------------------------
  // 5. PAIRED CARE PLANS (All 4 Premium Owners <-> Clinic Portal)
  // ---------------------------------------------------------------------------
  const basePlan1: CarePlanProposal = {
    ...INITIAL_SEED_CARE_PLANS[0],
    id: "plan-petcare-01",
    petId: "demo-bo-cat",
    petName: "Bơ",
    ownerName: owner1.profile.fullName,
  };

  const basePlan2: CarePlanProposal = {
    ...INITIAL_SEED_CARE_PLANS[1],
    id: "plan-petcare-02",
    petId: "demo-miumiu-cat",
    petName: "Miu Miu",
    ownerName: owner4.profile.fullName,
  };

  const basePlan3: CarePlanProposal = {
    id: "plan-petcare-03",
    petId: "demo-mochi-dog",
    petName: "Mochi",
    ownerName: owner2.profile.fullName,
    clinicId: "petcare-d1",
    clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
    doctorName: "BS. Nguyễn Văn Cường (Chuyên khoa Ngoại & Kiểm dịch Quốc tế)",
    diagnosis: "Phác đồ duy trì miễn dịch xuất cảnh & chăm sóc nha khoa dự phòng",
    status: "active",
    horizonMonths: 6,
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "2026-10-20T10:00:00Z",
    nextFollowUpDate: "2026-11-20",
    dietInstructions: "Thức ăn hạt cá hồi không ngũ cốc + 1 que gặm sạch răng mỗi tối.",
    generalNotes: "Duy trì NexGard Spectra định kỳ ngày 1 hàng tháng để bảo vệ giun tim và ký sinh trùng.",
    tasks: [
      {
        id: "task-mochi-d1",
        title: "Chải răng hoặc dùng que gặm enzyme làm sạch mảng bám",
        category: "hygiene",
        frequency: "daily",
        scheduleDescription: "Mỗi tối sau bữa ăn",
        dueDate: todayStr,
        vetVisitRequired: false,
        notes: "Giúp ngăn ngừa cao răng tái phát sau khi lấy cao răng siêu âm.",
        completed: true,
      },
      {
        id: "task-mochi-w1",
        title: "Kiểm tra tai, mắt và chải lông bằng lược mềm",
        category: "hygiene",
        frequency: "weekly",
        scheduleDescription: "Chủ nhật hàng tuần",
        dueDate: todayStr,
        vetVisitRequired: false,
        notes: "Giữ bộ lông Poodle thông thoáng, tránh rối lông vùng tai.",
        completed: true,
      },
      {
        id: "task-mochi-m1",
        title: "Uống viên nhai NexGard Spectra ngừa giun tim & ve rận",
        category: "treatment",
        frequency: "monthly",
        scheduleDescription: "Ngày 01 hàng tháng",
        dueDate: "2026-11-01",
        vetVisitRequired: false,
        notes: "Uống sau ăn no.",
        completed: false,
      },
    ],
  };

  const basePlan4: CarePlanProposal = {
    id: "plan-petcare-04",
    petId: "demo-lu-dog",
    petName: "Lu",
    ownerName: owner3.profile.fullName,
    clinicId: "petcare-d1",
    clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
    doctorName: "BS. Nguyễn Văn Cường (Chuyên khoa Nha khoa & Nội tổng quát)",
    diagnosis: "Phác đồ điều trị viêm nướu tiền phẫu & dự phòng giun tim (Lưu ý dị ứng Penicillin)",
    status: "active",
    horizonMonths: 3,
    createdAt: "2026-10-18T11:00:00Z",
    updatedAt: "2026-10-18T11:00:00Z",
    nextFollowUpDate: "2026-11-05",
    dietInstructions: "Ăn thức ăn mềm hoặc hạt ngâm ấm, tránh xương cứng gây tổn thương nướu.",
    generalNotes: "CẢNH BÁO Y KHOA: Bé dị ứng kháng sinh nhóm Penicillin. Chỉ sử dụng gel sát khuẩn tại chỗ theo toa.",
    tasks: [
      {
        id: "task-lu-d1",
        title: "Bôi gel sát khuẩn nướu Orozyme dọc hai bên hàm",
        category: "treatment",
        frequency: "daily",
        scheduleDescription: "Mỗi tối trước khi ngủ",
        dueDate: todayStr,
        vetVisitRequired: false,
        notes: "Không cho uống nước trong 30 phút sau khi bôi gel.",
        completed: true,
      },
      {
        id: "task-lu-w1",
        title: "Kiểm tra hơi thở và màu sắc nướu răng",
        category: "checkup",
        frequency: "weekly",
        scheduleDescription: "Thứ 7 hàng tuần",
        dueDate: todayStr,
        vetVisitRequired: false,
        notes: "Nếu nướu chảy máu hoặc sưng đỏ, nhắn tin ngay cho bác sĩ qua khung chat.",
        completed: false,
      },
      {
        id: "task-lu-m1",
        title: "Tái khám thực hiện lấy cao răng siêu âm dưới gây mê",
        category: "checkup",
        frequency: "monthly",
        scheduleDescription: "Lịch hẹn sáng 09:00",
        dueDate: "2026-11-05",
        vetVisitRequired: true,
        notes: "Nhịn ăn 8 tiếng trước khi đến phòng khám.",
        completed: false,
      },
    ],
  };

  return {
    version: STORE_VERSION,
    updatedAt: nowIso,
    ownerAccounts: {
      [owner1.id]: owner1,
      [owner2.id]: owner2,
      [owner3.id]: owner3,
      [owner4.id]: owner4,
    },
    clinicAccounts: {
      [clinicAccount.id]: clinicAccount,
    },
    ownerPets,
    clinicPetRecords,
    weightHistoryByPet,
    appointments,
    carePlans: [basePlan1, basePlan2, basePlan3, basePlan4],
    carePlanChats: {},
    activeSosLead: null,
    remindersByOwner: {},
    shareGrants: {},
  };
}

export function clinicPetToOwnerPet(
  cp: PetRecordData,
  ownerId: string,
  ownerEmail: string
): OwnerPetRecord {
  const genderMap: Record<string, "male" | "female" | "neutered"> = {
    male_neutered: "neutered",
    female_spayed: "neutered",
    male: "male",
    female: "female",
  };
  return {
    id: cp.id,
    ownerId,
    ownerEmail,
    ownerName: cp.owner.name,
    ownerPhone: cp.owner.phone,
    name: cp.name,
    species: cp.species,
    breed: cp.breed,
    gender: genderMap[cp.gender] || "male",
    age: cp.ageDisplay,
    birthDate: cp.birthDate,
    weightKg: cp.weightKg,
    microchip: cp.microchip,
    color: cp.color,
    medicalHistory: cp.conditions[0] || cp.statusText || "Sức khỏe ổn định",
    allergies: cp.allergies || [],
    conditions: cp.conditions || [],
    dietaryNotes: cp.dietaryNotes,
    isVaccinated: (cp.vaccinations || []).length > 0,
    vaccinations: (cp.vaccinations || []).map((v) => ({
      id: v.id,
      name: v.name,
      brand: v.brand,
      date: v.adminDate,
      nextDue: v.nextDue,
      lot: v.batchNo,
      clinic: v.clinic,
      veterinarian: v.veterinarian,
      status:
        v.status === "valid"
          ? "completed"
          : v.status === "due_soon"
          ? "due_soon"
          : "overdue",
      isExportCertified: v.isExportCertified,
    })),
    createdAt: "2026-10-01T08:00:00.000Z",
  };
}

export function ownerPetToClinicPet(
  op: OwnerPetRecord,
  existingClinicPet?: PetRecordData,
  ownerProfile?: PortalUserProfile
): PetRecordData {
  const vaxList: VaccineRecord[] = (op.vaccinations || []).map((v, idx) => ({
    id: v.id || `vax-${op.id}-${idx}`,
    name: v.name,
    brand: v.brand || "Boehringer Ingelheim",
    batchNo: v.lot || `LOT-2026-${idx + 1}`,
    adminDate: v.date || new Date().toISOString().split("T")[0],
    nextDue:
      v.nextDue ||
      new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    veterinarian: v.veterinarian || "BS. Nguyễn Văn Cường",
    clinic: v.clinic || "Phòng Khám Thú Y PetCare · Quận 1",
    status:
      v.status === "completed"
        ? "valid"
        : v.status === "due_soon"
        ? "due_soon"
        : "expired",
    isExportCertified:
      v.isExportCertified ??
      (v.name.toLowerCase().includes("dại") || v.name.toLowerCase().includes("rabies")),
  }));

  return {
    id: op.id,
    name: op.name,
    species: op.species === "cat" ? "cat" : "dog",
    breed: op.breed || (op.species === "cat" ? "Mèo nhà" : "Chó cưng"),
    gender:
      existingClinicPet?.gender ||
      (op.gender === "neutered"
        ? "male_neutered"
        : op.gender === "female"
        ? "female"
        : "male"),
    birthDate: op.birthDate || "2024-01-01",
    ageDisplay: op.age || "1 tuổi",
    weightKg: Number(op.weightKg) || existingClinicPet?.weightKg || 4.0,
    microchip:
      op.microchip ||
      existingClinicPet?.microchip ||
      `9810981${Math.floor(10000000 + Math.random() * 90000000)}`,
    color: op.color || existingClinicPet?.color || "Màu lông tự nhiên",
    status: existingClinicPet?.status || "up_to_date",
    statusText:
      existingClinicPet?.statusText ||
      (op.medicalHistory ? `Ghi chú: ${op.medicalHistory}` : "Đạt chuẩn: Hồ sơ đồng bộ từ Chủ nuôi"),
    owner: {
      name: ownerProfile?.fullName || op.ownerName || existingClinicPet?.owner.name || "Chủ nuôi PawCare",
      phone: ownerProfile?.phone || op.ownerPhone || existingClinicPet?.owner.phone || "0987 654 321",
      email: ownerProfile?.email || op.ownerEmail || existingClinicPet?.owner.email || "yen.le@pawcare.vn",
      address:
        ownerProfile?.address ||
        existingClinicPet?.owner.address ||
        "Quận 1, TP. Hồ Chí Minh",
    },
    allergies: op.allergies?.length ? op.allergies : existingClinicPet?.allergies || [],
    conditions: op.conditions?.length
      ? op.conditions
      : op.medicalHistory
      ? [op.medicalHistory]
      : existingClinicPet?.conditions || [],
    dietaryNotes:
      op.dietaryNotes ||
      existingClinicPet?.dietaryNotes ||
      "Khẩu phần dinh dưỡng thú y tiêu chuẩn.",
    vaccinations: vaxList.length > 0 ? vaxList : existingClinicPet?.vaccinations || [],
    encounters: existingClinicPet?.encounters || [],
    diagnostics: existingClinicPet?.diagnostics || [],
    carePlan: existingClinicPet?.carePlan,
    verificationToken:
      existingClinicPet?.verificationToken || `pawcare-rec-${op.id}-verified`,
  };
}

declare global {
  var __PAWCARE_PORTAL_DB__: PortalStateDatabase | undefined;
}

export function getPortalDatabase(): PortalStateDatabase {
  const filePath = getStoreFilePath();
  if (globalThis.__PAWCARE_PORTAL_DB__) {
    return globalThis.__PAWCARE_PORTAL_DB__;
  }

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as PortalStateDatabase;
      if (parsed && parsed.version === STORE_VERSION && parsed.ownerAccounts) {
        globalThis.__PAWCARE_PORTAL_DB__ = parsed;
        return parsed;
      }
    }
  } catch {}

  const initial = buildInitialPortalDatabase();
  globalThis.__PAWCARE_PORTAL_DB__ = initial;
  persistPortalDatabase(initial);
  return initial;
}

export function persistPortalDatabase(db: PortalStateDatabase): void {
  db.updatedAt = new Date().toISOString();
  globalThis.__PAWCARE_PORTAL_DB__ = db;
  const filePath = getStoreFilePath();
  try {
    const tmpFile = `${filePath}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpFile, filePath);
  } catch {
    try {
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf8");
    } catch {}
  }
}

export function resetPortalDatabase(): PortalStateDatabase {
  const fresh = buildInitialPortalDatabase();
  persistPortalDatabase(fresh);
  return fresh;
}

export function resolveOwnerAccount(
  identifier?: string | null
): PortalOwnerAccount {
  const db = getPortalDatabase();
  const clean = (identifier || "").trim().toLowerCase();
  if (clean) {
    if (db.ownerAccounts[clean]) return db.ownerAccounts[clean];
    for (const acc of Object.values(db.ownerAccounts)) {
      if (
        acc.id.toLowerCase() === clean ||
        acc.email.toLowerCase() === clean ||
        acc.aliases.some((a) => a.toLowerCase() === clean)
      ) {
        return acc;
      }
    }
  }
  return db.ownerAccounts["owner-premium-01"];
}

export function resolveClinicAccount(
  identifier?: string | null
): PortalClinicAccount {
  const db = getPortalDatabase();
  const clean = (identifier || "").trim().toLowerCase();
  if (clean) {
    if (db.clinicAccounts[clean]) return db.clinicAccounts[clean];
    for (const acc of Object.values(db.clinicAccounts)) {
      if (
        acc.id.toLowerCase() === clean ||
        acc.email.toLowerCase() === clean ||
        acc.aliases.some((a) => a.toLowerCase() === clean)
      ) {
        return acc;
      }
    }
  }
  return db.clinicAccounts["dev-clinic-id"];
}

export function upsertOwnerAccountOnAuth(params: {
  email: string;
  name?: string;
  password?: string;
  isSignUp?: boolean;
}): PortalOwnerAccount {
  const db = getPortalDatabase();
  const cleanEmail = params.email.trim().toLowerCase();

  for (const acc of Object.values(db.ownerAccounts)) {
    if (
      acc.email.toLowerCase() === cleanEmail ||
      acc.aliases.some((a) => a.toLowerCase() === cleanEmail)
    ) {
      if (params.name && params.isSignUp) {
        acc.profile.fullName = params.name.trim();
      }
      // Ensure all 4 paired accounts and demo owner accounts maintain premium status
      acc.plan = "premium";
      persistPortalDatabase(db);
      return acc;
    }
  }

  // Create a new persistent Premium owner account so newly signed-up users also get full persistence & pairing
  const newId = `owner-${Date.now()}`;
  const displayName = params.name?.trim() || cleanEmail.split("@")[0] || "Chủ nuôi PawCare";
  const newAcc: PortalOwnerAccount = {
    id: newId,
    email: cleanEmail,
    aliases: [cleanEmail],
    passwordHash: params.password || "Pawcare@2026",
    role: "owner",
    plan: "premium",
    onboardingCompleted: false,
    profile: {
      fullName: displayName,
      phone: "0903 123 456",
      email: cleanEmail,
      gender: "female",
      birthDate: "1998-05-18",
      city: "TP. Hồ Chí Minh",
      district: "Quận 1",
      address: "124 Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM",
      emergencyContact: "",
      updatedAt: new Date().toISOString(),
    },
    petIds: [],
    activePetId: "",
    createdAt: new Date().toISOString(),
  };
  db.ownerAccounts[newId] = newAcc;
  persistPortalDatabase(db);
  return newAcc;
}

export function upsertClinicAccountOnAuth(params: {
  email: string;
  name?: string;
  license?: string;
  isSignUp?: boolean;
}): PortalClinicAccount {
  const db = getPortalDatabase();
  const cleanEmail = params.email.trim().toLowerCase();

  for (const acc of Object.values(db.clinicAccounts)) {
    if (
      acc.email.toLowerCase() === cleanEmail ||
      acc.aliases.some((a) => a.toLowerCase() === cleanEmail)
    ) {
      if (params.name && params.isSignUp) {
        acc.name = params.name.trim();
        acc.profile.name = params.name.trim();
      }
      if (params.license) {
        acc.profile.licenseNumber = params.license.trim();
      }
      persistPortalDatabase(db);
      return acc;
    }
  }

  // Pair new clinic login with the main clinical database while storing its custom profile
  const mainClinic = db.clinicAccounts["dev-clinic-id"];
  if (!params.isSignUp) {
    return mainClinic;
  }

  const newId = `clinic-${Date.now()}`;
  const clinicName = params.name?.trim() || "Phòng Khám Thú Y PawCare Partner";
  const newClinic: PortalClinicAccount = {
    id: newId,
    email: cleanEmail,
    aliases: [cleanEmail],
    passwordHash: "Pawcare@2026",
    role: "clinic_admin",
    clinicId: `clinic-fac-${Date.now()}`,
    name: clinicName,
    onboardingCompleted: false,
    profile: {
      ...mainClinic.profile,
      id: `clinic-fac-${Date.now()}`,
      name: clinicName,
      licenseNumber: params.license?.trim() || mainClinic.profile.licenseNumber,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    },
    settings: { ...mainClinic.settings },
  };
  db.clinicAccounts[newId] = newClinic;
  persistPortalDatabase(db);
  return newClinic;
}

/**
 * Syncs Owner's `pawcare-user-pets` updates into the unified backend store
 * and projects changes into `clinicPetRecords` so the Clinic Portal is immediately updated.
 */
export function syncOwnerPetsToBackend(
  ownerIdentifier: string,
  pets: Array<Partial<OwnerPetRecord> & { id: string; name: string }>
): OwnerPetRecord[] {
  const db = getPortalDatabase();
  const ownerAcc = resolveOwnerAccount(ownerIdentifier);

  const nextPetIds: string[] = [];
  const savedPets: OwnerPetRecord[] = [];

  for (const raw of pets) {
    if (!raw || !raw.id || !raw.name) continue;
    const existingOwnerPet = db.ownerPets[raw.id];
    const existingClinicPet = db.clinicPetRecords[raw.id];

    const normalized: OwnerPetRecord = {
      id: raw.id,
      ownerId: ownerAcc.id,
      ownerEmail: ownerAcc.email,
      ownerName: ownerAcc.profile.fullName,
      ownerPhone: ownerAcc.profile.phone,
      name: raw.name,
      species: (raw.species as "dog" | "cat" | "other") || existingOwnerPet?.species || "dog",
      breed: raw.breed || existingOwnerPet?.breed || "Thú cưng",
      gender: (raw.gender as "male" | "female" | "neutered") || existingOwnerPet?.gender || "male",
      age: raw.age || existingOwnerPet?.age || "1 tuổi",
      birthDate: raw.birthDate || existingOwnerPet?.birthDate || "2024-01-01",
      weightKg: Number(raw.weightKg) || existingOwnerPet?.weightKg || 4.0,
      microchip:
        raw.microchip ||
        existingOwnerPet?.microchip ||
        existingClinicPet?.microchip ||
        `9810981${Math.floor(10000000 + Math.random() * 90000000)}`,
      color: raw.color || existingOwnerPet?.color || existingClinicPet?.color,
      medicalHistory:
        raw.medicalHistory ?? existingOwnerPet?.medicalHistory ?? "Sức khỏe ổn định",
      allergies: Array.isArray(raw.allergies)
        ? raw.allergies
        : existingOwnerPet?.allergies || [],
      conditions: Array.isArray(raw.conditions)
        ? raw.conditions
        : raw.medicalHistory
        ? [raw.medicalHistory]
        : existingOwnerPet?.conditions || [],
      dietaryNotes: raw.dietaryNotes || existingOwnerPet?.dietaryNotes,
      isVaccinated:
        raw.isVaccinated ??
        ((raw.vaccinations?.length ?? existingOwnerPet?.vaccinations?.length ?? 0) > 0),
      vaccinations: Array.isArray(raw.vaccinations)
        ? raw.vaccinations.map((v: any, idx: number) => ({
            id: v.id || `vax-${raw.id}-${idx}`,
            name: v.name || "Vắc-xin định kỳ",
            brand: v.brand || "Boehringer Ingelheim",
            date: v.date || v.adminDate || new Date().toISOString().split("T")[0],
            nextDue:
              v.nextDue ||
              new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
            lot: v.lot || v.batchNo || `LOT-2026-${idx + 1}`,
            clinic: v.clinic || "Phòng Khám Thú Y PetCare · Quận 1",
            veterinarian: v.veterinarian || "BS. Nguyễn Văn Cường",
            status:
              v.status === "valid" || v.status === "completed"
                ? "completed"
                : v.status === "due_soon"
                ? "due_soon"
                : "overdue",
            isExportCertified: v.isExportCertified,
          }))
        : existingOwnerPet?.vaccinations || [],
      notes: raw.notes ?? existingOwnerPet?.notes,
      createdAt: raw.createdAt || existingOwnerPet?.createdAt || new Date().toISOString(),
    };

    db.ownerPets[normalized.id] = normalized;
    db.clinicPetRecords[normalized.id] = ownerPetToClinicPet(
      normalized,
      existingClinicPet,
      ownerAcc.profile
    );
    nextPetIds.push(normalized.id);
    savedPets.push(normalized);
  }

  // Handle deleted pets for this owner
  for (const oldId of ownerAcc.petIds) {
    if (!nextPetIds.includes(oldId) && nextPetIds.length > 0) {
      delete db.ownerPets[oldId];
      delete db.clinicPetRecords[oldId];
    }
  }

  ownerAcc.petIds = nextPetIds;
  ownerAcc.onboardingCompleted = nextPetIds.length > 0 || ownerAcc.onboardingCompleted;
  if (nextPetIds.length > 0 && !nextPetIds.includes(ownerAcc.activePetId)) {
    ownerAcc.activePetId = nextPetIds[0];
  }

  persistPortalDatabase(db);
  return savedPets;
}

/**
 * Syncs Clinic's `pawcare-clinic-pet-records` updates into the unified backend store
 * and projects changes (vaccines, SOAP notes, weight, conditions, new patients) back to Owner Portal.
 */
export function syncClinicPetsToBackend(clinicPets: PetRecordData[]): PetRecordData[] {
  const db = getPortalDatabase();

  for (const cp of clinicPets) {
    if (!cp || !cp.id || !cp.name) continue;
    db.clinicPetRecords[cp.id] = cp;

    // Match owner by existing pet ownership, email, phone, or full name
    let matchedOwner: PortalOwnerAccount | undefined;
    const existingOwnerPet = db.ownerPets[cp.id];
    if (existingOwnerPet && db.ownerAccounts[existingOwnerPet.ownerId]) {
      matchedOwner = db.ownerAccounts[existingOwnerPet.ownerId];
    }
    if (!matchedOwner) {
      const targetEmail = (cp.owner?.email || "").trim().toLowerCase();
      const targetName = (cp.owner?.name || "").trim().toLowerCase();
      const targetPhone = (cp.owner?.phone || "").replace(/\s+/g, "");
      for (const acc of Object.values(db.ownerAccounts)) {
        if (
          (targetEmail &&
            (acc.email.toLowerCase() === targetEmail ||
              acc.aliases.some((a) => a.toLowerCase() === targetEmail))) ||
          (targetName && acc.profile.fullName.toLowerCase() === targetName) ||
          (targetPhone && acc.profile.phone.replace(/\s+/g, "") === targetPhone)
        ) {
          matchedOwner = acc;
          break;
        }
      }
    }
    if (!matchedOwner) {
      matchedOwner = db.ownerAccounts["owner-premium-01"];
    }

    const projectedOwnerPet = clinicPetToOwnerPet(cp, matchedOwner.id, matchedOwner.email);
    db.ownerPets[cp.id] = projectedOwnerPet;
    if (!matchedOwner.petIds.includes(cp.id)) {
      matchedOwner.petIds.push(cp.id);
    }
    if (!matchedOwner.activePetId) {
      matchedOwner.activePetId = cp.id;
    }
  }

  persistPortalDatabase(db);
  return Object.values(db.clinicPetRecords);
}

/**
 * Syncs appointments modified by either Owner Portal or Clinic Portal.
 */
export function syncAppointmentsToBackend(
  incomingAppointments: PortalAppointment[],
  actorOwnerIdentifier?: string
): PortalAppointment[] {
  const db = getPortalDatabase();
  const ownerAcc = actorOwnerIdentifier ? resolveOwnerAccount(actorOwnerIdentifier) : null;

  const byId = new Map<string, PortalAppointment>();
  for (const existing of db.appointments) {
    byId.set(existing.id, existing);
  }

  for (const apt of incomingAppointments) {
    if (!apt || !apt.id) continue;
    const prev = byId.get(apt.id);
    const merged: PortalAppointment = {
      ...prev,
      ...apt,
      ownerId: apt.ownerId || prev?.ownerId || ownerAcc?.id,
      ownerEmail: apt.ownerEmail || prev?.ownerEmail || ownerAcc?.email,
      ownerName: apt.ownerName || prev?.ownerName || ownerAcc?.profile.fullName || "Chủ nuôi PawCare",
      ownerPhone: apt.ownerPhone || prev?.ownerPhone || ownerAcc?.profile.phone || "0987 654 321",
      clinicId: apt.clinicId || prev?.clinicId || "petcare-d1",
    };
    byId.set(merged.id, merged);
  }

  db.appointments = Array.from(byId.values());
  persistPortalDatabase(db);
  return db.appointments;
}

/**
 * Syncs Care Plans modified by either Clinic Portal (new/edited/deleted plan)
 * or Owner Portal (approving plan, checking off tasks).
 */
export function syncCarePlansToBackend(
  incomingPlans: CarePlanProposal[],
  replaceAll = false,
  actorRole: "owner" | "clinic" = "clinic"
): CarePlanProposal[] {
  const db = getPortalDatabase();

  if (replaceAll && actorRole === "clinic") {
    db.carePlans = incomingPlans;
  } else {
    const byId = new Map<string, CarePlanProposal>();
    for (const p of db.carePlans) byId.set(p.id, p);
    for (const p of incomingPlans) {
      if (!p || !p.id) continue;
      byId.set(p.id, p);
    }
    db.carePlans = Array.from(byId.values());
  }

  // Also reflect care plan status & adherence into clinicPetRecords
  for (const plan of db.carePlans) {
    const totalTasks = plan.tasks?.length || 0;
    const completedTasks = (plan.tasks || []).filter((t) => t.completed).length;
    const adherencePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 85;

    for (const cp of Object.values(db.clinicPetRecords)) {
      if (
        cp.id === plan.petId ||
        cp.name.toLowerCase() === plan.petName.toLowerCase()
      ) {
        cp.carePlan = {
          planId: plan.id,
          title: plan.diagnosis,
          status: plan.status === "completed" ? "completed" : "active",
          adherencePct,
          doctorNotes: plan.generalNotes || plan.dietInstructions || "",
          tasksCount: totalTasks,
        };
      }
    }
  }

  persistPortalDatabase(db);
  return db.carePlans;
}

export function getScopedPortalState(params: {
  userId?: string | null;
  email?: string | null;
  role?: AppRole | null;
}) {
  const db = getPortalDatabase();
  const role = params.role || "owner";

  if (role === "clinic_admin" || role === "clinic_staff") {
    const clinicAcc = resolveClinicAccount(params.email || params.userId);
    return {
      role,
      updatedAt: db.updatedAt,
      clinicAccount: clinicAcc,
      clinicProfile: clinicAcc.profile,
      clinicSettings: clinicAcc.settings,
      clinicPetRecords: Object.values(db.clinicPetRecords),
      appointments: db.appointments,
      carePlans: db.carePlans,
      carePlanChats: db.carePlanChats,
      activeSosLead: db.activeSosLead,
      premiumOwners: Object.values(db.ownerAccounts).map((o) => ({
        id: o.id,
        email: o.email,
        fullName: o.profile.fullName,
        phone: o.profile.phone,
        district: o.profile.district,
        plan: o.plan,
        petIds: o.petIds,
      })),
    };
  }

  const ownerAcc = resolveOwnerAccount(params.email || params.userId);
  const ownerPets = ownerAcc.petIds
    .map((pid) => db.ownerPets[pid])
    .filter(Boolean);
  const ownerPetIdSet = new Set(ownerAcc.petIds);
  const ownerPetNameSet = new Set(ownerPets.map((p) => p.name.trim().toLowerCase()));
  const ownerNameLower = ownerAcc.profile.fullName.trim().toLowerCase();
  const ownerEmailLower = ownerAcc.email.trim().toLowerCase();

  // Filter appointments strictly belonging to this authenticated owner or their pets
  const scopedAppointments = db.appointments.filter((apt) => {
    if (apt.ownerId && apt.ownerId === ownerAcc.id) return true;
    if (apt.ownerEmail && apt.ownerEmail.trim().toLowerCase() === ownerEmailLower) return true;
    if (apt.ownerName && apt.ownerName.trim().toLowerCase() === ownerNameLower) return true;
    if (apt.petName && ownerPetNameSet.has(apt.petName.trim().toLowerCase())) return true;
    if (Array.isArray(apt.pets) && apt.pets.some((p) => ownerPetIdSet.has(p.id))) return true;
    return false;
  });

  // Filter care plans strictly belonging to this authenticated owner or their pets
  const scopedCarePlans = db.carePlans.filter((plan) => {
    if (ownerPetIdSet.has(plan.petId)) return true;
    if (plan.petName && ownerPetNameSet.has(plan.petName.trim().toLowerCase())) return true;
    if (plan.ownerName && plan.ownerName.trim().toLowerCase() === ownerNameLower) return true;
    return false;
  });

  const weightHistory: Record<string, WeightLogItem[]> = {};
  for (const p of ownerPets) {
    if (db.weightHistoryByPet[p.id]) {
      weightHistory[p.id] = db.weightHistoryByPet[p.id];
    }
  }

  return {
    role: "owner" as const,
    updatedAt: db.updatedAt,
    ownerAccount: ownerAcc,
    plan: ownerAcc.plan,
    userProfile: ownerAcc.profile,
    userPets: ownerPets,
    activePetId: ownerAcc.activePetId || ownerPets[0]?.id || "",
    weightHistory,
    appointments: scopedAppointments,
    carePlans: scopedCarePlans,
    carePlanChats: db.carePlanChats,
    activeSosLead: db.activeSosLead,
    reminders: db.remindersByOwner[ownerAcc.id] || null,
    clinicProfile: db.clinicAccounts["dev-clinic-id"]?.profile || null,
    premiumOwners: Object.values(db.ownerAccounts).map((o) => ({
      id: o.id,
      email: o.email,
      fullName: o.profile.fullName,
      phone: o.profile.phone,
      district: o.profile.district,
      plan: o.plan,
      petIds: o.petIds,
    })),
  };
}
