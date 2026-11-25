/**
 * PawCare Dynamic Multi-language Data Normalizer
 * Seamlessly localizes dynamic records (Medical records, Appointments, Care Plans, Pets, Vaccines, Clinics)
 * when toggling between Vietnamese ('vi') and English ('en').
 */

import type { Appointment, BookedPetDetail } from "@/components/owner/appointments-manager";
import type { PetRecord } from "@/components/owner/pet-passport-view";
import type { CarePlanProposal, CareTaskItem } from "@/modules/careplans/types";
import { getFallbackClinics, type ClinicDetail } from "@/modules/clinics/mock-clinics";

// ==================== BREED TRANSLATIONS ====================
const BREED_PAIRS: Array<[string, string]> = [
  ["Corgi Wales", "Welsh Corgi"],
  ["Corgi", "Welsh Corgi"],
  ["Mèo Anh lông ngắn", "British Shorthair"],
  ["Mèo Anh lông dài", "British Longhair"],
  ["Mèo nhà", "Domestic Cat"],
  ["Mèo cưng", "Domestic Cat"],
  ["Chó nhà", "Domestic Dog"],
  ["Chó cưng", "Domestic Dog"],
  ["Thú cưng", "Companion Pet"],
  ["Mèo Ba Tư", "Persian Cat"],
  ["Chó Poodle", "Poodle"],
  ["Poodle", "Poodle"],
  ["Golden Retriever", "Golden Retriever"],
  ["Chó Golden", "Golden Retriever"],
  ["Chó Phốc Sóc", "Pomeranian"],
  ["Phốc Sóc", "Pomeranian"],
  ["Mèo Xiêm", "Siamese Cat"],
  ["Mèo Tai cụp", "Scottish Fold"],
  ["Chó Husky", "Siberian Husky"],
  ["Chó Alaska", "Alaskan Malamute"],
  ["Chó Pug", "Pug"],
  ["Mèo Sphynx", "Sphynx Cat"],

  // Native & Popular Dogs
  ["Chó Cỏ / Chó Ta (Bản địa)", "Vietnam Native Dog"],
  ["Chó Cỏ", "Vietnam Native Dog"],
  ["Chó Ta", "Vietnam Native Dog"],
  ["Chó Phú Quốc (Xoáy lưng)", "Phu Quoc Ridgeback"],
  ["Chó Phú Quốc", "Phu Quoc Ridgeback"],
  ["Chó H'Mông cộc đuôi", "H'Mong Bobtail Dog"],
  ["Chó Bắc Hà", "Bac Ha Dog"],
  ["Chó Lạp Xưởng (Dachshund)", "Dachshund"],
  ["Chó Lạp Xưởng", "Dachshund"],
  ["Chó Đốm (Dalmatian)", "Dalmatian"],
  ["Chó Đốm", "Dalmatian"],
  ["Phốc Hươu (Miniature Pinscher)", "Miniature Pinscher"],
  ["Phốc Hươu", "Miniature Pinscher"],
  ["Bull Pháp (French Bulldog)", "French Bulldog"],
  ["Chó Bull Pháp", "French Bulldog"],

  // Cats
  ["Mèo Ta / Mèo Mướp (Bản địa)", "Domestic Shorthair (Mướp)"],
  ["Mèo Ta", "Domestic Cat"],
  ["Mèo Mướp", "Domestic Shorthair (Mướp)"],
  ["Mèo Vàng (Domestic)", "Domestic Yellow Cat"],
  ["Mèo Vàng", "Domestic Yellow Cat"],
  ["Mèo Tam Thể (Calico)", "Calico Cat"],
  ["Mèo Tam Thể", "Calico Cat"],
  ["Mèo Chân ngắn Munchkin", "Munchkin Cat"],
  ["Mèo Chân ngắn", "Munchkin Cat"],
  ["Mèo Mũi tẹt Exotic", "Exotic Shorthair"],
  ["Mèo Rừng Na Uy", "Norwegian Forest Cat"],
  ["Mèo Nga mắt xanh (Russian Blue)", "Russian Blue"],

  // Other Legal Pets in Vietnam
  ["Thỏ Minilop (Tai cụp Hà Lan)", "Minilop Rabbit"],
  ["Thỏ Minilop", "Minilop Rabbit"],
  ["Thỏ Netherland Dwarf (Tai ngắn)", "Netherland Dwarf Rabbit"],
  ["Thỏ Netherland Dwarf", "Netherland Dwarf Rabbit"],
  ["Thỏ Lionhead (Sư tử)", "Lionhead Rabbit"],
  ["Thỏ Lionhead", "Lionhead Rabbit"],
  ["Thỏ New Zealand trắng", "New Zealand White Rabbit"],
  ["Thỏ New Zealand", "New Zealand White Rabbit"],
  ["Thỏ Angora (Lông xù)", "Angora Rabbit"],
  ["Thỏ Angora", "Angora Rabbit"],
  ["Chuột Hamster Bear (Syrian)", "Syrian Hamster (Bear)"],
  ["Chuột Hamster Winter White", "Winter White Hamster"],
  ["Chuột Hamster Robo (Roborovski)", "Roborovski Hamster"],
  ["Chuột Hamster Campbell", "Campbell Hamster"],
  ["Bọ ú / Chuột lang lông ngắn (American)", "American Guinea Pig"],
  ["Bọ ú / Chuột lang lông xoắn (Abyssinian)", "Abyssinian Guinea Pig"],
  ["Bọ ú / Chuột lang Peruvian (Lông dài)", "Peruvian Guinea Pig"],
  ["Sóc Chinchilla (Sinh sản hợp pháp)", "Chinchilla (Captive-bred)"],
  ["Nhím kiểng châu Phi (African Pygmy)", "African Pygmy Hedgehog"],
  ["Nhím kiểng", "Pet Hedgehog"],
  ["Vẹt Yến Phụng (Budgerigar)", "Budgerigar (Parakeet)"],
  ["Vẹt Cockatiel (Vẹt Mã Lai)", "Cockatiel"],
  ["Vẹt Lovebird (Vẹt Mẫu Đơn)", "Lovebird"],
  ["Chim Yến hót (Canary)", "Canary Bird"],
  ["Chim Manh Manh (Zebra Finch)", "Zebra Finch"],
  ["Bồ câu cảnh (Fancy Pigeon)", "Fancy Pigeon"],
  ["Rồng Úc (Bearded Dragon - Nhân tạo)", "Bearded Dragon (Captive-bred)"],
  ["Tắc kè da báo (Leopard Gecko - Nhân tạo)", "Leopard Gecko (Captive-bred)"],
  ["Rùa cạn cảnh hợp pháp (Sulcata / Herman)", "Sulcata Tortoise (Captive-bred)"],
  ["Cá Betta / Cá Xiêm", "Betta Fish (Siamese Fighting)"],
  ["Cá Bảy màu (Guppy)", "Guppy Fish"],
  ["Cá Vàng / Ba đuôi", "Goldfish"],
  ["Cá Koi cảnh", "Koi Fish"],
  ["Cá Dĩa (Discus)", "Discus Fish"],
];

export function localizeBreed(breed?: string, species?: string, isEn: boolean = false): string {
  if (!breed || breed.trim() === "") {
    if (species === "cat") return isEn ? "Domestic Cat" : "Mèo nhà";
    if (species === "dog") return isEn ? "Domestic Dog" : "Chó nhà";
    return isEn ? "Companion Pet" : "Thú cưng";
  }

  const trimmed = breed.trim();
  if (isEn) {
    for (const [vi, en] of BREED_PAIRS) {
      if (trimmed.toLowerCase() === vi.toLowerCase()) return en;
    }
    for (const [vi, en] of BREED_PAIRS) {
      if (trimmed.toLowerCase().includes(vi.toLowerCase())) return en;
    }
    return trimmed;
  } else {
    for (const [vi, en] of BREED_PAIRS) {
      if (trimmed.toLowerCase() === en.toLowerCase()) return vi;
    }
    for (const [vi, en] of BREED_PAIRS) {
      if (trimmed.toLowerCase().includes(en.toLowerCase())) return vi;
    }
    return trimmed;
  }
}

