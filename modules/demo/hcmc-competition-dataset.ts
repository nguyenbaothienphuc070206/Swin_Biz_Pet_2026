export interface HcmcClinic {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  chiefVet: string;
  licenseNumber: string;
  lat: number;
  lng: number;
  rating: number;
  is247: boolean;
  specialties: string[];
}

export interface DemoPetRecord {
  id: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  gender: "male" | "female";
  birthDate: string;
  weightKg: number;
  microchip: string;
  ownerName: string;
  ownerPhone: string;
  ownerDistrict: string;
  rabiesValid: boolean;
  rabiesAdministeredAt?: string;
  rabiesExpiresAt?: string;
  rabiesLot?: string;
  rabiesClinic?: string;
  vaccinations: Array<{
    name: string;
    lot: string;
    date: string;
    nextDue?: string;
    clinic: string;
    vetName?: string;
    verified: boolean;
  }>;
  prescriptions?: Array<{
    name: string;
    dose: string;
    instructions: string;
    startedAt: string;
    verified: boolean;
  }>;
  allergies?: string[];
  conditions?: string[];
}

export const HCMC_POC_CLINICS: HcmcClinic[] = [
  {
    id: "vetcare-d3",
    name: "Phòng Khám Thú Y & Spa Bác Sĩ Tâm · Quận 3",
    address: "45 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM",
    district: "Quận 3",
    phone: "028 3931 5566",
    chiefVet: "BS. CKI Nguyễn Văn Tâm",
    licenseNumber: "79-TY-00412/HCM",
    lat: 10.7821,
    lng: 106.6866,
    rating: 4.8,
    is247: false,
    specialties: ["Tiêm phòng vắc-xin", "Nha khoa thú y", "Da liễu & xét nghiệm"],
  },
  {
    id: "2pet-d1",
    name: "Bệnh Viện Thú Y 2Pet 24/7 · Quận 1",
    address: "182 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM",
    district: "Quận 1",
    phone: "028 3822 9988",
    chiefVet: "ThS. BS Trần Minh Trí",
    licenseNumber: "79-TY-00108/HCM",
    lat: 10.7854,
    lng: 106.6982,
    rating: 4.9,
    is247: true,
    specialties: ["Cấp cứu 24/7", "Phẫu thuật ngoại khoa", "Chẩn đoán hình ảnh"],
  },
  {
    id: "petcare-d2",
    name: "Phòng Khám Thú Y PetCare An Phú · TP. Thủ Đức",
    address: "12 Song Hành, Phường An Phú, TP. Thủ Đức, TP.HCM",
    district: "TP. Thủ Đức",
    phone: "028 3744 2505",
    chiefVet: "BS. Huỳnh Thị Bích Ngọc",
    licenseNumber: "79-TY-00588/HCM",
    lat: 10.8012,
    lng: 106.7456,
    rating: 4.7,
    is247: false,
    specialties: ["Khám tổng quát", "Tiêm chủng chuẩn quốc tế", "Khách sạn thú cưng"],
  },
  {
    id: "samipet-binhthanh",
    name: "Bệnh Viện Thú Y Samipet · Bình Thạnh",
    address: "88 Bạch Đằng, Phường 24, Quận Bình Thạnh, TP.HCM",
    district: "Bình Thạnh",
    phone: "028 3511 8822",
    chiefVet: "BS. Lê Quốc Dũng",
    licenseNumber: "79-TY-00334/HCM",
    lat: 10.8034,
    lng: 106.7102,
    rating: 4.8,
    is247: true,
    specialties: ["Nội soi tiêu hóa", "Tiêm phòng", "Lọc máu & Hồi sức"],
  },
  {
    id: "vietpet-d7",
    name: "Phòng Khám Thú Y VietPet Care · Quận 7",
    address: "104 Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP.HCM",
    district: "Quận 7",
    phone: "028 5413 7799",
    chiefVet: "BS. Vũ Thị Hồng Hạnh",
    licenseNumber: "79-TY-00812/HCM",
    lat: 10.7324,
    lng: 106.7188,
    rating: 4.7,
    is247: false,
    specialties: ["Chăm sóc sơ sinh", "Tiêm phòng dại & 7 bệnh", "Spa y khoa"],
  },
  {
    id: "procare-tanbinh",
    name: "Phòng Khám Thú Y ProCare · Tân Bình",
    address: "32 Hoàng Hoa Thám, Phường 12, Quận Tân Bình, TP.HCM",
    district: "Tân Bình",
    phone: "028 3811 4455",
    chiefVet: "BS. Đỗ Quang Huy",
    licenseNumber: "79-TY-00623/HCM",
    lat: 10.7989,
    lng: 106.6488,
    rating: 4.6,
    is247: false,
    specialties: ["Nha khoa", "Tiêm phòng định kỳ", "Điều trị ve rận"],
  },
  {
    id: "phuongnam-d10",
    name: "Bệnh Viện Thú Y Phương Nam · Quận 10",
    address: "246 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM",
    district: "Quận 10",
    phone: "028 3866 1234",
    chiefVet: "ThS. BS Phạm Hải Đăng",
    licenseNumber: "79-TY-00277/HCM",
    lat: 10.7689,
    lng: 106.6578,
    rating: 4.8,
    is247: true,
    specialties: ["Cấp cứu chuyên sâu", "Chẩn đoán hình ảnh CT/X-quang", "Y bạ số"],
  },
  {
    id: "saigonpet-d5",
    name: "Phòng Khám Thú Y Sài Gòn Pet · Quận 5",
    address: "56 Trần Hưng Đạo, Phường 7, Quận 5, TP.HCM",
    district: "Quận 5",
    phone: "028 3923 6688",
    chiefVet: "BS. Lưu Gia Bảo",
    licenseNumber: "79-TY-00199/HCM",
    lat: 10.7523,
    lng: 106.6712,
    rating: 4.7,
    is247: false,
    specialties: ["Tiêm phòng cho mèo", "Khám nội khoa", "Cắt tỉa lông y tế"],
  },
];

