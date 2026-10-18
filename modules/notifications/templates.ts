export type NotificationTemplateKey = "appointment_reminder" | "vaccine_due" | "care_plan_task" | "review_request" | "sos_clinic_dispatch" | "sos_clinic_accepted";
export type Locale = "vi" | "en";
export interface RenderedTemplate { subject: string; title: string; body: string; href: string; unsubscribe: string }
const templates: Record<Locale, Record<NotificationTemplateKey, { subject: string; title: string; body: (payload: Record<string, unknown>) => string; href: string }>> = {
  vi: {
    appointment_reminder: { subject: "Nhắc lịch hẹn PawCare", title: "Sắp đến lịch hẹn", body: p => `Bạn có lịch hẹn vào ${String(p.starts_at ?? "thời gian đã đặt")}.`, href: "/owner/bookings" },
    vaccine_due: { subject: "Nhắc lịch vaccine", title: "Đã đến lịch vaccine", body: p => `${String(p.vaccine_name ?? "Vaccine")} đến hạn vào ${String(p.due_at ?? "ngày đã ghi nhận")}.`, href: "/owner" },
    care_plan_task: { subject: "Nhiệm vụ chăm sóc PawCare", title: "Có nhiệm vụ chăm sóc mới", body: p => `${String(p.task_key ?? "Nhiệm vụ")} cần hoàn thành vào ${String(p.due_at ?? "ngày đã ghi nhận")}.`, href: "/owner/care-plans" },
    review_request: { subject: "Chia sẻ trải nghiệm khám", title: "Bạn có thể đánh giá buổi khám", body: () => "Đánh giá chỉ mở sau buổi khám đã hoàn tất.", href: "/owner/bookings" },
    sos_clinic_dispatch: { subject: "Yêu cầu SOS gần phòng khám", title: "Có yêu cầu SOS mới", body: () => "Mở hộp thư SOS để xem và phản hồi yêu cầu.", href: "/clinic" },
    sos_clinic_accepted: { subject: "Phòng khám đã nhận SOS", title: "Đã có phòng khám tiếp nhận", body: () => "Mở PawCare để xem trạng thái kết nối.", href: "/owner/sos" },
  },
  en: {
    appointment_reminder: { subject: "PawCare appointment reminder", title: "Your appointment is coming up", body: p => `Your appointment is scheduled for ${String(p.starts_at ?? "the booked time")}.`, href: "/owner/bookings" },
    vaccine_due: { subject: "Vaccination reminder", title: "A vaccination is due", body: p => `${String(p.vaccine_name ?? "Vaccination")} is due on ${String(p.due_at ?? "the recorded date")}.`, href: "/owner" },
    care_plan_task: { subject: "PawCare care task", title: "A care task is due", body: p => `${String(p.task_key ?? "Care task")} is due on ${String(p.due_at ?? "the recorded date")}.`, href: "/owner/care-plans" },
    review_request: { subject: "Share your visit experience", title: "You can review your visit", body: () => "Reviews are available after a completed appointment.", href: "/owner/bookings" },
    sos_clinic_dispatch: { subject: "Nearby SOS request", title: "A new SOS request is available", body: () => "Open the SOS inbox to review and respond.", href: "/clinic" },
    sos_clinic_accepted: { subject: "A clinic accepted your SOS", title: "A clinic has accepted", body: () => "Open PawCare to view the connection status.", href: "/owner/sos" },
  },
};
export function renderNotification(key: NotificationTemplateKey, locale: Locale, payload: Record<string, unknown>): RenderedTemplate {
  const template = templates[locale][key];
  return { subject: template.subject, title: template.title, body: template.body(payload), href: template.href, unsubscribe: locale === "vi" ? "Hủy nhận thông báo qua email" : "Unsubscribe from email notifications" };
}