// ==================== AGE TRANSLATIONS ====================
export function formatBirthdate(dateOrAgeStr?: string, isEn: boolean = false): string {
  if (!dateOrAgeStr || !dateOrAgeStr.trim()) {
    return isEn ? "Not specified" : "Chưa cập nhật";
  }

  const raw = dateOrAgeStr.trim();

  // 1. ISO date: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isEn) {
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
      return `${month}/${day}/${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  // 2. Day-Month-Year: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    if (isEn) {
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
      return `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`;
    }
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  // 3. Approximate legacy relative age (e.g. "2 tuổi 3 tháng" or "2 yrs 3 mos")
  const ymMatch =
    raw.match(/^(\d+)\s*tuổi\s*(\d+)\s*tháng/i) ||
    raw.match(/^(\d+)\s*y(?:ea)?rs?\s*(\d+)\s*m(?:onths?|os?)?/i);
  if (ymMatch) {
    const years = parseInt(ymMatch[1], 10);
    const months = parseInt(ymMatch[2], 10);
    const est = new Date();
    est.setFullYear(est.getFullYear() - years);
    est.setMonth(est.getMonth() - months);
    if (isEn) {
      return `~${est.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }
    return `~${String(est.getMonth() + 1).padStart(2, "0")}/${est.getFullYear()}`;
  }

  // 4. Approximate legacy single year age (e.g. "2 tuổi" or "2 years old")
  const yMatch =
    raw.match(/^(\d+)\s*tuổi/i) ||
    raw.match(/^(\d+)\s*y(?:ea)?rs?(?:\s*old)?/i);
  if (yMatch) {
    const years = parseInt(yMatch[1], 10);
    const estYear = new Date().getFullYear() - years;
    return isEn ? `~${estYear}` : `~Năm ${estYear}`;
  }

  if (raw.toLowerCase().includes("not specified") || raw.toLowerCase().includes("chưa cập nhật")) {
    return isEn ? "Not specified" : "Chưa cập nhật";
  }

  return raw;
}

export function localizeAge(ageStr?: string, isEn: boolean = false): string {
  if (!ageStr || ageStr.trim() === "") {
    return isEn ? "Not specified" : "Chưa cập nhật";
  }

  const raw = ageStr.trim();
  if (isEn) {
    // "2 tuổi 3 tháng" -> "2 yrs 3 mos"
    const ymMatch = raw.match(/^(\d+)\s*tuổi\s*(\d+)\s*tháng(?:\s*tuổi)?$/i);
    if (ymMatch) {
      return `${ymMatch[1]} yr${Number(ymMatch[1]) > 1 ? "s" : ""} ${ymMatch[2]} mo${Number(ymMatch[2]) > 1 ? "s" : ""}`;
    }
    // "2 tuổi" -> "2 years old"
    const yMatch = raw.match(/^(\d+)\s*tuổi$/i);
    if (yMatch) {
      return `${yMatch[1]} year${Number(yMatch[1]) > 1 ? "s" : ""} old`;
    }
    // "5 tháng" / "5 tháng tuổi" -> "5 months old"
    const mMatch = raw.match(/^(\d+)\s*tháng(?:\s*tuổi)?$/i);
    if (mMatch) {
      return `${mMatch[1]} month${Number(mMatch[1]) > 1 ? "s" : ""} old`;
    }
    if (raw.toLowerCase().includes("dưới 1 tuổi")) {
      return "Under 1 year";
    }
    if (raw.toLowerCase().includes("chưa cập nhật")) {
      return "Not specified";
    }
    return raw;
  } else {
    // "2 yrs 3 mos" / "2 years 3 months" -> "2 tuổi 3 tháng"
    const ymMatch = raw.match(/^(\d+)\s*y(?:ea)?rs?\s*(\d+)\s*m(?:onths?|os?)?$/i);
    if (ymMatch) {
      return `${ymMatch[1]} tuổi ${ymMatch[2]} tháng`;
    }
    // "2 years old" / "2 yrs" / "2 years" -> "2 tuổi"
    const yMatch = raw.match(/^(\d+)\s*y(?:ea)?rs?(?:\s*old)?$/i);
    if (yMatch) {
      return `${yMatch[1]} tuổi`;
    }
    // "5 months old" / "5 mos" -> "5 tháng tuổi"
    const mMatch = raw.match(/^(\d+)\s*m(?:onths?|os?)?(?:\s*old)?$/i);
    if (mMatch) {
      return `${mMatch[1]} tháng tuổi`;
    }
    if (raw.toLowerCase().includes("under 1 year")) {
      return "Dưới 1 tuổi";
    }
    if (raw.toLowerCase().includes("not specified")) {
      return "Chưa cập nhật";
    }
    return raw;
  }
}

// ==================== ALLERGIES & CONDITIONS ====================
const ALLERGY_PAIRS: Array<[string, string]> = [
  ["Thịt bò (Beef)", "Beef"],
  ["Thịt bò", "Beef"],
  ["Kháng sinh Penicillin", "Penicillin Antibiotic"],
  ["Penicillin", "Penicillin Antibiotic"],
  ["Hải sản", "Seafood"],
  ["Thịt gà", "Chicken"],
  ["Phấn hoa & Bụi cỏ", "Pollen & Grass"],
  ["Phấn hoa", "Pollen"],
];

export function localizeAllergy(allergy: string, isEn: boolean = false): string {
  if (!allergy) return "";
  const trimmed = allergy.trim();

  // Prefix handling: "Dị ứng thức ăn: X" <-> "Food allergy: X"
  if (isEn) {
    let replaced = trimmed
      .replace(/^dị ứng thức ăn:\s*/i, "Food allergy: ")
      .replace(/^dị ứng thuốc:\s*/i, "Drug allergy: ");

    for (const [vi, en] of ALLERGY_PAIRS) {
      const escaped = vi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(escaped, "i").test(replaced)) {
        replaced = replaced.replace(new RegExp(escaped, "gi"), en);
        break;
      }
    }
    return replaced;
  } else {
    let replaced = trimmed
      .replace(/^food allergy:\s*/i, "Dị ứng thức ăn: ")
      .replace(/^drug allergy:\s*/i, "Dị ứng thuốc: ");

    for (const [vi, en] of ALLERGY_PAIRS) {
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(replaced)) {
        replaced = replaced.replace(new RegExp(`\\b${escaped}\\b`, "gi"), vi);
        break;
      }
    }
    return replaced;
  }
}

export function localizeCondition(cond: string, isEn: boolean = false): string {
  if (!cond) return "";
  const lower = cond.trim().toLowerCase();

  const COND_MAP: Record<string, { vi: string; en: string }> = {
    "viêm da cơ địa": { vi: "Viêm da cơ địa", en: "Atopic Dermatitis" },
    "atopic dermatitis": { vi: "Viêm da cơ địa", en: "Atopic Dermatitis" },
    "viêm da dị ứng tiếp xúc": { vi: "Viêm da dị ứng tiếp xúc", en: "Contact Allergy Dermatitis" },
    "contact allergy dermatitis": { vi: "Viêm da dị ứng tiếp xúc", en: "Contact Allergy Dermatitis" },
    "đã triệt sản": { vi: "Đã triệt sản", en: "Neutered / Spayed" },
    "neutered": { vi: "Đã triệt sản", en: "Neutered / Spayed" },
    "spayed": { vi: "Đã triệt sản", en: "Neutered / Spayed" },
    "khỏe mạnh": { vi: "Khỏe mạnh", en: "Healthy" },
    "healthy": { vi: "Khỏe mạnh", en: "Healthy" },
    "sỏi tiết niệu": { vi: "Tiền sử sỏi tiết niệu", en: "History of Urinary Stones" },
    "urinary stones": { vi: "Tiền sử sỏi tiết niệu", en: "History of Urinary Stones" },
  };

  for (const [key, val] of Object.entries(COND_MAP)) {
    if (lower.includes(key)) {
      return isEn ? val.en : val.vi;
    }
  }
  return cond;
}

// ==================== VACCINES & CLINICS ====================
export function localizeVaccineName(vaxName: string, isEn: boolean = false): string {
  if (!vaxName) return "";
  const lower = vaxName.toLowerCase();

  if (lower.includes("rabies") || lower.includes("dại")) {
    return isEn ? "Rabies Vaccine (Annual)" : "Vắc-xin Dại (Rabies)";
  }
  if (lower.includes("truyền nhiễm") || lower.includes("multi-disease") || lower.includes("core")) {
    return isEn ? "Core Multi-Disease Vaccine" : "Vắc-xin phòng bệnh truyền nhiễm";
  }
  if (lower.includes("nhắc lại") || lower.includes("tổng hợp định kỳ") || lower.includes("annual booster")) {
    return isEn ? "Annual Comprehensive Booster" : "Vắc-xin tổng hợp định kỳ năm";
  }
  if (lower.includes("parvo") || lower.includes("care") || lower.includes("dhpp")) {
    return isEn ? "Core DHPP Vaccine" : "Vắc-xin phòng bệnh Care & Parvo";
  }
  if (lower.includes("giảm bạch cầu") || lower.includes("fvrcp")) {
    return isEn ? "FVRCP Feline Core Vaccine" : "Vắc-xin Giảm bạch cầu mèo (FPV)";
  }
  return vaxName;
}

