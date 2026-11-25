export interface SeedPetDetail {
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
}

export interface SeedAppointment {
  id: string;
  petName: string;
  petCount: number;
  pets: SeedPetDetail[];
  ownerName: string;
  ownerPhone: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  service: string;
  date: string;
  time: string;
  doctor: string;
  status: "confirmed" | "pending" | "completed" | "canceled";
  notes?: string;
  isPriority?: boolean;
}

/**
 * Standard seed appointments for demo:
 * 1. Pending: Online booking awaiting clinic confirmation (Bơ / Bo)
 * 2. Completed: Finished appointment with exam notes and vaccine (Mochi)
 * 3. Declined: Appointment declined by clinic with explanation note (Lu)
 */
export function getInitialSeedAppointments(isEn = false): SeedAppointment[] {
  const todayStr = new Date().toISOString().split("T")[0];

  return [
    {
      id: "apt-demo-pending-01",
      petName: isEn ? "Bo" : "Bơ",
      petCount: 1,
      pets: [
        {
          id: "pet-bo",
          name: isEn ? "Bo" : "Bơ",
          species: "cat",
          breed: isEn ? "British Shorthair (Golden)" : "Mèo Anh lông ngắn (Golden)",
          age: isEn ? "2 years" : "2 tuổi",
          weightKg: 4.2,
          microchip: "982000499887766",
          allergies: isEn ? ["Beef", "Shellfish"] : ["Thịt bò", "Hải sản có vỏ"],
          service: isEn
            ? "Dermatology Exam & Microscopic Cytology Scrape"
            : "Khám da liễu & soi ký sinh trùng vi mô",
        },
      ],
      ownerName: isEn ? "Le Hoang Yen" : "Lê Hoàng Yến",
      ownerPhone: "0987 654 321",
      clinicName: isEn
        ? "PetCare Veterinary Clinic · District 1"
        : "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: isEn
        ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC"
        : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: isEn
        ? "Dermatology Exam & Microscopic Cytology Scrape"
        : "Khám da liễu & soi ký sinh trùng vi mô",
      date: todayStr,
      time: "14:30",
      doctor: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
      status: "pending",
      notes: isEn
        ? "Cat scratching neck and base of ears for 2 days, suspected contact allergic dermatitis. Owner submitted online booking awaiting clinic confirmation."
        : "Bé gãi nhiều vùng cổ và gốc tai 2 ngày nay, nghi viêm da dị ứng tiếp xúc. Chủ nuôi gửi yêu cầu đặt hẹn trực tuyến chờ phòng khám xác nhận.",
    },
    {
      id: "apt-demo-completed-02",
      petName: "Mochi",
      petCount: 1,
      pets: [
        {
          id: "pet-mochi",
          name: "Mochi",
          species: "dog",
          breed: isEn ? "Pembroke Welsh Corgi" : "Corgi Wales Pembroke",
          age: isEn ? "1.5 years" : "1.5 tuổi",
          weightKg: 11.5,
          microchip: "982000412345678",
          allergies: [],
          service: isEn
            ? "Routine Rabies & 5-in-1 Combination Vaccine"
            : "Tiêm phòng vắc-xin dại & 7 bệnh định kỳ",
        },
      ],
      ownerName: isEn ? "Tran Anh Khoa" : "Trần Anh Khoa",
      ownerPhone: "0912 345 678",
      clinicName: isEn
        ? "PetCare Veterinary Clinic · District 1"
        : "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: isEn
        ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC"
        : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: isEn
        ? "Routine Rabies & 5-in-1 Combination Vaccine"
        : "Tiêm phòng vắc-xin dại & 7 bệnh định kỳ",
      date: todayStr,
      time: "09:00",
      doctor: isEn ? "Dr. Tran Thu Ha" : "BS. Trần Thu Hà",
      status: "completed",
      notes: isEn
        ? "Clinical exam & vaccination completed (Rabies + Vanguard Plus 5/L). Temperature 38.5°C, stable vitals. Digital immunization certificate issued."
        : "Đã hoàn thành khám lâm sàng & tiêm phòng vắc-xin Rabies + Vanguard Plus 5/L. Thân nhiệt 38.5°C, sức khỏe ổn định. Cấp chứng chỉ tiêm chủng điện tử thành công.",
    },
    {
      id: "apt-demo-declined-03",
      petName: "Lu",
      petCount: 1,
      pets: [
        {
          id: "pet-lu",
          name: "Lu",
          species: "dog",
          breed: isEn ? "Toy Poodle" : "Poodle Toy",
          age: isEn ? "3 years" : "3 tuổi",
          weightKg: 3.8,
          microchip: "982000411223344",
          allergies: isEn ? ["Penicillin Antibiotic"] : ["Kháng sinh Penicillin"],
          service: isEn
            ? "Dental Scaling & Extraction Under Anesthesia"
            : "Phẫu thuật cạo vôi răng & nhổ răng sâu dưới gây mê",
        },
      ],
      ownerName: isEn ? "Pham Minh Duc" : "Phạm Minh Đức",
      ownerPhone: "0903 112 233",
      clinicName: isEn
        ? "PetCare Veterinary Clinic · District 1"
        : "Phòng Khám Thú Y PetCare · Quận 1",
      clinicAddress: isEn
        ? "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC"
        : "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
      clinicPhone: "028 3823 4567",
      service: isEn
        ? "Dental Scaling & Extraction Under Anesthesia"
        : "Phẫu thuật cạo vôi răng & nhổ răng sâu dưới gây mê",
      date: todayStr,
      time: "11:00",
      doctor: isEn ? "Dr. Nguyen Van Cuong" : "BS. Nguyễn Văn Cường",
      status: "canceled",
      notes: isEn
        ? "Appointment declined: Surgery suite fully occupied with midday emergency procedures. Clinic staff called owner to reschedule to 09:00 AM tomorrow (fast 8 hours before surgery)."
        : "Từ chối lịch hẹn: Phòng mổ kín lịch phẫu thuật cấp cứu trưa nay. Phòng khám đã liên hệ chủ nuôi dời sang 09:00 sáng mai và dặn nhịn ăn 8 tiếng trước mổ.",
    },
  ];
}