export const DEMO_PETS_20: DemoPetRecord[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    name: "Mochi",
    species: "dog",
    breed: "Corgi Wales Pembroke",
    gender: "male",
    birthDate: "2022-03-15",
    weightKg: 11.5,
    microchip: "982000412345678",
    ownerName: "Trần Anh Khoa",
    ownerPhone: "0912 345 678",
    ownerDistrict: "Quận 1, TP.HCM",
    rabiesValid: true,
    rabiesAdministeredAt: "2026-06-15",
    rabiesExpiresAt: "2027-06-15",
    rabiesLot: "RAB-2026-X1",
    rabiesClinic: "Phòng Khám Thú Y Bác Sĩ Tâm · Quận 3",
    vaccinations: [
      {
        name: "Rabisin (Vắc-xin phòng bệnh dại)",
        lot: "RAB-2026-X1",
        date: "2026-06-15",
        nextDue: "2027-06-15",
        clinic: "Phòng Khám Thú Y Bác Sĩ Tâm · Quận 3",
        vetName: "BS. Nguyễn Văn Tâm",
        verified: true,
      },
      {
        name: "Vanguard Plus 5/CV-L (Vắc-xin 7 bệnh chó)",
        lot: "VG7-2026-09",
        date: "2026-06-15",
        nextDue: "2027-06-15",
        clinic: "Phòng Khám Thú Y Bác Sĩ Tâm · Quận 3",
        verified: true,
      },
      {
        name: "Xổ giun Drontal Plus",
        lot: "DRT-2026-P9",
        date: "2026-09-01",
        nextDue: "2026-12-01",
        clinic: "Tự uống tại nhà",
        verified: false,
      },
    ],
    prescriptions: [
      {
        name: "NexGard Spectra 7.5-15kg",
        dose: "1 viên nhai",
        instructions: "Uống định kỳ phòng ve rận & giun tim",
        startedAt: "2026-09-10",
        verified: true,
      },
    ],
    allergies: ["Dị ứng đạm bò"],
    conditions: ["Viêm da tiếp xúc cơ địa nhẹ"],
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    name: "Bơ",
    species: "cat",
    breed: "Mèo Anh lông ngắn (Golden NY12)",
    gender: "female",
    birthDate: "2023-01-20",
    weightKg: 4.3,
    microchip: "982000499887766",
    ownerName: "Lê Hoàng Yến",
    ownerPhone: "0987 654 321",
    ownerDistrict: "Quận 3, TP.HCM",
    rabiesValid: true,
    rabiesAdministeredAt: "2026-05-10",
    rabiesExpiresAt: "2027-05-10",
    rabiesLot: "DEF-2026-Z3",
    rabiesClinic: "Bệnh Viện Thú Y 2Pet 24/7 · Quận 1",
    vaccinations: [
      {
        name: "Defensor 3 (Phòng Dại Mèo)",
        lot: "DEF-2026-Z3",
        date: "2026-05-10",
        nextDue: "2027-05-10",
        clinic: "Bệnh Viện Thú Y 2Pet 24/7 · Quận 1",
        verified: true,
      },
      {
        name: "Felocell 4 (Phòng 4 bệnh mèo)",
        lot: "FEL4-2026-15",
        date: "2026-05-10",
        nextDue: "2027-05-10",
        clinic: "Bệnh Viện Thú Y 2Pet 24/7 · Quận 1",
        verified: true,
      },
    ],
    allergies: ["Nhạy cảm với hải sản tươi"],
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    name: "Lu",
    species: "dog",
    breed: "Poodle Toy (Nâu đỏ)",
    gender: "male",
    birthDate: "2021-11-05",
    weightKg: 3.8,
    microchip: "982000411223344",
    ownerName: "Phạm Minh Đức",
    ownerPhone: "0903 112 233",
    ownerDistrict: "Bình Thạnh, TP.HCM",
    rabiesValid: false, // Expired rabies for bite-victim testing!
    rabiesAdministeredAt: "2025-02-01",
    rabiesExpiresAt: "2026-02-01",
    rabiesLot: "RAB-2025-OLD",
    rabiesClinic: "Phòng Khám Cũ",
    vaccinations: [
      {
        name: "Rabisin (Hết hạn)",
        lot: "RAB-2025-OLD",
        date: "2025-02-01",
        nextDue: "2026-02-01",
        clinic: "Phòng Khám Cũ",
        verified: true,
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    name: "Miu Miu",
    species: "cat",
    breed: "Mèo Ta tam thể",
    gender: "female",
    birthDate: "2022-08-14",
    weightKg: 3.5,
    microchip: "982000477665544",
    ownerName: "Nguyễn Thu Trang",
    ownerPhone: "0934 889 900",
    ownerDistrict: "Quận 10, TP.HCM",
    rabiesValid: true,
    rabiesAdministeredAt: "2026-07-22",
    rabiesExpiresAt: "2027-07-22",
    rabiesLot: "RAB-2026-MM",
    rabiesClinic: "Bệnh Viện Thú Y Phương Nam · Quận 10",
    vaccinations: [
      {
        name: "Rabisin (Phòng Dại)",
        lot: "RAB-2026-MM",
        date: "2026-07-22",
        nextDue: "2027-07-22",
        clinic: "Bệnh Viện Thú Y Phương Nam · Quận 10",
        verified: true,
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    name: "Gấu",
    species: "dog",
    breed: "Golden Retriever",
    gender: "male",
    birthDate: "2020-05-18",
    weightKg: 31.0,
    microchip: "982000433445566",
    ownerName: "Đặng Hữu Phúc",
    ownerPhone: "0909 778 899",
    ownerDistrict: "Quận 7, TP.HCM",
    rabiesValid: true,
    rabiesAdministeredAt: "2026-04-05",
    rabiesExpiresAt: "2027-04-05",
    rabiesLot: "RAB-2026-G5",
    rabiesClinic: "Phòng Khám Thú Y VietPet Care · Quận 7",
    vaccinations: [
      {
        name: "Rabisin phòng dại",
        lot: "RAB-2026-G5",
        date: "2026-04-05",
        nextDue: "2027-04-05",
        clinic: "Phòng Khám Thú Y VietPet Care · Quận 7",
        verified: true,
      },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    name: "Simba",
    species: "cat",
    breed: "Mèo Ba Tư (Persian)",
    gender: "male",
    birthDate: "2021-09-12",
    weightKg: 4.8,
    microchip: "982000455667788",
    ownerName: "Hoàng Gia Bảo",
    ownerPhone: "0915 223 344",
    ownerDistrict: "Tân Bình, TP.HCM",
    rabiesValid: true,
    vaccinations: [],
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    name: "Đậu Đậu",
    species: "dog",
    breed: "Phốc Sóc (Pomeranian)",
    gender: "female",
    birthDate: "2023-04-10",
    weightKg: 2.6,
    microchip: "982000466778899",
    ownerName: "Vũ Hải Yến",
    ownerPhone: "0938 123 789",
    ownerDistrict: "Quận 3, TP.HCM",
    rabiesValid: true,
    vaccinations: [],
  },
  {
    id: "30000000-0000-4000-8000-000000000008",
    name: "Kem",
    species: "cat",
    breed: "Mèo Scottish Fold (Tai cụp)",
    gender: "female",
    birthDate: "2022-12-01",
    weightKg: 3.9,
    microchip: "982000477889900",
    ownerName: "Dương Quốc Anh",
    ownerPhone: "0908 654 987",
    ownerDistrict: "TP. Thủ Đức",
    rabiesValid: true,
    vaccinations: [],
  },
  {
    id: "30000000-0000-4000-8000-000000000009",
    name: "Chó Vàng",
    species: "dog",
    breed: "Chó Cỏ Bản Địa (Chó Lài)",
    gender: "male",
    birthDate: "2019-06-25",
    weightKg: 16.5,
    microchip: "982000488990011",
    ownerName: "Bác Sáu Vườn",
    ownerPhone: "0972 334 455",
    ownerDistrict: "Bình Chánh, TP.HCM",
    rabiesValid: true,
    vaccinations: [],
  },
  {
    id: "30000000-0000-4000-8000-000000000010",
    name: "Sushi",
    species: "dog",
    breed: "Shiba Inu",
    gender: "female",
    birthDate: "2021-07-30",
    weightKg: 9.8,
    microchip: "982000499001122",
    ownerName: "Ngô Nhật Linh",
    ownerPhone: "0945 667 788",
    ownerDistrict: "Quận 1, TP.HCM",
    rabiesValid: true,
    vaccinations: [],
  },
  // Pets 11-20
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `30000000-0000-4000-8000-0000000000${11 + i}`,
    name: `Bé Cưng ${11 + i}`,
    species: (i % 2 === 0 ? "dog" : "cat") as "dog" | "cat",
    breed: i % 2 === 0 ? "Chó Corgi lai" : "Mèo Xiêm",
    gender: (i % 3 === 0 ? "female" : "male") as "female" | "male",
    birthDate: `202${i % 4}-0${(i % 9) + 1}-15`,
    weightKg: 4.5 + i * 1.2,
    microchip: `9820004000000${11 + i}`,
    ownerName: `Chủ nuôi HCMC ${11 + i}`,
    ownerPhone: `0901 000 0${11 + i}`,
    ownerDistrict: "TP. Hồ Chí Minh",
    rabiesValid: i % 4 !== 0,
    vaccinations: [
      {
        name: "Vắc-xin phòng dại Rabisin",
        lot: `RAB-2026-${11 + i}`,
        date: "2026-05-15",
        nextDue: "2027-05-15",
        clinic: "Phòng Khám Thú Y PawCare Partner",
        verified: true,
      },
    ],
  })),
];