// ==================== DISTRICTS TRANSLATION ====================
const DISTRICT_PAIRS: Array<[string, string]> = [
  ["Quận 1", "District 1"],
  ["Quận 2", "District 2"],
  ["Quận 3", "District 3"],
  ["Quận 4", "District 4"],
  ["Quận 5", "District 5"],
  ["Quận 6", "District 6"],
  ["Quận 7", "District 7"],
  ["Quận 8", "District 8"],
  ["Quận 9", "District 9"],
  ["Quận 10", "District 10"],
  ["Quận 11", "District 11"],
  ["Quận 12", "District 12"],
  ["Bình Thạnh", "Binh Thanh"],
  ["Thảo Điền", "Thao Dien"],
  ["Thủ Đức", "Thu Duc City"],
  ["Phú Nhuận", "Phu Nhuan"],
  ["Tân Bình", "Tan Binh"],
  ["Tân Phú", "Tan Phu"],
  ["Gò Vấp", "Go Vap"],
  ["Bình Tân", "Binh Tan"],
];

export function localizeDistrict(district?: string, isEn: boolean = false): string {
  if (!district) return "";
  const trimmed = district.trim();
  if (isEn) {
    for (const [vi, en] of DISTRICT_PAIRS) {
      if (trimmed.toLowerCase() === vi.toLowerCase()) return en;
    }
    const match = trimmed.match(/^quận\s+(\d+)$/i);
    if (match) return `District ${match[1]}`;
    return trimmed;
  } else {
    for (const [vi, en] of DISTRICT_PAIRS) {
      if (trimmed.toLowerCase() === en.toLowerCase()) return vi;
    }
    const match = trimmed.match(/^district\s+(\d+)$/i);
    if (match) return `Quận ${match[1]}`;
    return trimmed;
  }
}

// ==================== CLINIC SPECIALTY TAGS ====================
const SPECIALTY_PAIRS: Array<{ vi: string; en: string }> = [
  { vi: "Cửa hàng phụ kiện & Dinh dưỡng", en: "Supplies & Nutrition Store" },
  { vi: "Thức ăn hạt & Dinh dưỡng", en: "Pet Food & Nutrition" },
  { vi: "Phụ kiện & Đồ chơi", en: "Accessories & Toys" },
  { vi: "Grooming Spa thú cưng", en: "Pet Grooming Spa" },
  { vi: "Khách sạn thú cưng", en: "Pet Boarding Hotel" },
  { vi: "Khách sạn lưu chuồng", en: "Pet Boarding Hotel" },
  { vi: "Spa làm đẹp", en: "Beauty Spa & Styling" },
  { vi: "Vòng cổ thông minh", en: "Smart Collars & Gear" },
  { vi: "Khám tổng quát", en: "General Practice" },
  { vi: "Tiêm phòng vắc-xin", en: "Vaccinations" },
  { vi: "Tiêm ngừa vắc-xin", en: "Vaccinations" },
  { vi: "Nha khoa", en: "Dentistry" },
  { vi: "Nha khoa thú cưng", en: "Veterinary Dentistry" },
  { vi: "Chăm sóc nha khoa", en: "Dental Care" },
  { vi: "Spa vệ sinh", en: "Hygienic Spa" },
  { vi: "Da liễu", en: "Dermatology" },
  { vi: "Khám da liễu & Trị nấm", en: "Dermatology & Fungal Care" },
  { vi: "Dermatology & Fungal Care", en: "Dermatology & Fungal Care" },
  { vi: "Spa & Grooming", en: "Spa & Grooming" },
  { vi: "Spa tắm & Vệ sinh", en: "Spa & Grooming" },
  { vi: "Bác sĩ thú y khám tận nhà", en: "House Call Vet" },
  { vi: "Cấp cứu 24/7", en: "24/7 Emergency" },
  { vi: "Phẫu thuật ngoại khoa", en: "Surgery & Spaying" },
  { vi: "Phẫu thuật & Triệt sản", en: "Surgery & Spaying" },
  { vi: "Phẫu thuật", en: "Surgery" },
  { vi: "Phẫu thuật chỉnh hình xương", en: "Orthopedic & Bone Surgery" },
  { vi: "Orthopedic & Bone Surgery", en: "Orthopedic & Bone Surgery" },
  { vi: "Siêu âm Doppler màu", en: "Color Doppler Ultrasound" },
  { vi: "Color Doppler Ultrasound", en: "Color Doppler Ultrasound" },
  { vi: "Siêu âm & Xét nghiệm", en: "Ultrasound & Lab" },
  { vi: "Lưu viện điều trị nội trú", en: "Inpatient Hospitalization" },
  { vi: "Inpatient Hospitalization", en: "Inpatient Hospitalization" },
  { vi: "Spa thú cưng chuẩn 5 sao", en: "Luxury Pet Spa" },
  { vi: "Luxury Pet Spa", en: "Luxury Pet Spa" },
  { vi: "Khách sạn thú cưng 5 sao", en: "5-Star Pet Hotel" },
  { vi: "5-Star Pet Hotel", en: "5-Star Pet Hotel" },
  { vi: "Tắm sục vi bọt khí Ozone", en: "Ozone Microbubble Therapy" },
  { vi: "Ozone Microbubble Therapy", en: "Ozone Microbubble Therapy" },
  { vi: "Hồi sức cấp cứu tích cực (ICU)", en: "24/7 Intensive Care (ICU)" },
  { vi: "24/7 Intensive Care (ICU)", en: "24/7 Intensive Care (ICU)" },
  { vi: "Phẫu thuật cấp cứu tai nạn", en: "Trauma Surgery" },
  { vi: "Trauma Surgery", en: "Trauma Surgery" },
  { vi: "Chẩn đoán hình ảnh cắt lớp CT", en: "CT Scanner Imaging" },
  { vi: "CT Scanner Imaging", en: "CT Scanner Imaging" },
  { vi: "Lưu chuồng cách ly chăm sóc đặc biệt", en: "ICU Isolation Boarding" },
  { vi: "ICU Isolation Boarding", en: "ICU Isolation Boarding" },
  { vi: "Triệt sản chó mèo", en: "Spaying & Neutering" },
  { vi: "Khám nội khoa", en: "Internal Medicine" },
  { vi: "Chăm sóc đặc biệt", en: "Specialized Pet Care" },
  { vi: "Khám mắt thú y", en: "Veterinary Ophthalmology" },
];

export function localizeClinicSpecialty(spec: string, isEn: boolean = false): string {
  if (!spec) return "";
  const trimmed = spec.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary lookup
  for (const pair of SPECIALTY_PAIRS) {
    if (lower === pair.vi.toLowerCase()) return isEn ? pair.en : pair.vi;
    if (lower === pair.en.toLowerCase()) return isEn ? pair.en : pair.vi;
  }

  // 2. Partial match dictionary lookup
  for (const pair of SPECIALTY_PAIRS) {
    if (isEn && lower.includes(pair.vi.toLowerCase())) {
      return pair.en;
    }
    if (!isEn && lower.includes(pair.en.toLowerCase())) {
      return pair.vi;
    }
  }

  // 3. Dynamic Keyword Fallback (prevents untranslated UI for newly added points)
  if (isEn) {
    if (lower.includes("thức ăn") || lower.includes("hạt") || lower.includes("dinh dưỡng")) {
      return "Pet Food & Nutrition";
    }
    if (lower.includes("phụ kiện") || lower.includes("đồ chơi")) {
      return "Accessories & Toys";
    }
    if (lower.includes("lưu chuồng") || lower.includes("khách sạn")) {
      return "Pet Boarding Hotel";
    }
    if (lower.includes("spa") || lower.includes("tỉa lông") || lower.includes("cắt tỉa") || lower.includes("làm đẹp")) {
      return "Pet Spa & Grooming";
    }
    if (lower.includes("phẫu thuật") || lower.includes("triệt sản")) {
      return "Surgery & Spaying";
    }
    if (lower.includes("siêu âm") || lower.includes("xét nghiệm")) {
      return "Ultrasound & Diagnostic Lab";
    }
    if (lower.includes("cấp cứu")) {
      return "24/7 Emergency Care";
    }
    if (lower.includes("tiêm") || lower.includes("vắc-xin")) {
      return "Vaccinations";
    }
    if (lower.includes("nha khoa") || lower.includes("răng")) {
      return "Dental Care";
    }
    if (lower.includes("da liễu") || lower.includes("nấm")) {
      return "Dermatology & Skin Care";
    }
    if (lower.includes("vòng cổ") || lower.includes("thông minh")) {
      return "Smart Collars & Gear";
    }
  } else {
    if (lower.includes("food") || lower.includes("nutrition")) {
      return "Thức ăn hạt & Dinh dưỡng";
    }
    if (lower.includes("accessories") || lower.includes("toys")) {
      return "Phụ kiện & Đồ chơi";
    }
    if (lower.includes("boarding") || lower.includes("hotel")) {
      return "Khách sạn thú cưng";
    }
    if (lower.includes("spa") || lower.includes("grooming")) {
      return "Spa & Cắt tỉa lông";
    }
    if (lower.includes("surgery")) {
      return "Phẫu thuật ngoại khoa";
    }
    if (lower.includes("emergency")) {
      return "Cấp cứu 24/7";
    }
  }

  return trimmed;
}

