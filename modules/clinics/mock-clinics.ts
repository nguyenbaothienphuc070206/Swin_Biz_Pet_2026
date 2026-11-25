export interface ClinicDetail {
  id: string;
  name: string;
  address: string;
  district: string;
  phone: string;
  distanceKm?: number;
  facilityType?: "clinic" | "hospital" | "spa" | "shop";
  featuredServices?: string[];
  specialties: string[];
  languages: string[];
  is_24_7: boolean;
  verified: boolean;
  rating: number;
  reviewCount: number;
  description: string;
  services: {
    name: string;
    description: string;
    price_vnd: number;
    duration_minutes: number;
  }[];
  hours: {
    weekday: number;
    opens_at: string;
    closes_at: string;
    closed: boolean;
  }[];
}

export interface FeaturedServiceDefinition {
  id: string;
  labelVi: string;
  labelEn: string;
  icon: string;
}

export const FEATURED_SERVICES: FeaturedServiceDefinition[] = [
  { id: "general", labelVi: "Khám tổng quát", labelEn: "General Checkup", icon: "🩺" },
  { id: "vaccine", labelVi: "Tiêm ngừa vắc-xin", labelEn: "Vaccinations", icon: "💉" },
  { id: "emergency", labelVi: "Cấp cứu 24/7", labelEn: "24/7 Emergency", icon: "🚨" },
  { id: "spa", labelVi: "Spa & Cắt tỉa lông", labelEn: "Pet Spa & Grooming", icon: "✂️" },
  { id: "dental", labelVi: "Chăm sóc nha khoa", labelEn: "Dental Care", icon: "🦷" },
  { id: "surgery", labelVi: "Phẫu thuật & Triệt sản", labelEn: "Surgery & Spaying", icon: "🩹" },
  { id: "ultrasound", labelVi: "Siêu âm & Xét nghiệm", labelEn: "Ultrasound & Lab", icon: "🔬" },
  { id: "hotel", labelVi: "Khách sạn thú cưng", labelEn: "Pet Hotel & Boarding", icon: "🏨" },
  { id: "dermatology", labelVi: "Da liễu & Trị nấm", labelEn: "Dermatology", icon: "🌿" },
  { id: "home_visit", labelVi: "Khám thú y tại nhà", labelEn: "House Call Vet", icon: "🏠" },
];

