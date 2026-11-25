export type CareFrequency = "daily" | "weekly" | "monthly" | "once";

export interface CareTaskItem {
  id: string;
  title: string;
  category: "vaccination" | "treatment" | "diet" | "hygiene" | "checkup";
  frequency?: CareFrequency;
  scheduleDescription?: string;
  dueDate: string;
  vetVisitRequired: boolean;
  notes?: string;
  completed: boolean;
}

export interface CarePlanProposal {
  id: string;
  petId: string;
  petName: string;
  ownerName: string;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  diagnosis: string;
  status: "pending_owner" | "active" | "completed";
  horizonMonths: number;
  createdAt: string;
  updatedAt: string;
  nextFollowUpDate: string;
  dietInstructions?: string;
  generalNotes?: string;
  tasks: CareTaskItem[];
}

export const INITIAL_SEED_CARE_PLANS: CarePlanProposal[] = [
  {
    id: "plan-petcare-01",
    petId: "default-pet-1",
    petName: "Bơ",
    ownerName: "Nguyễn Văn An",
    clinicId: "petcare-d1",
    clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
    doctorName: "BS. Nguyễn Văn Cường (Chuyên khoa Da liễu & Ngoại trú)",
    diagnosis: "Phác đồ kiểm soát viêm da dị ứng tiếp xúc & hồi phục biểu bì",
    status: "active",
    horizonMonths: 3,
    createdAt: "2026-10-15T08:30:00Z",
    updatedAt: "2026-10-20T09:00:00Z",
    nextFollowUpDate: "2026-10-29",
    dietInstructions: "Kiêng thịt bò, gà và phụ gia cay nồng. Sử dụng hạt dinh dưỡng đạm thủy phân hoặc cá hồi tự nhiên.",
    generalNotes: "Vệ sinh vùng kẽ chân và tai sau mỗi lần đi dạo ngoài trời. Nếu phát hiện đỏ da hoặc cắn đuôi liên tục, liên hệ phòng khám ngay.",
    tasks: [
      // 📅 HÀNG TUẦN (WEEKLY) - task-01 first to keep backwards compatibility with tests
      {
        id: "task-01",
        title: "Tắm trị liệu bằng sữa tắm Malaseb dược liệu 2 lần/tuần",
        category: "hygiene",
        frequency: "weekly",
        scheduleDescription: "Thứ 4 & Chủ nhật",
        dueDate: "2026-10-26",
        vetVisitRequired: false,
        notes: "Massage bọt thuốc trên da 10 phút trước khi xả sạch bằng nước ấm vừa phải.",
        completed: false,
      },
      {
        id: "task-01-w2",
        title: "Giặt đệm nằm & khử khuẩn chuồng, khay ăn bát nước",
        category: "hygiene",
        frequency: "weekly",
        scheduleDescription: "Chủ nhật hàng tuần",
        dueDate: "2026-10-26",
        vetVisitRequired: false,
        notes: "Ngâm giặt nước ấm 60°C hoặc phơi nắng để triệt tiêu nấm và bọ mạt.",
        completed: false,
      },

      // ☀️ HẰNG NGÀY (DAILY)
      {
        id: "task-01-d1",
        title: "Uống viên bổ sung Axit béo Omega 3-6 phục hồi màng lipid biểu bì",
        category: "treatment",
        frequency: "daily",
        scheduleDescription: "Mỗi sáng cùng thức ăn",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Cho uống 1 viên vào bữa sáng cùng thức ăn để tăng hấp thu dầu cá.",
        completed: true,
      },
      {
        id: "task-01-d2",
        title: "Vệ sinh kẽ chân & lau khô vùng nếp gấp da sau khi đi dạo",
        category: "hygiene",
        frequency: "daily",
        scheduleDescription: "Mỗi tối sau khi đi dạo ngoài trời",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Dùng khăn ẩm nước muối sinh lý lau nhẹ, sau đó sấy khô thoáng kẽ chân.",
        completed: false,
      },
      {
        id: "task-01-d3",
        title: "Khẩu phần ăn hạt đạm thủy phân kiêng tuyệt đối thịt bò & gà",
        category: "diet",
        frequency: "daily",
        scheduleDescription: "Sáng 60g · Tối 60g",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Không cho ăn thức ăn vặt có chứa gluten hay gia vị của người.",
        completed: true,
      },

      // 🗓️ HÀNG THÁNG & TÁI KHÁM (MONTHLY)
      {
        id: "task-01-m1",
        title: "Nhỏ gáy phòng ngừa ve rận & ghẻ Demodex (Bravecto/Revolution)",
        category: "treatment",
        frequency: "monthly",
        scheduleDescription: "Ngày 25 hàng tháng",
        dueDate: "2026-10-25",
        vetVisitRequired: false,
        notes: "Vạch lông nhỏ trực tiếp lên bề mặt da gáy cổ, không tắm trong 48h sau nhỏ.",
        completed: false,
      },
      {
        id: "task-03",
        title: "Tái khám soi kính hiển vi tế bào da & kiểm tra độ ngứa",
        category: "checkup",
        frequency: "monthly",
        scheduleDescription: "Ngày 29/10/2026",
        dueDate: "2026-10-29",
        vetVisitRequired: true,
        notes: "Khám trực tiếp tại PetCare Q1 với BS. Cường.",
        completed: false,
      },
      {
        id: "task-04",
        title: "Tiêm phòng nhắc lại vắc-xin tổng hợp định kỳ năm",
        category: "vaccination",
        frequency: "monthly",
        scheduleDescription: "Ngày 15/11/2026",
        dueDate: "2026-11-15",
        vetVisitRequired: true,
        notes: "Đảm bảo bé không sốt trong vòng 3 ngày trước tiêm.",
        completed: false,
      },
    ],
  },
  {
    id: "plan-petcare-02",
    petId: "default-pet-2",
    petName: "Miu",
    ownerName: "Nguyễn Văn An",
    clinicId: "petcare-d1",
    clinicName: "Phòng Khám Thú Y PetCare · Quận 1",
    doctorName: "BS. Trần Thu Hà (Chuyên khoa Nội nhi & Tiêu hóa)",
    diagnosis: "Kế hoạch quản lý dinh dưỡng kiểm soát búi lông & phòng ngừa sỏi tiết niệu",
    status: "pending_owner",
    horizonMonths: 6,
    createdAt: "2026-10-21T14:15:00Z",
    updatedAt: "2026-10-21T14:15:00Z",
    nextFollowUpDate: "2026-11-20",
    dietInstructions: "Bổ sung gel tiêu búi lông 2 lần/tuần. Duy trì ít nhất 2 bát nước sạch tại các góc nhà để khuyến khích uống nước.",
    generalNotes: "Theo dõi lượng nước tiểu hàng ngày và hành vi đi vệ sinh vào khay cát.",
    tasks: [
      // ☀️ HẰNG NGÀY (DAILY)
      {
        id: "task-02-d1",
        title: "Chải lông hàng ngày 10-15 phút bằng lược chuyên dụng lấy lông chết",
        category: "hygiene",
        frequency: "daily",
        scheduleDescription: "Mỗi tối trước khi ngủ",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Tập trung phần ức và bụng dưới để giảm lượng lông mèo tự liếm nuốt vào bụng.",
        completed: false,
      },
      {
        id: "task-02-d2",
        title: "Thay nước sạch lọc và vệ sinh 2-3 bát nước đặt quanh nhà",
        category: "diet",
        frequency: "daily",
        scheduleDescription: "2 lần/ngày (Sáng & Tối)",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Khuyến khích mèo uống nhiều nước để làm loãng nước tiểu và thông bàng quang.",
        completed: false,
      },
      {
        id: "task-02-d3",
        title: "Dọn dẹp khay cát & kiểm tra số lượng vón nước tiểu",
        category: "hygiene",
        frequency: "daily",
        scheduleDescription: "Sáng & Tối mỗi ngày",
        dueDate: "2026-10-23",
        vetVisitRequired: false,
        notes: "Nếu thấy mèo ngồi khay cát lâu mà không tiểu hoặc tiểu rắt, báo ngay cho bác sĩ.",
        completed: false,
      },

      // 📅 HÀNG TUẦN (WEEKLY)
      {
        id: "task-05",
        title: "Bổ sung gel tiêu búi lông Malt Paste 2 lần/tuần",
        category: "diet",
        frequency: "weekly",
        scheduleDescription: "Thứ 3 & Thứ 7",
        dueDate: "2026-10-25",
        vetVisitRequired: false,
        notes: "Bóp khoảng 2-3cm cho ăn trực tiếp hoặc trộn vào pate yêu thích.",
        completed: false,
      },
      {
        id: "task-02-w2",
        title: "Khử khuẩn toàn phần khay cát & thay mới 100% cát lót",
        category: "hygiene",
        frequency: "weekly",
        scheduleDescription: "Thứ 7 hàng tuần",
        dueDate: "2026-10-25",
        vetVisitRequired: false,
        notes: "Rửa khay bằng xà phòng nhẹ, phơi khô ráo để tránh nấm mốc.",
        completed: false,
      },

      // 🗓️ HÀNG THÁNG & TÁI KHÁM (MONTHLY)
      {
        id: "task-02-m1",
        title: "Cân kiểm tra thể trọng định kỳ kiểm soát nguy cơ béo phì",
        category: "checkup",
        frequency: "monthly",
        scheduleDescription: "Ngày 01 hàng tháng",
        dueDate: "2026-11-01",
        vetVisitRequired: false,
        notes: "Mục tiêu duy trì thể trạng 4.2kg - 4.5kg, tránh tăng cân gây áp lực thận.",
        completed: false,
      },
      {
        id: "task-06",
        title: "Tái khám siêu âm bàng quang & xét nghiệm nước tiểu",
        category: "checkup",
        frequency: "monthly",
        scheduleDescription: "Ngày 20/11/2026",
        dueDate: "2026-11-20",
        vetVisitRequired: true,
        notes: "Kiểm tra dự phòng cặn sỏi struvite. Giữ mèo nhịn tiểu trước khám 1 tiếng.",
        completed: false,
      },
    ],
  },
];