// ==================== CLINIC NAMES ====================
const CLINIC_NAME_PAIRS: Array<{ id?: string; vi: string; en: string }> = [
  {
    id: "happypet-d3",
    vi: "Happy Pet Kingdom & Phụ Kiện · Quận 3",
    en: "Happy Pet Kingdom & Accessories · District 3",
  },
  {
    id: "petmart-d1",
    vi: "Pet Mart Thú Cưng & Spa Phụ Kiện · Quận 1",
    en: "Pet Mart Pet Boutique & Spa Supplies · District 1",
  },
  {
    id: "vetcare-d3",
    vi: "Phòng Khám Thú Y & Spa Bác Sĩ Tâm · Quận 3",
    en: "Dr. Tam Veterinary Clinic & Pet Spa · District 3",
  },
  {
    id: "petcare-d1",
    vi: "Phòng Khám Thú Y PetCare · Quận 1",
    en: "PetCare Veterinary Clinic · District 1",
  },
  {
    id: "cholon-d5",
    vi: "Bệnh viện Thú Y Chợ Lớn · Quận 5",
    en: "Cho Lon Veterinary Hospital · District 5",
  },
  {
    id: "furry-spa-d2",
    vi: "Furry Friends Luxury Pet Spa & Hotel · Thảo Điền Quận 2",
    en: "Furry Friends Luxury Pet Spa & Hotel · Thao Dien District 2",
  },
  {
    id: "saigonpet-bt",
    vi: "Phòng Khám Thú Y Sài Gòn · Bình Thạnh",
    en: "Saigon Pet Veterinary Clinic · Binh Thanh",
  },
  {
    id: "emergency-247-d7",
    vi: "Bệnh viện Cấp Cứu Thú Y 24/7 Quốc Tế · Quận 7",
    en: "International 24/7 Veterinary Emergency Hospital · District 7",
  },
];

export function localizeClinicName(name: string, isEn: boolean = false): string {
  if (!name) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary matches
  for (const pair of CLINIC_NAME_PAIRS) {
    if (lower === pair.vi.toLowerCase()) return isEn ? pair.en : pair.vi;
    if (lower === pair.en.toLowerCase()) return isEn ? pair.en : pair.vi;
  }
  for (const pair of CLINIC_NAME_PAIRS) {
    if (isEn && lower.includes(pair.vi.toLowerCase())) return pair.en;
    if (!isEn && lower.includes(pair.en.toLowerCase())) return pair.vi;
  }

  // 2. Exact known venue keywords
  if (lower.includes("happypet") || (lower.includes("happy pet") && (lower.includes("quận 3") || lower.includes("district 3")))) {
    return isEn ? "Happy Pet Kingdom & Accessories · District 3" : "Happy Pet Kingdom & Phụ Kiện · Quận 3";
  }
  if (lower.includes("petmart") || (lower.includes("pet mart") && (lower.includes("quận 1") || lower.includes("district 1")))) {
    return isEn ? "Pet Mart Pet Boutique & Spa Supplies · District 1" : "Pet Mart Thú Cưng & Spa Phụ Kiện · Quận 1";
  }
  if (lower.includes("petcare")) {
    return isEn ? "PetCare Veterinary Clinic · District 1" : "Phòng Khám Thú Y PetCare · Quận 1";
  }
  if (lower.includes("chợ lớn") || lower.includes("cho lon")) {
    return isEn ? "Cho Lon Veterinary Hospital · District 5" : "Bệnh viện Thú Y Chợ Lớn · Quận 5";
  }
  if (lower.includes("bác sĩ tâm") || lower.includes("dr. tam")) {
    return isEn ? "Dr. Tam Veterinary Clinic & Pet Spa · District 3" : "Phòng Khám Thú Y & Spa Bác Sĩ Tâm · Quận 3";
  }
  if (lower.includes("furry friends")) {
    return isEn ? "Furry Friends Luxury Pet Spa & Hotel · Thao Dien District 2" : "Furry Friends Luxury Pet Spa & Hotel · Thảo Điền Quận 2";
  }
  if (lower.includes("saigon pet") || (lower.includes("sài gòn") && lower.includes("thú y"))) {
    return isEn ? "Saigon Pet Veterinary Clinic · Binh Thanh" : "Phòng Khám Thú Y Sài Gòn · Bình Thạnh";
  }
  if (lower.includes("quốc tế") && lower.includes("cấp cứu")) {
    return isEn ? "International 24/7 Veterinary Emergency Hospital · District 7" : "Bệnh viện Cấp Cứu Thú Y 24/7 Quốc Tế · Quận 7";
  }
  if (lower.includes("đối tác pawcare") || lower.includes("partner")) {
    return isEn ? "PawCare Partner Veterinary Clinic" : "Phòng khám thú y đối tác PawCare";
  }

  // 3. Dynamic pattern transformation for ANY newly added clinics/shops/spas:
  if (isEn) {
    let result = trimmed
      .replace(/^Phòng Khám Thú Y\s+/i, "Veterinary Clinic ")
      .replace(/^Phòng khám Thú Y\s+/i, "Veterinary Clinic ")
      .replace(/^Bệnh viện Thú Y\s+/i, "Veterinary Hospital ")
      .replace(/^Bệnh viện Cấp Cứu Thú Y\s+/i, "Veterinary Emergency Hospital ")
      .replace(/·\s*Quận\s+(\d+)/gi, "· District $1")
      .replace(/·\s*Quận\s+([A-Za-z\s]+)/gi, "· $1 District")
      .replace(/·\s*Bình Thạnh/gi, "· Binh Thanh")
      .replace(/·\s*Thảo Điền/gi, "· Thao Dien")
      .replace(/·\s*Gò Vấp/gi, "· Go Vap")
      .replace(/·\s*Tân Bình/gi, "· Tan Binh")
      .replace(/·\s*Phú Nhuận/gi, "· Phu Nhuan")
      .replace(/& Phụ Kiện/gi, "& Accessories")
      .replace(/Thú Cưng & Spa Phụ Kiện/gi, "Pet Boutique & Spa Supplies");
    return result;
  } else {
    let result = trimmed
      .replace(/^Veterinary Clinic\s+/i, "Phòng Khám Thú Y ")
      .replace(/^Veterinary Hospital\s+/i, "Bệnh viện Thú Y ")
      .replace(/^Veterinary Emergency Hospital\s+/i, "Bệnh viện Cấp Cứu Thú Y ")
      .replace(/·\s*District\s+(\d+)/gi, "· Quận $1")
      .replace(/·\s*Binh Thanh/gi, "· Bình Thạnh")
      .replace(/·\s*Thao Dien/gi, "· Thảo Điền")
      .replace(/& Accessories/gi, "& Phụ Kiện");
    return result;
  }
}

// ==================== CLINIC ADDRESSES ====================
const CLINIC_ADDRESS_PAIRS: Array<{ vi: string; en: string }> = [
  {
    vi: "116 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM",
    en: "116 Pasteur, Ben Nghe Ward, District 1, HCMC",
  },
  {
    vi: "210 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP.HCM",
    en: "210 Nam Ky Khoi Nghia, Ward 7, District 3, HCMC",
  },
  {
    vi: "45 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM",
    en: "45 Le Van Sy, Ward 13, District 3, HCMC",
  },
  {
    vi: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
    en: "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC",
  },
  {
    vi: "88 Thuận Kiều, Phường 12, Quận 5, TP.HCM",
    en: "88 Thuan Kieu, Ward 12, District 5, HCMC",
  },
  {
    vi: "28 Thảo Điền, Thảo Điền Ward, Thu Duc City, HCMC",
    en: "28 Thao Dien, Thao Dien Ward, Thu Duc City, HCMC",
  },
  {
    vi: "28 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
    en: "28 Thao Dien, Thao Dien Ward, Thu Duc City, HCMC",
  },
  {
    vi: "312 Xô Viết Nghệ Tĩnh, Phường 25, Quận Bình Thạnh, TP.HCM",
    en: "312 Xo Viet Nghe Tinh, Ward 25, Binh Thanh District, HCMC",
  },
  {
    vi: "15 Nguyễn Lương Bằng, Tân Phú, Quận 7, TP.HCM",
    en: "15 Nguyen Luong Bang, Tan Phu, District 7, HCMC",
  },
  {
    vi: "68 Hùng Vương, Phường 1, Quận 5, TP.HCM",
    en: "68 Hung Vuong, Ward 1, District 5, HCMC",
  },
  {
    vi: "152 Bạch Đằng, Phường 24, Quận Bình Thạnh, TP.HCM",
    en: "152 Bach Dang, Ward 24, Binh Thanh District, HCMC",
  },
];

