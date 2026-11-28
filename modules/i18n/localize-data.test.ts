import { describe, it, expect } from "vitest";
import {
  localizeBreed,
  localizeAge,
  formatBirthdate,
  localizeAllergy,
  localizeCondition,
  localizeVaccineName,
  localizeClinicName,
  localizeClinicAddress,
  localizeDoctorName,
  localizeServiceName,
  localizeDistrict,
  localizeClinicSpecialty,
  localizeClinic,
  localizeAppointment,
  localizePetRecord,
  localizeCarePlan,
  localizeReminder,
  localizePersonName,
  localizeWeightNote,
} from "./localize-data";
import type { ClinicDetail } from "@/modules/clinics/mock-clinics";
import type { Appointment } from "@/components/owner/appointments-manager";
import type { PetRecord } from "@/components/owner/pet-passport-view";
import { INITIAL_SEED_CARE_PLANS } from "@/modules/careplans/types";

describe("Dynamic Multi-Language Data Localizer", () => {
  it("localizes breeds bi-directionally", () => {
    expect(localizeBreed("Mèo Anh lông ngắn", "cat", true)).toBe("British Shorthair");
    expect(localizeBreed("British Shorthair", "cat", false)).toBe("Mèo Anh lông ngắn");
    expect(localizeBreed("Corgi Wales", "dog", true)).toBe("Welsh Corgi");
    expect(localizeBreed("Welsh Corgi", "dog", false)).toBe("Corgi Wales");
    expect(localizeBreed("", "cat", true)).toBe("Domestic Cat");
    expect(localizeBreed("", "dog", false)).toBe("Chó nhà");
  });

  it("localizes age strings between Vietnamese and English", () => {
    expect(localizeAge("2 tuổi", true)).toBe("2 years old");
    expect(localizeAge("2 years old", false)).toBe("2 tuổi");
    expect(localizeAge("1 tuổi 4 tháng", true)).toBe("1 yr 4 mos");
    expect(localizeAge("1 yr 4 mos", false)).toBe("1 tuổi 4 tháng");
    expect(localizeAge("Dưới 1 tuổi", true)).toBe("Under 1 year");
    expect(localizeAge("Under 1 year", false)).toBe("Dưới 1 tuổi");
    expect(localizeAge("", true)).toBe("Not specified");
    expect(localizeAge("", false)).toBe("Chưa cập nhật");
  });

  it("formats pet birthdate cleanly for mobile and desktop UI", () => {
    expect(formatBirthdate("2023-04-12", false)).toBe("12/04/2023");
    expect(formatBirthdate("2023-04-12", true)).toBe("Apr 12, 2023");
    expect(formatBirthdate("15/03/2022", false)).toBe("15/03/2022");
    expect(formatBirthdate("15/03/2022", true)).toBe("Mar 15, 2022");
    expect(formatBirthdate("", false)).toBe("Chưa cập nhật");
    expect(formatBirthdate("", true)).toBe("Not specified");
    expect(formatBirthdate("Chưa cập nhật", true)).toBe("Not specified");
  });

  it("localizes allergies and conditions", () => {
    expect(localizeAllergy("Dị ứng thức ăn: Thịt bò (Beef)", true)).toBe("Food allergy: Beef");
    expect(localizeAllergy("Food allergy: Beef", false)).toBe("Dị ứng thức ăn: Thịt bò (Beef)");
    expect(localizeCondition("Viêm da dị ứng tiếp xúc", true)).toBe("Contact Allergy Dermatitis");
    expect(localizeCondition("Contact Allergy Dermatitis", false)).toBe("Viêm da dị ứng tiếp xúc");
  });

  it("localizes vaccines, clinics, doctors, and services", () => {
    expect(localizeVaccineName("Vắc-xin Dại (Rabies)", true)).toBe("Rabies Vaccine (Annual)");
    expect(localizeVaccineName("Rabies Vaccine (Annual)", false)).toBe("Vắc-xin Dại (Rabies)");

    expect(localizeClinicName("Phòng Khám Thú Y PetCare · Quận 1", true)).toBe("PetCare Veterinary Clinic · District 1");
    expect(localizeClinicName("PetCare Veterinary Clinic · District 1", false)).toBe("Phòng Khám Thú Y PetCare · Quận 1");

    expect(localizeClinicAddress("124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM", true)).toBe("124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC");

    expect(localizeDoctorName("BS. Nguyễn Văn Cường", true)).toBe("Dr. Nguyen Van Cuong (DVM)");
    expect(localizeDoctorName("Dr. Nguyen Van Cuong (DVM)", false)).toBe("BS. Nguyễn Văn Cường");

    expect(localizeServiceName("Khám sức khỏe tổng quát", true)).toBe("General Wellness Exam");
    expect(localizeServiceName("General Wellness Exam", false)).toBe("Khám sức khỏe tổng quát");
  });

  it("normalizes full appointments when switching language", () => {
    const apt: Appointment = {
      id: "apt-1",
      petName: "Bơ & Miu",
      petCount: 2,
      pets: [
        {
          id: "p1",
          name: "Bơ",
          breed: "Corgi Wales",
          age: "2 tuổi",
          allergies: ["Thịt bò (Beef)"],
          service: "Khám sức khỏe tổng quát",
        },
      ],
      clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: "Khám sức khỏe tổng quát & Tiêm ngừa định kỳ",
      date: "2026-10-28",
      time: "09:30",
      doctor: "BS. Nguyễn Văn Cường",
      status: "confirmed",
      notes: "Đặt khám định kỳ & tiêm phòng cho 2 bé",
    };

    const enApt = localizeAppointment(apt, true);
    expect(enApt.petName).toBe("Bo & Miu");
    expect(enApt.clinicName).toBe("PetCare Veterinary Clinic · District 1");
    expect(enApt.pets[0].breed).toBe("Welsh Corgi");
    expect(enApt.pets[0].age).toBe("2 years old");
    expect(enApt.pets[0].service).toBe("General Wellness Exam");
    expect(enApt.notes).toBe("Pre-booked routine visit for 2 companions");

    const viApt = localizeAppointment(enApt, false);
    expect(viApt.petName).toBe("Bơ & Miu");
    expect(viApt.clinicName).toBe("Phòng Khám Thú Y PetCare · Quận 1");
    expect(viApt.pets[0].breed).toBe("Corgi Wales");
  });

  it("normalizes care plans when switching language", () => {
    const plan = INITIAL_SEED_CARE_PLANS[0];
    const enPlan = localizeCarePlan(plan, true);
    expect(enPlan.diagnosis).toBe("Treatment protocol for contact allergy dermatitis & epidermal barrier recovery");
    expect(enPlan.clinicName).toBe("PetCare Veterinary Clinic · District 1");
    expect(enPlan.tasks[0].title).toBe("Therapeutic bath with Malaseb medicinal shampoo twice weekly");

    const viPlan = localizeCarePlan(enPlan, false);
    expect(viPlan.diagnosis).toBe("Phác đồ kiểm soát viêm da dị ứng tiếp xúc & hồi phục biểu bì");
    expect(viPlan.tasks[0].title).toBe("Tắm trị liệu bằng sữa tắm Malaseb dược liệu 2 lần/tuần");
  });

  it("normalizes clinic specialties, districts, and facility names accurately", () => {
    // 1. Specialty tags from user report
    expect(localizeClinicSpecialty("Thức ăn hạt & Dinh dưỡng", true)).toBe("Pet Food & Nutrition");
    expect(localizeClinicSpecialty("Phụ kiện & Đồ chơi", true)).toBe("Accessories & Toys");
    expect(localizeClinicSpecialty("Cửa hàng phụ kiện & Dinh dưỡng", true)).toBe("Supplies & Nutrition Store");
    expect(localizeClinicSpecialty("Khách sạn lưu chuồng", true)).toBe("Pet Boarding Hotel");
    expect(localizeClinicSpecialty("Spa làm đẹp", true)).toBe("Beauty Spa & Styling");
    expect(localizeClinicSpecialty("Vòng cổ thông minh", true)).toBe("Smart Collars & Gear");

    // Bi-directional reverse
    expect(localizeClinicSpecialty("Pet Food & Nutrition", false)).toBe("Thức ăn hạt & Dinh dưỡng");
    expect(localizeClinicSpecialty("Accessories & Toys", false)).toBe("Phụ kiện & Đồ chơi");
    expect(localizeClinicSpecialty("Supplies & Nutrition Store", false)).toBe("Cửa hàng phụ kiện & Dinh dưỡng");
    expect(localizeClinicSpecialty("Pet Boarding Hotel", false)).toBe("Khách sạn thú cưng");

    // Dynamic keyword fallback for newly added specialties
    expect(localizeClinicSpecialty("Đồ chơi gặm nướu thú cưng", true)).toBe("Accessories & Toys");
    expect(localizeClinicSpecialty("Lưu chuồng dài ngày", true)).toBe("Pet Boarding Hotel");
    expect(localizeClinicSpecialty("Tỉa lông nghệ thuật", true)).toBe("Pet Spa & Grooming");

    // 2. Districts
    expect(localizeDistrict("Quận 1", true)).toBe("District 1");
    expect(localizeDistrict("Quận 3", true)).toBe("District 3");
    expect(localizeDistrict("District 1", false)).toBe("Quận 1");
    expect(localizeDistrict("District 7", false)).toBe("Quận 7");
    expect(localizeDistrict("Quận 10", true)).toBe("District 10");

    // 3. Facility names
    expect(localizeClinicName("Pet Mart Thú Cưng & Spa Phụ Kiện · Quận 1", true)).toBe(
      "Pet Mart Pet Boutique & Spa Supplies · District 1"
    );
    expect(localizeClinicName("Happy Pet Kingdom & Phụ Kiện · Quận 3", true)).toBe(
      "Happy Pet Kingdom & Accessories · District 3"
    );

    // Dynamic pattern for newly added facilities
    expect(localizeClinicName("Phòng Khám Thú Y Gia Định · Quận 10", true)).toBe(
      "Veterinary Clinic Gia Định · District 10"
    );
  });

  it("normalizes complete ClinicDetail objects across English and Vietnamese", () => {
    const rawVietnameseClinic: ClinicDetail = {
      id: "happypet-d3",
      name: "Happy Pet Kingdom & Phụ Kiện · Quận 3",
      address: "210 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP.HCM",
      district: "Quận 3",
      phone: "028 3932 7788",
      facilityType: "shop",
      specialties: ["Cửa hàng phụ kiện & Dinh dưỡng", "Khách sạn lưu chuồng", "Spa làm đẹp"],
      languages: ["Tiếng Việt", "Tiếng Anh"],
      is_24_7: false,
      verified: true,
      rating: 4.9,
      reviewCount: 134,
      description: "Vương quốc thú cưng phong phú tại Quận 3...",
      services: [
        {
          name: "Grooming & Spa tắm vệ sinh làm mượt lông",
          description: "Massage thư giãn...",
          price_vnd: 200000,
          duration_minutes: 50,
        },
      ],
      hours: [],
    };

    const enClinic = localizeClinic(rawVietnameseClinic, true);
    expect(enClinic.name).toBe("Happy Pet Kingdom & Accessories · District 3");
    expect(enClinic.address).toBe("210 Nam Ky Khoi Nghia, Ward 7, District 3, HCMC");
    expect(enClinic.district).toBe("District 3");
    expect(enClinic.specialties).toEqual([
      "Supplies & Nutrition Store",
      "Pet Boarding Hotel",
      "Beauty Spa & Styling",
    ]);
    expect(enClinic.languages).toEqual(["Vietnamese", "English"]);
    expect(enClinic.services[0].name).toBe("Grooming & Coat Smoothing Herbal Spa");
    expect(enClinic.services[0].description).toBe(
      "Relaxing massage, collagen conditioning, and adorable styling for dogs and cats."
    );
  });

  it("localizes reminders, owner names, and weight notes bi-directionally", () => {
    const viReminder = {
      id: "rem-1",
      petName: "Milo",
      title: "Tiêm nhắc lại Mũi dại định kỳ hàng năm",
      dueDate: "2026-11-15",
      category: "vaccine" as const,
      completed: false,
    };

    const enRem = localizeReminder(viReminder, true, "Bo");
    expect(enRem.petName).toBe("Bo");
    expect(enRem.title).toBe("Annual Rabies Booster Vaccination");

    const backToVi = localizeReminder(enRem, false, "Bơ");
    expect(backToVi.petName).toBe("Bơ");
    expect(backToVi.title).toBe("Tiêm nhắc lại Mũi dại định kỳ hàng năm");

    expect(localizePersonName("Lê Hoàng Yến", true)).toBe("Le Hoang Yen");
    expect(localizePersonName("Le Hoang Yen", false)).toBe("Lê Hoàng Yến");
    expect(localizePersonName("Trần Anh Khoa", true)).toBe("Tran Anh Khoa");
    expect(localizePersonName("Phạm Minh Đức", true)).toBe("Pham Minh Duc");
    expect(localizePersonName("Nguyễn Thu Trang", true)).toBe("Nguyen Thu Trang");

    expect(
      localizeWeightNote(
        "Cân nặng ghi nhận tại Phòng Khám Thú Y PetCare · Quận 1",
        true
      )
    ).toBe("Weight recorded at PetCare Veterinary Clinic · District 1");
  });
});