const fallbackClinicsVi: ClinicDetail[] = [
  {
    id: "vetcare-d3",
    name: "Phòng Khám Thú Y & Spa Bác Sĩ Tâm · Quận 3",
    address: "45 Lê Văn Sỹ, Phường 13, Quận 3, TP.HCM",
    district: "Quận 3",
    phone: "028 3931 5566",
    distanceKm: 0.8,
    facilityType: "clinic",
    featuredServices: ["general", "vaccine", "dental", "spa", "dermatology"],
    specialties: ["Khám tổng quát", "Tiêm phòng vắc-xin", "Nha khoa", "Spa vệ sinh", "Da liễu"],
    languages: ["Tiếng Việt", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.7,
    reviewCount: 68,
    description:
      "Phòng khám thú y và spa chăm sóc thú cưng uy tín tại trung tâm Quận 3. Nằm ở vị trí thuận tiện, đội ngũ bác sĩ tận tâm, trang bị máy xét nghiệm nhanh và dịch vụ cạo vôi răng không mê an toàn.",
    services: [
      {
        name: "Khám lâm sàng tổng quát & Đánh giá thể trạng",
        description: "Kiểm tra hô hấp, tuần hoàn, thân nhiệt và tai mắt mũi họng.",
        price_vnd: 120000,
        duration_minutes: 25,
      },
      {
        name: "Tiêm ngừa vắc-xin phòng bệnh & Tẩy giun định kỳ",
        description: "Vắc-xin nhập khẩu chính hãng, cấp tem kiểm định vào sổ y bạ.",
        price_vnd: 220000,
        duration_minutes: 20,
      },
      {
        name: "Cạo vôi răng & Vệ sinh mảng bám nướu",
        description: "Làm sạch răng miệng, khử hôi và đánh bóng men răng.",
        price_vnd: 300000,
        duration_minutes: 40,
      },
      {
        name: "Combo Spa tắm sấy vệ sinh 7 bước",
        description: "Tắm dưỡng mượt lông, vắt tuyến hôi, vệ sinh tai và cắt mài móng.",
        price_vnd: 200000,
        duration_minutes: 50,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "20:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "20:00", closed: false },
    ],
  },
  {
    id: "petcare-d1",
    name: "Phòng Khám Thú Y PetCare · Quận 1",
    address: "124 Nguyễn Thị Minh Khai, P. Bến Thành, Quận 1, TP.HCM",
    district: "Quận 1",
    phone: "028 3823 4567",
    distanceKm: 1.2,
    facilityType: "clinic",
    featuredServices: ["general", "vaccine", "emergency", "dental", "surgery"],
    specialties: ["Khám tổng quát", "Tiêm ngừa vắc-xin", "Cấp cứu 24/7", "Nha khoa thú cưng", "Phẫu thuật ngoại khoa"],
    languages: ["Tiếng Việt", "English"],
    is_24_7: true,
    verified: true,
    rating: 4.9,
    reviewCount: 148,
    description:
      "Phòng khám thú y tiêu chuẩn quốc tế tại trung tâm Quận 1, trang bị đầy đủ máy xét nghiệm sinh hóa, máy X-quang kỹ thuật số và đội ngũ bác sĩ trực cấp cứu 24/7.",
    services: [
      {
        name: "Khám sức khỏe tổng quát & Tư vấn dinh dưỡng",
        description: "Kiểm tra toàn diện tim phổi, mắt, tai, răng miệng và tư vấn khẩu phần.",
        price_vnd: 150000,
        duration_minutes: 30,
      },
      {
        name: "Tiêm ngừa vắc-xin 4 bệnh mèo / 7 bệnh chó",
        description: "Vắc-xin chính hãng nhập khẩu, cấp sổ tiêm điện tử PawCare Passport.",
        price_vnd: 250000,
        duration_minutes: 20,
      },
      {
        name: "Tiêm phòng Dại (Rabies) có gắn tem kiểm dịch",
        description: "Bảo hộ 1 năm phòng chống dại cho chó mèo theo quy định thú y.",
        price_vnd: 80000,
        duration_minutes: 15,
      },
      {
        name: "Cạo vôi răng & Vệ sinh nha khoa bằng máy siêu âm",
        description: "Loại bỏ mảng bám ố vàng, khử mùi hôi miệng, chống viêm nướu.",
        price_vnd: 350000,
        duration_minutes: 45,
      },
      {
        name: "Cấp cứu khẩn cấp ngoài giờ (24/7 Emergency)",
        description: "Xử lý ngộ độc, khó thở, sốc nhiệt, tai nạn chấn thương.",
        price_vnd: 300000,
        duration_minutes: 60,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 1, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 2, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 3, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 4, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 5, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 6, opens_at: "00:00", closes_at: "24:00", closed: false },
    ],
  },
  {
    id: "cholon-d5",
    name: "Bệnh Viện Thú Y Chợ Lớn · Quận 5",
    address: "88 Thuận Kiều, Phường 12, Quận 5, TP.HCM",
    district: "Quận 5",
    phone: "028 3955 8899",
    distanceKm: 2.7,
    facilityType: "hospital",
    featuredServices: ["surgery", "ultrasound", "hotel", "general", "vaccine"],
    specialties: ["Phẫu thuật chỉnh hình & Xương", "Siêu âm chẩn đoán hình ảnh", "Điều trị nội trú", "Lưu chuồng"],
    languages: ["Tiếng Việt", "中文"],
    is_24_7: false,
    verified: true,
    rating: 4.8,
    reviewCount: 92,
    description:
      "Bệnh viện chuyên khoa sâu với hơn 15 năm kinh nghiệm điều trị các ca gãy xương, sỏi thận, mổ đẻ và phẫu thuật nội soi thú cưng tại khu vực Chợ Lớn.",
    services: [
      {
        name: "Chụp X-quang kỹ thuật số & Siêu âm màu Doppler",
        description: "Chẩn đoán chính xác chấn thương xương khớp và bệnh lý nội tạng.",
        price_vnd: 300000,
        duration_minutes: 40,
      },
      {
        name: "Phẫu thuật triệt sản chó mèo an toàn",
        description: "Phương pháp phẫu thuật đường mổ nhỏ, hạn chế đau và mau lành vết thương.",
        price_vnd: 600000,
        duration_minutes: 60,
      },
      {
        name: "Lưu viện điều trị nội trú & Chăm sóc hậu phẫu",
        description: "Chuồng cách ly vô trùng có sưởi ấm, theo dõi sinh hiệu 24/24.",
        price_vnd: 200000,
        duration_minutes: 1440,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "18:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "21:00", closed: false },
    ],
  },
  {
    id: "furry-spa-d2",
    name: "Furry Friends Luxury Pet Spa & Hotel · Thảo Điền Quận 2",
    address: "28 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
    district: "TP. Thủ Đức",
    phone: "093 888 9922",
    distanceKm: 3.2,
    facilityType: "spa",
    featuredServices: ["spa", "hotel", "dermatology", "dental"],
    specialties: ["Spa cắt tỉa lông tạo kiểu", "Khách sạn thú cưng 5 sao", "Tắm sục Ozon trị liệu da", "Chăm sóc nha khoa"],
    languages: ["Tiếng Việt", "English", "Français"],
    is_24_7: false,
    verified: true,
    rating: 5.0,
    reviewCount: 185,
    description:
      "Tổ hợp Spa & Khách sạn nghỉ dưỡng thú cưng chuẩn 5 sao được đánh giá cao nhất tại Thảo Điền. Phòng ốc máy lạnh riêng biệt, camera theo dõi 24/7 cho chủ nuôi và đội ngũ Groomer đạt chứng chỉ quốc tế.",
    services: [
      {
        name: "Grooming & Cắt tỉa lông tạo kiểu nghệ thuật",
        description: "Cắt tỉa theo phong cách Hàn Quốc/Nhật Bản, dưỡng xả collagen mượt lông.",
        price_vnd: 350000,
        duration_minutes: 90,
      },
      {
        name: "Tắm sục vi khoáng Ozon & Trị liệu nấm da",
        description: "Bọt khí siêu mịn làm sạch sâu nang lông, diệt khuẩn và chống viêm da.",
        price_vnd: 280000,
        duration_minutes: 60,
      },
      {
        name: "Khách sạn thú cưng phòng Suite VIP có Camera 24/7",
        description: "Phòng riêng máy lạnh, chế độ ăn theo yêu cầu, 2 cữ dạo chơi mỗi ngày.",
        price_vnd: 300000,
        duration_minutes: 1440,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:30", closes_at: "19:30", closed: false },
      { weekday: 1, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 2, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 3, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 4, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 5, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 6, opens_at: "08:30", closes_at: "20:00", closed: false },
    ],
  },
  {
    id: "saigonpet-bt",
    name: "Phòng Khám Thú Y Sài Gòn Pet · Bình Thạnh",
    address: "312 Xô Viết Nghệ Tĩnh, Phường 25, Quận Bình Thạnh, TP.HCM",
    district: "Bình Thạnh",
    phone: "090 9123 456",
    distanceKm: 4.5,
    facilityType: "clinic",
    featuredServices: ["dermatology", "spa", "home_visit", "general"],
    specialties: ["Da liễu & Nấm ngứa", "Spa & Grooming làm đẹp", "Bác sĩ khám tận nhà", "Khám tổng quát"],
    languages: ["Tiếng Việt"],
    is_24_7: false,
    verified: true,
    rating: 4.7,
    reviewCount: 76,
    description:
      "Không gian chăm sóc thân thiện, không gây stress cho thú cưng. Chuyên khoa da liễu trị dứt điểm viêm da Demodex, nấm vảy gàu và dịch vụ đưa đón khám bệnh tận nhà.",
    services: [
      {
        name: "Xét nghiệm cạo da soi tươi & Phác đồ trị nấm",
        description: "Xác định chính xác loại vi khuẩn, nấm ký sinh trùng gây rụng lông.",
        price_vnd: 180000,
        duration_minutes: 30,
      },
      {
        name: "Tắm spa trị liệu, vệ sinh tai móng & Cắt tỉa lông tạo kiểu",
        description: "Sử dụng dầu tắm thảo dược dịu nhẹ và xông tinh dầu thư giãn.",
        price_vnd: 250000,
        duration_minutes: 60,
      },
      {
        name: "Bác sĩ thú y thăm khám & Tiêm chủng tại nhà",
        description: "Dành cho các bé mèo nhút nhát hoặc chủ nuôi bận rộn không tiện di chuyển.",
        price_vnd: 300000,
        duration_minutes: 45,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "19:00", closed: false },
      { weekday: 1, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 2, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 3, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 4, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 5, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 6, opens_at: "07:30", closes_at: "20:30", closed: false },
    ],
  },
  {
    id: "emergency-247-d7",
    name: "Bệnh Viện Cấp Cứu Thú Y Quốc Tế 24/7 · Quận 7",
    address: "15 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7, TP.HCM",
    district: "Quận 7",
    phone: "028 5412 9911",
    distanceKm: 5.8,
    facilityType: "hospital",
    featuredServices: ["emergency", "surgery", "ultrasound", "general", "vaccine", "hotel"],
    specialties: ["Cấp cứu & Hồi sức tích cực 24/7", "Phẫu thuật chấn thương", "Chẩn đoán hình ảnh CT Scanner", "Lưu chuồng ICU"],
    languages: ["Tiếng Việt", "English", "한국어"],
    is_24_7: true,
    verified: true,
    rating: 4.9,
    reviewCount: 210,
    description:
      "Bệnh viện cấp cứu thú y hiện đại bậc nhất khu đô thị Phú Mỹ Hưng, trang bị phòng mổ áp lực dương, lồng ấp oxy ICU và bác sĩ chuyên khoa hồi sức cấp cứu túc trực 24/24.",
    services: [
      {
        name: "Cấp cứu sốc phản vệ, khó thở & Chấn thương giao thông",
        description: "Hồi sức cấp cứu tức thì bằng máy thở oxy và truyền dịch điều tốc.",
        price_vnd: 400000,
        duration_minutes: 60,
      },
      {
        name: "Phẫu thuật cấp cứu ngoại khoa & Mổ đẻ khẩn cấp",
        description: "Phòng mổ vô trùng tiêu chuẩn cao, bác sĩ ngoại khoa giàu kinh nghiệm.",
        price_vnd: 1200000,
        duration_minutes: 90,
      },
      {
        name: "Lưu viện chăm sóc tích cực lồng oxy ICU",
        description: "Giám sát điện tim, huyết áp và nồng độ oxy máu liên tục.",
        price_vnd: 450000,
        duration_minutes: 1440,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 1, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 2, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 3, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 4, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 5, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 6, opens_at: "00:00", closes_at: "24:00", closed: false },
    ],
  },
  {
    id: "petmart-d1",
    name: "Pet Mart Thú Cưng & Spa Phụ Kiện · Quận 1",
    address: "116 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM",
    district: "Quận 1",
    phone: "028 7300 3322",
    distanceKm: 1.5,
    facilityType: "shop",
    featuredServices: ["spa", "hotel", "dental"],
    specialties: ["Thức ăn hạt & Dinh dưỡng", "Phụ kiện & Đồ chơi", "Grooming Spa thú cưng", "Khách sạn thú cưng"],
    languages: ["Tiếng Việt", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.8,
    reviewCount: 112,
    description:
      "Chuỗi cửa hàng vật phẩm thú cưng, spa tạo kiểu và khách sạn lưu trú uy tín tại trung tâm Quận 1. Đầy đủ các dòng thức ăn nhập khẩu chính hãng, sữa tắm dưỡng lông và phụ kiện độc đáo.",
    services: [
      {
        name: "Combo Spa tắm cắt tỉa lông vệ sinh toàn diện",
        description: "Cắt móng, vệ sinh tai, vắt tuyến hôi, tắm thảo dược và sấy phồng lông.",
        price_vnd: 220000,
        duration_minutes: 60,
      },
      {
        name: "Lưu trú khách sạn thú cưng tiêu chuẩn",
        description: "Phòng máy lạnh sạch sẽ, khử khuẩn hàng ngày và chế độ ăn hạt cao cấp.",
        price_vnd: 180000,
        duration_minutes: 1440,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "22:00", closed: false },
    ],
  },
  {
    id: "happypet-d3",
    name: "Happy Pet Kingdom & Phụ Kiện · Quận 3",
    address: "210 Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP.HCM",
    district: "Quận 3",
    phone: "028 3932 7788",
    distanceKm: 1.0,
    facilityType: "shop",
    featuredServices: ["spa", "hotel", "dermatology"],
    specialties: ["Cửa hàng phụ kiện & Dinh dưỡng", "Khách sạn lưu chuồng", "Spa làm đẹp", "Vòng cổ thông minh"],
    languages: ["Tiếng Việt"],
    is_24_7: false,
    verified: true,
    rating: 4.9,
    reviewCount: 134,
    description:
      "Vương quốc thú cưng phong phú tại Quận 3 với hơn 1000 mặt hàng phụ kiện, thức ăn hạt, pate dinh dưỡng và dịch vụ lưu chuồng khách sạn thân thiện, thoáng mát.",
    services: [
      {
        name: "Grooming & Spa tắm vệ sinh làm mượt lông",
        description: "Massage thư giãn, dưỡng xả collagen và tạo kiểu dễ thương cho chó mèo.",
        price_vnd: 200000,
        duration_minutes: 50,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 1, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 2, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 3, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 4, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 5, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 6, opens_at: "08:30", closes_at: "21:30", closed: false },
    ],
  },
];

const fallbackClinicsEn: ClinicDetail[] = [
  {
    id: "vetcare-d3",
    name: "Dr. Tam Veterinary Clinic & Pet Spa · District 3",
    address: "45 Le Van Sy, Ward 13, District 3, HCMC",
    district: "District 3",
    phone: "028 3931 5566",
    distanceKm: 0.8,
    facilityType: "clinic",
    featuredServices: ["general", "vaccine", "dental", "spa", "dermatology"],
    specialties: ["General Practice", "Vaccinations", "Dentistry", "Hygienic Spa", "Dermatology"],
    languages: ["English", "Vietnamese"],
    is_24_7: false,
    verified: true,
    rating: 4.7,
    reviewCount: 68,
    description:
      "Trusted local vet and pet spa in District 3. Closest proximity, in-house rapid testing, and non-anesthetic ultrasonic dental cleaning.",
    services: [
      {
        name: "General Wellness Examination & Physical Assessment",
        description: "Checking vitals, heart, lungs, ears, eyes, and body condition score.",
        price_vnd: 120000,
        duration_minutes: 25,
      },
      {
        name: "Core Vaccination & Routine Deworming",
        description: "Imported vaccines recorded directly in PawCare digital health records.",
        price_vnd: 220000,
        duration_minutes: 20,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "20:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "20:30", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "20:00", closed: false },
    ],
  },
  {
    id: "petcare-d1",
    name: "PetCare Veterinary Clinic · District 1",
    address: "124 Nguyen Thi Minh Khai, Ben Thanh Ward, District 1, HCMC",
    district: "District 1",
    phone: "028 3823 4567",
    distanceKm: 1.2,
    facilityType: "clinic",
    featuredServices: ["general", "vaccine", "emergency", "dental", "surgery"],
    specialties: ["General Practice", "Vaccinations", "24/7 Emergency", "Veterinary Dentistry", "Surgery"],
    languages: ["English", "Vietnamese"],
    is_24_7: true,
    verified: true,
    rating: 4.9,
    reviewCount: 148,
    description:
      "International standard veterinary clinic in central District 1, fully equipped with in-house biochemistry lab, digital X-ray, and 24/7 emergency triage team.",
    services: [
      {
        name: "General Health Checkup & Dietary Consultation",
        description: "Comprehensive exam of heart, lungs, eyes, ears, teeth, and personalized diet plan.",
        price_vnd: 150000,
        duration_minutes: 30,
      },
      {
        name: "Feline 4-in-1 / Canine 7-in-1 Core Vaccination",
        description: "Authentic imported vaccines with automated PawCare digital passport issuance.",
        price_vnd: 250000,
        duration_minutes: 20,
      },
      {
        name: "After-Hours Emergency Triage (24/7)",
        description: "Rapid intervention for poisoning, respiratory distress, heatstroke, and trauma.",
        price_vnd: 300000,
        duration_minutes: 60,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 1, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 2, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 3, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 4, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 5, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 6, opens_at: "00:00", closes_at: "24:00", closed: false },
    ],
  },
  {
    id: "cholon-d5",
    name: "Cho Lon Veterinary Hospital · District 5",
    address: "88 Thuan Kieu, Ward 12, District 5, HCMC",
    district: "District 5",
    phone: "028 3955 8899",
    distanceKm: 2.7,
    facilityType: "hospital",
    featuredServices: ["surgery", "ultrasound", "hotel", "general", "vaccine"],
    specialties: ["Orthopedic & Bone Surgery", "Color Doppler Ultrasound", "Inpatient Hospitalization"],
    languages: ["Vietnamese", "Chinese", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.8,
    reviewCount: 92,
    description:
      "Specialized veterinary hospital with over 15 years of surgical experience in bone fractures, urinary stone removal, C-sections, and endoscopy in Cho Lon.",
    services: [
      {
        name: "Digital X-Ray & Color Doppler Ultrasound",
        description: "High-precision diagnosis of musculoskeletal trauma and internal organ conditions.",
        price_vnd: 300000,
        duration_minutes: 40,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "18:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "21:00", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "21:00", closed: false },
    ],
  },
  {
    id: "furry-spa-d2",
    name: "Furry Friends Luxury Pet Spa & Hotel · Thao Dien District 2",
    address: "28 Thao Dien, Thao Dien Ward, Thu Duc City, HCMC",
    district: "District 2",
    phone: "093 888 9922",
    distanceKm: 3.2,
    facilityType: "spa",
    featuredServices: ["spa", "hotel", "dermatology", "dental"],
    specialties: ["Luxury Pet Spa", "5-Star Pet Hotel", "Ozone Microbubble Therapy", "Dental Care"],
    languages: ["English", "Vietnamese", "French"],
    is_24_7: false,
    verified: true,
    rating: 5.0,
    reviewCount: 185,
    description:
      "Top-rated luxury pet resort and styling boutique in Thao Dien. Air-conditioned private suites with 24/7 webcams and certified professional groomers.",
    services: [
      {
        name: "Artistic Grooming & Styling",
        description: "Korean/Japanese styling with organic coats conditioner.",
        price_vnd: 350000,
        duration_minutes: 90,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:30", closes_at: "19:30", closed: false },
      { weekday: 1, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 2, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 3, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 4, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 5, opens_at: "08:30", closes_at: "20:00", closed: false },
      { weekday: 6, opens_at: "08:30", closes_at: "20:00", closed: false },
    ],
  },
  {
    id: "saigonpet-bt",
    name: "Saigon Pet Veterinary Clinic · Binh Thanh",
    address: "312 Xo Viet Nghe Tinh, Ward 25, Binh Thanh District, HCMC",
    district: "Binh Thanh",
    phone: "090 9123 456",
    distanceKm: 4.5,
    facilityType: "clinic",
    featuredServices: ["dermatology", "spa", "home_visit", "general"],
    specialties: ["Dermatology & Fungal Care", "Spa & Grooming", "House Call Vet"],
    languages: ["Vietnamese", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.7,
    reviewCount: 76,
    description:
      "Fear-free, stress-reducing clinic environment. Specialized dermatology treatment for Demodex mites, dandruff fungus, and dedicated house call veterinary services.",
    services: [
      {
        name: "Skin Scraping Microscopy & Antifungal Protocol",
        description: "Accurate identification of bacterial and mite infestations causing alopecia.",
        price_vnd: 180000,
        duration_minutes: 30,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "19:00", closed: false },
      { weekday: 1, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 2, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 3, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 4, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 5, opens_at: "07:30", closes_at: "20:30", closed: false },
      { weekday: 6, opens_at: "07:30", closes_at: "20:30", closed: false },
    ],
  },
  {
    id: "emergency-247-d7",
    name: "International 24/7 Veterinary Emergency Hospital · District 7",
    address: "15 Nguyen Luong Bang, Tan Phu, District 7, HCMC",
    district: "District 7",
    phone: "028 5412 9911",
    distanceKm: 5.8,
    facilityType: "hospital",
    featuredServices: ["emergency", "surgery", "ultrasound", "general", "vaccine", "hotel"],
    specialties: ["24/7 Intensive Care (ICU)", "Trauma Surgery", "CT Scanner Imaging", "ICU Isolation Boarding"],
    languages: ["English", "Vietnamese", "Korean"],
    is_24_7: true,
    verified: true,
    rating: 4.9,
    reviewCount: 210,
    description:
      "Leading veterinary emergency hospital in Phu My Hung with positive-pressure surgical suites and 24/7 on-site intensivists.",
    services: [
      {
        name: "Emergency Triage, Shock & Trauma Resuscitation",
        description: "Immediate oxygenation, ventilator support, and blood transfusion ready.",
        price_vnd: 400000,
        duration_minutes: 60,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 1, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 2, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 3, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 4, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 5, opens_at: "00:00", closes_at: "24:00", closed: false },
      { weekday: 6, opens_at: "00:00", closes_at: "24:00", closed: false },
    ],
  },
  {
    id: "petmart-d1",
    name: "Pet Mart Pet Boutique & Spa Supplies · District 1",
    address: "116 Pasteur, Ben Nghe Ward, District 1, HCMC",
    district: "District 1",
    phone: "028 7300 3322",
    distanceKm: 1.5,
    facilityType: "shop",
    featuredServices: ["spa", "hotel", "dental"],
    specialties: ["Pet Food & Nutrition", "Accessories & Toys", "Pet Grooming Spa", "Pet Boarding Hotel"],
    languages: ["Vietnamese", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.8,
    reviewCount: 112,
    description:
      "Premier pet boutique, professional styling salon, and boarding hotel in central District 1. Offering imported holistic food, coat nourishing bath products, and unique pet accessories.",
    services: [
      {
        name: "Full 7-Step Grooming & Styling Spa Combo",
        description: "Nail trim, ear cleaning, gland expression, herbal bath, and blow-dry.",
        price_vnd: 220000,
        duration_minutes: 60,
      },
      {
        name: "Standard Pet Boarding Hotel Stay",
        description: "Clean air-conditioned suites with daily disinfection and premium kibble diet.",
        price_vnd: 180000,
        duration_minutes: 1440,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 1, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 2, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 3, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 4, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 5, opens_at: "08:00", closes_at: "22:00", closed: false },
      { weekday: 6, opens_at: "08:00", closes_at: "22:00", closed: false },
    ],
  },
  {
    id: "happypet-d3",
    name: "Happy Pet Kingdom & Accessories · District 3",
    address: "210 Nam Ky Khoi Nghia, Ward 7, District 3, HCMC",
    district: "District 3",
    phone: "028 3932 7788",
    distanceKm: 1.0,
    facilityType: "shop",
    featuredServices: ["spa", "hotel", "dermatology"],
    specialties: ["Supplies & Nutrition Store", "Pet Boarding Hotel", "Beauty Spa & Styling", "Smart Collars & Gear"],
    languages: ["Vietnamese", "English"],
    is_24_7: false,
    verified: true,
    rating: 4.9,
    reviewCount: 134,
    description:
      "Vibrant pet superstore in District 3 featuring over 1,000 accessories, organic kibbles, wet pâté, and ventilated, pet-friendly hotel suites.",
    services: [
      {
        name: "Grooming & Coat Smoothing Herbal Spa",
        description: "Relaxing massage, collagen conditioning, and adorable styling for dogs and cats.",
        price_vnd: 200000,
        duration_minutes: 50,
      },
    ],
    hours: [
      { weekday: 0, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 1, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 2, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 3, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 4, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 5, opens_at: "08:30", closes_at: "21:30", closed: false },
      { weekday: 6, opens_at: "08:30", closes_at: "21:30", closed: false },
    ],
  },
];

export const fallbackClinics = fallbackClinicsVi;

export function getFallbackClinics(locale?: string): ClinicDetail[] {
  return locale === "en" ? fallbackClinicsEn : fallbackClinicsVi;
}

export function getFallbackClinicById(id: string, locale?: string): ClinicDetail | null {
  const list = getFallbackClinics(locale);
  return list.find((c) => c.id === id) ?? null;
}