export function localizeClinicAddress(addr: string, isEn: boolean = false): string {
  if (!addr) return "";
  const trimmed = addr.trim();
  const lower = trimmed.toLowerCase();

  for (const pair of CLINIC_ADDRESS_PAIRS) {
    if (lower === pair.vi.toLowerCase()) return isEn ? pair.en : pair.vi;
    if (lower === pair.en.toLowerCase()) return isEn ? pair.en : pair.vi;
  }
  for (const pair of CLINIC_ADDRESS_PAIRS) {
    if (isEn && lower.includes(pair.vi.toLowerCase())) return pair.en;
    if (!isEn && lower.includes(pair.en.toLowerCase())) return pair.vi;
  }

  // Dynamic regex replacement for administrative subdivisions
  if (isEn) {
    let result = trimmed
      .replace(/Phường\s+(\d+)/gi, "Ward $1")
      .replace(/Phường\s+Bến Nghé/gi, "Ben Nghe Ward")
      .replace(/P\.\s*Bến Thành/gi, "Ben Thanh Ward")
      .replace(/Phường\s+Thảo Điền/gi, "Thao Dien Ward")
      .replace(/Quận\s+(\d+)/gi, "District $1")
      .replace(/Quận\s+Bình Thạnh/gi, "Binh Thanh District")
      .replace(/Quận\s+Gò Vấp/gi, "Go Vap District")
      .replace(/Quận\s+Phú Nhuận/gi, "Phu Nhuan District")
      .replace(/Quận\s+Tân Bình/gi, "Tan Binh District")
      .replace(/TP\.\s*Thủ Đức/gi, "Thu Duc City")
      .replace(/TP\.HCM/gi, "HCMC")
      .replace(/TP\s*Hồ Chí Minh/gi, "HCMC")
      .replace(/Thành phố Hồ Chí Minh/gi, "HCMC");
    return result;
  } else {
    let result = trimmed
      .replace(/Ward\s+(\d+)/gi, "Phường $1")
      .replace(/Ben Nghe Ward/gi, "Phường Bến Nghé")
      .replace(/Ben Thanh Ward/gi, "Phường Bến Thành")
      .replace(/Thao Dien Ward/gi, "Phường Thảo Điền")
      .replace(/District\s+(\d+)/gi, "Quận $1")
      .replace(/Binh Thanh District/gi, "Quận Bình Thạnh")
      .replace(/Thu Duc City/gi, "TP. Thủ Đức")
      .replace(/\bHCMC\b/gi, "TP.HCM");
    return result;
  }
}

// ==================== LANGUAGES ====================
export function localizeLanguage(lang: string, isEn: boolean = false): string {
  if (!lang) return "";
  const lower = lang.trim().toLowerCase();
  if (isEn) {
    if (lower.includes("việt")) return "Vietnamese";
    if (lower.includes("anh")) return "English";
    if (lower.includes("trung")) return "Chinese";
    if (lower.includes("hàn")) return "Korean";
    if (lower.includes("pháp")) return "French";
    return lang;
  } else {
    if (lower === "vietnamese") return "Tiếng Việt";
    if (lower === "english") return "English";
    if (lower === "chinese") return "Tiếng Trung";
    if (lower === "korean") return "Tiếng Hàn";
    if (lower === "french") return "Tiếng Pháp";
    return lang;
  }
}

// ==================== CLINIC DESCRIPTIONS ====================
const CLINIC_DESC_MAP: Record<string, { vi: string; en: string }> = {
  "petmart-d1": {
    vi: "Chuỗi cửa hàng vật phẩm thú cưng, spa tạo kiểu và khách sạn lưu trú uy tín tại trung tâm Quận 1. Đầy đủ các dòng thức ăn nhập khẩu chính hãng, sữa tắm dưỡng lông và phụ kiện độc đáo.",
    en: "Premier pet boutique, professional styling salon, and boarding hotel in central District 1. Offering imported holistic food, coat nourishing bath products, and unique pet accessories.",
  },
  "happypet-d3": {
    vi: "Vương quốc thú cưng phong phú tại Quận 3 với hơn 1000 mặt hàng phụ kiện, thức ăn hạt, pate dinh dưỡng và dịch vụ lưu chuồng khách sạn thân thiện, thoáng mát.",
    en: "Vibrant pet superstore in District 3 featuring over 1,000 accessories, organic kibbles, wet pâté, and ventilated, pet-friendly hotel suites.",
  },
  "vetcare-d3": {
    vi: "Phòng khám thú y và spa chăm sóc thú cưng uy tín tại trung tâm Quận 3. Nằm ở vị trí thuận tiện, đội ngũ bác sĩ tận tâm, trang bị máy xét nghiệm nhanh và dịch vụ cạo vôi răng không mê an toàn.",
    en: "Trusted local vet and pet spa in District 3. Closest proximity, in-house rapid testing, and non-anesthetic ultrasonic dental cleaning.",
  },
  "petcare-d1": {
    vi: "Phòng khám thú y tiêu chuẩn quốc tế tại trung tâm Quận 1, trang bị đầy đủ máy xét nghiệm sinh hóa, máy X-quang kỹ thuật số và đội ngũ bác sĩ trực cấp cứu 24/7.",
    en: "International standard veterinary clinic in central District 1, fully equipped with in-house biochemistry lab, digital X-ray, and 24/7 emergency triage team.",
  },
  "cholon-d5": {
    vi: "Bệnh viện thú y chuyên khoa với hơn 15 năm kinh nghiệm điều trị ngoại khoa gãy xương, mổ sỏi tiết niệu, đỡ đẻ và nội soi tại khu vực Chợ Lớn.",
    en: "Specialized veterinary hospital with over 15 years of surgical experience in bone fractures, urinary stone removal, C-sections, and endoscopy in Cho Lon.",
  },
  "furry-spa-d2": {
    vi: "Thiên đường nghỉ dưỡng và làm đẹp thú cưng cao cấp bậc nhất Thảo Điền. Phòng nghỉ máy lạnh riêng biệt trang bị webcam 24/7, chuyên viên cắt tỉa tạo kiểu đạt chứng chỉ quốc tế.",
    en: "Top-rated luxury pet resort and styling boutique in Thao Dien. Air-conditioned private suites with 24/7 webcams and certified professional groomers.",
  },
  "saigonpet-bt": {
    vi: "Không gian khám chữa bệnh thân thiện, giảm căng thẳng cho chó mèo. Chuyên trị các bệnh da liễu khó chữa như Demodex, nấm gàu và dịch vụ bác sĩ thú y tới tận nhà.",
    en: "Fear-free, stress-reducing clinic environment. Specialized dermatology treatment for Demodex mites, dandruff fungus, and dedicated house call veterinary services.",
  },
  "emergency-247-d7": {
    vi: "Bệnh viện cấp cứu thú y hàng đầu khu đô thị Phú Mỹ Hưng với phòng phẫu thuật áp lực dương hiện đại và đội ngũ bác sĩ hồi sức trực chiến xuyên đêm.",
    en: "Leading veterinary emergency hospital in Phu My Hung with positive-pressure surgical suites and 24/7 on-site intensivists.",
  },
};

export function localizeClinicDescription(clinicId: string, desc: string, isEn: boolean = false): string {
  if (CLINIC_DESC_MAP[clinicId]) {
    return isEn ? CLINIC_DESC_MAP[clinicId].en : CLINIC_DESC_MAP[clinicId].vi;
  }
  return desc;
}

export function localizeDoctorName(doc: string, isEn: boolean = false): string {
  if (!doc) return "";
  const lower = doc.toLowerCase();

  if (lower.includes("cường") || lower.includes("cuong")) {
    if (lower.includes("da liễu") || lower.includes("dermatology")) {
      return isEn
        ? "Dr. Nguyen Van Cuong (Dermatology & Outpatient)"
        : "BS. Nguyễn Văn Cường (Chuyên khoa Da liễu & Ngoại trú)";
    }
    return isEn ? "Dr. Nguyen Van Cuong (DVM)" : "BS. Nguyễn Văn Cường";
  }
  if (lower.includes("hà") || lower.includes("ha")) {
    return isEn
      ? "Dr. Tran Thu Ha (Internal Medicine & Gastroenterology)"
      : "BS. Trần Thu Hà (Chuyên khoa Nội nhi & Tiêu hóa)";
  }
  if (lower.includes("phụ trách") || lower.includes("attending")) {
    return isEn ? "Attending Specialist" : "Bác sĩ phụ trách ca";
  }
  return doc;
}

// ==================== SERVICES TRANSLATIONS ====================
const SERVICE_PAIRS: Array<{ vi: string; en: string }> = [
  { vi: "Khám sức khỏe tổng quát", en: "General Wellness Exam" },
  { vi: "Tiêm vắc-xin & Phòng ngừa", en: "Vaccination & Prevention" },
  { vi: "Nha khoa thú y", en: "Dental Scaling & Care" },
  { vi: "Da liễu & Điều trị ngoài da", en: "Dermatology & Skin Treatment" },
  { vi: "Siêu âm & Chẩn đoán hình ảnh", en: "Ultrasound & Imaging" },
  { vi: "Spa & Vệ sinh chuyên sâu", en: "Pet Grooming & Spa" },
  { vi: "Khám sức khỏe tổng quát & Tiêm ngừa định kỳ", en: "Combined Wellness & Vaccination Check" },
  { vi: "Combo Spa tắm cắt tỉa lông vệ sinh toàn diện", en: "Full 7-Step Grooming & Styling Spa Combo" },
  { vi: "Lưu trú khách sạn thú cưng tiêu chuẩn", en: "Standard Pet Boarding Hotel Stay" },
  { vi: "Grooming & Spa tắm vệ sinh làm mượt lông", en: "Grooming & Coat Smoothing Herbal Spa" },
  { vi: "Khám lâm sàng tổng quát & Đánh giá thể trạng", en: "General Wellness Examination & Physical Assessment" },
  { vi: "Tiêm ngừa vắc-xin phòng bệnh & Tẩy giun định kỳ", en: "Core Vaccination & Routine Deworming" },
  { vi: "Cạo vôi răng & Vệ sinh mảng bám nướu", en: "Dental Scaling & Plaque Removal" },
  { vi: "Combo Spa tắm sấy vệ sinh 7 bước", en: "7-Step Hygienic Bath & Blow-dry Combo" },
  { vi: "Khám sức khỏe tổng quát & Tư vấn dinh dưỡng", en: "General Health Checkup & Dietary Consultation" },
  { vi: "Tiêm ngừa vắc-xin 4 bệnh mèo / 7 bệnh chó", en: "Feline 4-in-1 / Canine 7-in-1 Core Vaccination" },
  { vi: "Tiêm phòng Dại (Rabies) có gắn tem kiểm dịch", en: "Rabies Vaccination with Quarantine Stamp" },
  { vi: "Cạo vôi răng & Vệ sinh nha khoa bằng máy siêu âm", en: "Ultrasonic Dental Scaling & Prophylaxis" },
  { vi: "Cấp cứu khẩn cấp ngoài giờ (24/7 Emergency)", en: "After-Hours Emergency Triage (24/7)" },
  { vi: "Chụp X-quang kỹ thuật số & Siêu âm Doppler màu", en: "Digital X-Ray & Color Doppler Ultrasound" },
  { vi: "Digital X-Ray & Color Doppler Ultrasound", en: "Digital X-Ray & Color Doppler Ultrasound" },
  { vi: "Cắt tỉa lông tạo kiểu nghệ thuật phong cách Hàn/Nhật", en: "Artistic Grooming & Styling (Korean/Japanese)" },
  { vi: "Artistic Grooming & Styling", en: "Artistic Grooming & Styling" },
  { vi: "Soi kính hiển vi biểu bì da & Phác đồ trị nấm ngứa", en: "Skin Scraping Microscopy & Antifungal Protocol" },
  { vi: "Skin Scraping Microscopy & Antifungal Protocol", en: "Skin Scraping Microscopy & Antifungal Protocol" },
  { vi: "Hồi sức cấp cứu sốc, ngộ độc & Chấn thương đa khoa", en: "Emergency Triage, Shock & Trauma Resuscitation" },
  { vi: "Emergency Triage, Shock & Trauma Resuscitation", en: "Emergency Triage, Shock & Trauma Resuscitation" },
  { vi: "Khám da liễu & soi ký sinh trùng vi mô", en: "Dermatology Exam & Microscopic Cytology Scrape" },
  { vi: "Dermatology Exam & Microscopic Cytology Scrape", en: "Dermatology Exam & Microscopic Cytology Scrape" },
  { vi: "Tiêm phòng vắc-xin dại & 7 bệnh định kỳ", en: "Routine Rabies & 5-in-1 Combination Vaccine" },
  { vi: "Routine Rabies & 5-in-1 Combination Vaccine", en: "Routine Rabies & 5-in-1 Combination Vaccine" },
  { vi: "Phẫu thuật cạo vôi răng & nhổ răng sâu dưới gây mê", en: "Dental Scaling & Extraction Under Anesthesia" },
  { vi: "Dental Scaling & Extraction Under Anesthesia", en: "Dental Scaling & Extraction Under Anesthesia" },
  { vi: "Tiêm nhắc giun tim ProHeart 12", en: "ProHeart 12 Heartworm Prevention Booster" },
  { vi: "ProHeart 12 Heartworm Prevention Booster", en: "ProHeart 12 Heartworm Prevention Booster" },
  { vi: "Khám da liễu & tẩy giun", en: "Dermatology Exam & Deworming" },
  { vi: "Dermatology Exam & Deworming", en: "Dermatology Exam & Deworming" },
  { vi: "Tái khám sau triệt sản", en: "Post-Neuter Follow-up Checkup" },
  { vi: "Post-Neuter Follow-up Checkup", en: "Post-Neuter Follow-up Checkup" },
  { vi: "Khám & tiêm chủng", en: "Exam & Vaccination" },
  { vi: "Exam & Vaccination", en: "Exam & Vaccination" },
];

export function localizeServiceName(service: string, isEn: boolean = false): string {
  if (!service) return "";
  const trimmed = service.trim();

  // Check exact matches
  for (const pair of SERVICE_PAIRS) {
    if (trimmed.toLowerCase() === pair.vi.toLowerCase() || trimmed.toLowerCase() === pair.en.toLowerCase()) {
      return isEn ? pair.en : pair.vi;
    }
  }

  // Combined packages like "Gói khám kết hợp (A, B)" or "Comprehensive Care (A, B)"
  if (trimmed.startsWith("Gói khám kết hợp") || trimmed.startsWith("Comprehensive Care")) {
    const match = trimmed.match(/\((.+)\)/);
    if (match) {
      const items = match[1].split(",").map((s) => localizeServiceName(s.trim(), isEn));
      return isEn ? `Comprehensive Care (${items.join(", ")})` : `Gói khám kết hợp (${items.join(", ")})`;
    }
  }

  // Partial matches fallback
  for (const pair of SERVICE_PAIRS) {
    if (isEn && trimmed.toLowerCase().includes(pair.vi.toLowerCase())) {
      return pair.en;
    }
    if (!isEn && trimmed.toLowerCase().includes(pair.en.toLowerCase())) {
      return pair.vi;
    }
  }

  return trimmed;
}

// ==================== FULL CLINIC LOCALIZER ====================
export function localizeClinic(clinic: ClinicDetail, isEn: boolean = false): ClinicDetail {
  const fallbackList = getFallbackClinics(isEn ? "en" : "vi");
  const matchedClinic = fallbackList.find((c) => c.id === clinic.id);

  return {
    ...clinic,
    name: localizeClinicName(clinic.name, isEn),
    address: localizeClinicAddress(clinic.address, isEn),
    district: localizeDistrict(clinic.district, isEn),
    specialties: (clinic.specialties || []).map((s) => localizeClinicSpecialty(s, isEn)),
    languages: (clinic.languages || []).map((l) => localizeLanguage(l, isEn)),
    description: localizeClinicDescription(clinic.id, clinic.description, isEn),
    services: (clinic.services || []).map((s, idx) => {
      let desc = s.description;
      if (matchedClinic?.services?.[idx]) {
        desc = matchedClinic.services[idx].description;
      }
      return {
        ...s,
        name: localizeServiceName(s.name, isEn),
        description: desc,
      };
    }),
  };
}

// ==================== APPOINTMENT NORMALIZER ====================
export function localizeAppointment(apt: Appointment, isEn: boolean = false): Appointment {
  const localizedPets: BookedPetDetail[] = (apt.pets || []).map((p) => ({
    ...p,
    name: isEn ? (p.name === "Bơ" ? "Bo" : p.name) : (p.name === "Bo" ? "Bơ" : p.name),
    breed: localizeBreed(p.breed, p.species, isEn),
    age: localizeAge(p.age, isEn),
    allergies: (p.allergies || []).map((al) => localizeAllergy(al, isEn)),
    service: localizeServiceName(p.service, isEn),
  }));

  const localizedPetName = isEn
    ? apt.petName.split(/\s*&\s*/).map((s) => (s.trim() === "Bơ" ? "Bo" : s.trim())).join(" & ")
    : apt.petName.split(/\s*&\s*/).map((s) => (s.trim() === "Bo" ? "Bơ" : s.trim())).join(" & ");

  let localizedNotes = apt.notes;
  if (apt.notes) {
    if (isEn) {
      if (apt.notes.includes("gãi nhiều vùng cổ") || apt.notes.includes("scratching neck")) {
        localizedNotes = "Cat scratching neck and base of ears for 2 days, suspected contact allergic dermatitis. Owner submitted online booking awaiting clinic confirmation.";
      } else if (apt.notes.includes("Đã hoàn thành khám lâm sàng") || apt.notes.includes("Clinical exam & vaccination completed")) {
        localizedNotes = "Clinical exam & vaccination completed (Rabies + Vanguard Plus 5/L). Temperature 38.5°C, stable vitals. Digital immunization certificate issued.";
      } else if (apt.notes.includes("Từ chối lịch hẹn: Phòng mổ kín lịch") || apt.notes.includes("Appointment declined: Surgery suite fully occupied")) {
        localizedNotes = "Appointment declined: Surgery suite fully occupied with midday emergency procedures. Clinic staff called owner to reschedule to 09:00 AM tomorrow (fast 8 hours before surgery).";
      } else if (apt.notes.includes("Đặt khám định kỳ & tiêm phòng cho 2 bé")) {
        localizedNotes = "Pre-booked routine visit for 2 companions";
      }
    } else {
      if (apt.notes.includes("scratching neck") || apt.notes.includes("gãi nhiều vùng cổ")) {
        localizedNotes = "Bé gãi nhiều vùng cổ và gốc tai 2 ngày nay, nghi viêm da dị ứng tiếp xúc. Chủ nuôi gửi yêu cầu đặt hẹn trực tuyến chờ phòng khám xác nhận.";
      } else if (apt.notes.includes("Clinical exam & vaccination completed") || apt.notes.includes("Đã hoàn thành khám lâm sàng")) {
        localizedNotes = "Đã hoàn thành khám lâm sàng & tiêm phòng vắc-xin Rabies + Vanguard Plus 5/L. Thân nhiệt 38.5°C, sức khỏe ổn định. Cấp chứng chỉ tiêm chủng điện tử thành công.";
      } else if (apt.notes.includes("Appointment declined: Surgery suite fully occupied") || apt.notes.includes("Từ chối lịch hẹn: Phòng mổ kín lịch")) {
        localizedNotes = "Từ chối lịch hẹn: Phòng mổ kín lịch phẫu thuật cấp cứu trưa nay. Phòng khám đã liên hệ chủ nuôi dời sang 09:00 sáng mai và dặn nhịn ăn 8 tiếng trước mổ.";
      } else if (apt.notes.includes("Pre-booked routine visit for 2 companions")) {
        localizedNotes = "Đặt khám định kỳ & tiêm phòng cho 2 bé";
      }
    }
  }

  return {
    ...apt,
    petName: localizedPetName,
    pets: localizedPets,
    clinicName: localizeClinicName(apt.clinicName, isEn),
    clinicAddress: localizeClinicAddress(apt.clinicAddress, isEn),
    doctor: localizeDoctorName(apt.doctor, isEn),
    service: localizeServiceName(apt.service, isEn),
    notes: localizedNotes,
  };
}

// ==================== PET RECORD NORMALIZER ====================
export function localizePetRecord(pet: PetRecord, isEn: boolean = false): PetRecord {
  const localizedVaccinations = (pet.vaccinations || []).map((vx) => ({
    ...vx,
    name: localizeVaccineName(vx.name, isEn),
    clinic: localizeClinicName(vx.clinic, isEn),
  }));

  return {
    ...pet,
    name: isEn ? (pet.name === "Bơ" ? "Bo" : pet.name) : (pet.name === "Bo" ? "Bơ" : pet.name),
    breed: localizeBreed(pet.breed, pet.species, isEn),
    allergies: (pet.allergies || []).map((al) => localizeAllergy(al, isEn)),
    conditions: (pet.conditions || []).map((cd) => localizeCondition(cd, isEn)),
    vaccinations: localizedVaccinations,
  };
}

// ==================== CARE PLAN NORMALIZER ====================
const PLAN_DIAGNOSES: Record<string, { vi: string; en: string }> = {
  "plan-petcare-01": {
    vi: "Phác đồ kiểm soát viêm da dị ứng tiếp xúc & hồi phục biểu bì",
    en: "Treatment protocol for contact allergy dermatitis & epidermal barrier recovery",
  },
  "plan-petcare-02": {
    vi: "Kế hoạch quản lý dinh dưỡng kiểm soát búi lông & phòng ngừa sỏi tiết niệu",
    en: "Nutritional management protocol for hairball control & urinary stones prevention",
  },
};

const PLAN_DIET: Record<string, { vi: string; en: string }> = {
  "plan-petcare-01": {
    vi: "Kiêng thịt bò, gà và phụ gia cay nồng. Sử dụng hạt dinh dưỡng đạm thủy phân hoặc cá hồi tự nhiên.",
    en: "Avoid beef, chicken, and spicy additives. Use hydrolyzed protein nutrition or wild salmon.",
  },
  "plan-petcare-02": {
    vi: "Bổ sung gel tiêu búi lông 2 lần/tuần. Duy trì ít nhất 2 bát nước sạch tại các góc nhà để khuyến khích uống nước.",
    en: "Provide hairball relief gel twice weekly. Keep at least 2 clean water bowls in corner areas to encourage hydration.",
  },
};

const PLAN_NOTES: Record<string, { vi: string; en: string }> = {
  "plan-petcare-01": {
    vi: "Vệ sinh vùng kẽ chân và tai sau mỗi lần đi dạo ngoài trời. Nếu phát hiện đỏ da hoặc cắn đuôi liên tục, liên hệ phòng khám ngay.",
    en: "Clean paw pads and ears after outdoor walks. If persistent skin redness or tail biting occurs, contact the clinic immediately.",
  },
  "plan-petcare-02": {
    vi: "Chải lông tơ hàng ngày để giảm nuốt lông rụng. Theo dõi tần suất đi vệ sinh, báo cho bác sĩ nếu thấy dấu hiệu tiểu rắt.",
    en: "Brush undercoat daily to minimize ingested loose fur. Monitor urination frequency and notify the vet if straining is observed.",
  },
};

const TASK_MAP: Record<string, { title: { vi: string; en: string }; notes: { vi: string; en: string } }> = {
  // Plan 1: Bơ (Corgi) - Daily, Weekly, Monthly
  "task-01-d1": {
    title: {
      vi: "Uống viên bổ sung Axit béo Omega 3-6 phục hồi màng lipid biểu bì",
      en: "Take Omega 3-6 fatty acid supplement to restore epidermal lipid barrier",
    },
    notes: {
      vi: "Cho uống 1 viên vào bữa sáng cùng thức ăn để tăng hấp thu dầu cá.",
      en: "Give 1 softgel with morning breakfast to enhance fish oil absorption.",
    },
  },
  "task-01-d2": {
    title: {
      vi: "Vệ sinh kẽ chân & lau khô vùng nếp gấp da sau khi đi dạo",
      en: "Clean paw pads & dry skin folds gently after outdoor walks",
    },
    notes: {
      vi: "Dùng khăn ẩm nước muối sinh lý lau nhẹ, sau đó sấy khô thoáng kẽ chân.",
      en: "Wipe with saline-dampened cloth, then blow-dry gently to prevent interdigital moisture.",
    },
  },
  "task-01-d3": {
    title: {
      vi: "Khẩu phần ăn hạt đạm thủy phân kiêng tuyệt đối thịt bò & gà",
      en: "Hydrolyzed protein diet strictly avoiding beef and chicken",
    },
    notes: {
      vi: "Không cho ăn thức ăn vặt có chứa gluten hay gia vị của người.",
      en: "Avoid treats containing human seasonings or gluten.",
    },
  },
  "task-01": {
    title: {
      vi: "Tắm trị liệu bằng sữa tắm Malaseb dược liệu 2 lần/tuần",
      en: "Therapeutic bath with Malaseb medicinal shampoo twice weekly",
    },
    notes: {
      vi: "Massage bọt thuốc trên da 10 phút trước khi xả sạch bằng nước ấm vừa phải.",
      en: "Lather medicinal foam on skin for 10 minutes before rinsing with lukewarm water.",
    },
  },
  "task-01-w2": {
    title: {
      vi: "Giặt đệm nằm & khử khuẩn chuồng, khay ăn bát nước",
      en: "Disinfect pet bed, crate, food bowls & water dispensers weekly",
    },
    notes: {
      vi: "Ngâm giặt nước ấm 60°C hoặc phơi nắng để triệt tiêu nấm và bọ mạt.",
      en: "Wash in 60°C warm water or sun-dry to eliminate fungi and dust mites.",
    },
  },
  "task-01-m1": {
    title: {
      vi: "Nhỏ gáy phòng ngừa ve rận & ghẻ Demodex (Bravecto/Revolution)",
      en: "Monthly topical flea, tick & Demodex preventive spot-on (Bravecto/Revolution)",
    },
    notes: {
      vi: "Vạch lông nhỏ trực tiếp lên bề mặt da gáy cổ, không tắm trong 48h sau nhỏ.",
      en: "Part fur and apply directly onto nape skin; do not bathe pet within 48h.",
    },
  },
  "task-02": {
    title: {
      vi: "Uống viên bổ sung Axit béo Omega 3-6 phục hồi hàng rào da",
      en: "Take Omega 3-6 fatty acid supplement to restore skin barrier",
    },
    notes: {
      vi: "1 viên vào bữa sáng cùng thức ăn.",
      en: "1 softgel with morning breakfast food.",
    },
  },
  "task-03": {
    title: {
      vi: "Tái khám soi kính hiển vi tế bào da & kiểm tra độ ngứa",
      en: "Follow-up microscopic skin cytology & itch level evaluation",
    },
    notes: {
      vi: "Khám trực tiếp tại PetCare Q1 với BS. Cường.",
      en: "In-person clinical evaluation at PetCare D1 with Dr. Cuong.",
    },
  },
  "task-04": {
    title: {
      vi: "Tiêm phòng nhắc lại vắc-xin tổng hợp định kỳ năm",
      en: "Annual comprehensive booster vaccination renewal",
    },
    notes: {
      vi: "Đảm bảo bé không sốt trong vòng 3 ngày trước tiêm.",
      en: "Ensure companion has had no fever within 3 days prior to vaccination.",
    },
  },

  // Plan 2: Miu (British Shorthair) - Daily, Weekly, Monthly
  "task-02-d1": {
    title: {
      vi: "Chải lông hàng ngày 10-15 phút bằng lược chuyên dụng lấy lông chết",
      en: "Daily 10-15 min coat brushing with de-shedding comb to prevent hairballs",
    },
    notes: {
      vi: "Tập trung phần ức và bụng dưới để giảm lượng lông mèo tự liếm nuốt vào bụng.",
      en: "Focus on chest and lower belly to reduce fur swallowed during grooming.",
    },
  },
  "task-02-d2": {
    title: {
      vi: "Thay nước sạch lọc và vệ sinh 2-3 bát nước đặt quanh nhà",
      en: "Refresh filtered water & sanitize 2-3 water bowls around the house",
    },
    notes: {
      vi: "Khuyến khích mèo uống nhiều nước để làm loãng nước tiểu và thông bàng quang.",
      en: "Encourage hydration to dilute urine and flush the urinary tract.",
    },
  },
  "task-02-d3": {
    title: {
      vi: "Dọn dẹp khay cát & kiểm tra số lượng vón nước tiểu",
      en: "Clean litter box & monitor urine clump sizes daily",
    },
    notes: {
      vi: "Nếu thấy mèo ngồi khay cát lâu mà không tiểu hoặc tiểu rắt, báo ngay cho bác sĩ.",
      en: "If straining or frequent unproductive visits occur, contact the vet immediately.",
    },
  },
  "task-05": {
    title: {
      vi: "Bổ sung gel tiêu búi lông Malt Paste 2 lần/tuần",
      en: "Administer Malt Paste hairball relief gel twice weekly",
    },
    notes: {
      vi: "Bóp khoảng 2-3cm cho ăn trực tiếp hoặc trộn vào pate yêu thích.",
      en: "Feed 2-3cm paste directly or blend into favorite wet food.",
    },
  },
  "task-02-w2": {
    title: {
      vi: "Khử khuẩn toàn phần khay cát & thay mới 100% cát lót",
      en: "Deep disinfect litter box & renew 100% fresh litter weekly",
    },
    notes: {
      vi: "Rửa khay bằng xà phòng nhẹ, phơi khô ráo để tránh nấm mốc.",
      en: "Wash box with mild soap, sun-dry thoroughly to prevent mold.",
    },
  },
  "task-02-m1": {
    title: {
      vi: "Cân kiểm tra thể trọng định kỳ kiểm soát nguy cơ béo phì",
      en: "Monthly weight monitoring check to control obesity risk",
    },
    notes: {
      vi: "Mục tiêu duy trì thể trạng 4.2kg - 4.5kg, tránh tăng cân gây áp lực thận.",
      en: "Target weight 4.2kg - 4.5kg to avoid excess strain on kidneys.",
    },
  },
  "task-06": {
    title: {
      vi: "Tái khám siêu âm bàng quang & xét nghiệm nước tiểu",
      en: "Urinary tract & bladder ultrasound follow-up check",
    },
    notes: {
      vi: "Kiểm tra dự phòng cặn sỏi struvite. Giữ mèo nhịn tiểu trước khám 1 tiếng.",
      en: "Check for struvite crystals. Keep cat moderately hydrated 1 hour before scan.",
    },
  },
  "task-07": {
    title: {
      vi: "Tái khám siêu âm bàng quang & xét nghiệm nước tiểu",
      en: "Urinary tract & bladder ultrasound follow-up check",
    },
    notes: {
      vi: "Nhịn tiểu trước khi đến khám khoảng 1-2 tiếng.",
      en: "Keep bladder moderately full 1-2 hours prior to scan.",
    },
  },
};

const SCHEDULE_DESC_MAP: Record<string, { vi: string; en: string }> = {
  "Mỗi sáng cùng thức ăn": { vi: "Mỗi sáng cùng thức ăn", en: "Every morning with food" },
  "Mỗi tối sau khi đi dạo ngoài trời": { vi: "Mỗi tối sau khi đi dạo ngoài trời", en: "Every evening after outdoor walk" },
  "Sáng 60g · Tối 60g": { vi: "Sáng 60g · Tối 60g", en: "Morning 60g · Evening 60g" },
  "Thứ 4 & Chủ nhật": { vi: "Thứ 4 & Chủ nhật", en: "Wednesday & Sunday" },
  "Chủ nhật hàng tuần": { vi: "Chủ nhật hàng tuần", en: "Every Sunday" },
  "Ngày 25 hàng tháng": { vi: "Ngày 25 hàng tháng", en: "25th of every month" },
  "Ngày 29/10/2026": { vi: "Ngày 29/10/2026", en: "Oct 29, 2026" },
  "Ngày 15/11/2026": { vi: "Ngày 15/11/2026", en: "Nov 15, 2026" },
  "Mỗi tối trước khi ngủ": { vi: "Mỗi tối trước khi ngủ", en: "Every evening before bed" },
  "2 lần/ngày (Sáng & Tối)": { vi: "2 lần/ngày (Sáng & Tối)", en: "Twice daily (Morning & Evening)" },
  "Sáng & Tối mỗi ngày": { vi: "Sáng & Tối mỗi ngày", en: "Morning & Evening daily" },
  "Thứ 3 & Thứ 7": { vi: "Thứ 3 & Thứ 7", en: "Tuesday & Saturday" },
  "Thứ 7 hàng tuần": { vi: "Thứ 7 hàng tuần", en: "Every Saturday" },
  "Ngày 01 hàng tháng": { vi: "Ngày 01 hàng tháng", en: "1st of every month" },
  "Ngày 20/11/2026": { vi: "Ngày 20/11/2026", en: "Nov 20, 2026" },
};

export function localizeCareFrequency(freq?: string, isEn: boolean = false): string {
  switch (freq) {
    case "daily":
      return isEn ? "Daily" : "Hằng ngày";
    case "weekly":
      return isEn ? "Weekly" : "Hàng tuần";
    case "monthly":
      return isEn ? "Monthly" : "Hàng tháng";
    default:
      return isEn ? "Periodic" : "Định kỳ";
  }
}

export function localizeCarePlan(plan: CarePlanProposal, isEn: boolean = false): CarePlanProposal {
  const diagnosis = PLAN_DIAGNOSES[plan.id]
    ? isEn
      ? PLAN_DIAGNOSES[plan.id].en
      : PLAN_DIAGNOSES[plan.id].vi
    : plan.diagnosis;

  const dietInstructions = PLAN_DIET[plan.id]
    ? isEn
      ? PLAN_DIET[plan.id].en
      : PLAN_DIET[plan.id].vi
    : plan.dietInstructions;

  const generalNotes = PLAN_NOTES[plan.id]
    ? isEn
      ? PLAN_NOTES[plan.id].en
      : PLAN_NOTES[plan.id].vi
    : plan.generalNotes;

  const tasks: CareTaskItem[] = plan.tasks.map((task) => {
    let title = task.title;
    let notes = task.notes;
    let scheduleDescription = task.scheduleDescription;

    if (TASK_MAP[task.id]) {
      title = isEn ? TASK_MAP[task.id].title.en : TASK_MAP[task.id].title.vi;
      notes = isEn ? TASK_MAP[task.id].notes.en : TASK_MAP[task.id].notes.vi;
    }
    if (scheduleDescription && SCHEDULE_DESC_MAP[scheduleDescription]) {
      scheduleDescription = isEn ? SCHEDULE_DESC_MAP[scheduleDescription].en : SCHEDULE_DESC_MAP[scheduleDescription].vi;
    }

    return {
      ...task,
      title,
      notes,
      scheduleDescription,
    };
  });

  return {
    ...plan,
    petName: isEn ? (plan.petName === "Bơ" ? "Bo" : plan.petName) : (plan.petName === "Bo" ? "Bơ" : plan.petName),
    clinicName: localizeClinicName(plan.clinicName, isEn),
    doctorName: localizeDoctorName(plan.doctorName, isEn),
    diagnosis,
    dietInstructions,
    generalNotes,
    tasks,
  };
}
