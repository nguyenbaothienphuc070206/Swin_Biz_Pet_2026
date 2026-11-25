"use client";

import Link from "next/link";

export function ClinicInsightsView({ locale = "vi" }: { locale?: string }) {
  const isVi = locale === "vi";

  const weeklyVolume = [
    { label: isVi ? "Tuần 1" : "W1", val: 32 },
    { label: isVi ? "Tuần 2" : "W2", val: 41 },
    { label: isVi ? "Tuần 3" : "W3", val: 54 },
    { label: isVi ? "Tuần 4" : "W4", val: 68 },
    { label: isVi ? "Tuần 5" : "W5", val: 82 },
    { label: isVi ? "Tuần 6" : "W6", val: 96 },
    { label: isVi ? "Tuần 7" : "W7", val: 112 },
    { label: isVi ? "Tuần này" : "Now", val: 128 },
  ];

  const maxVal = 128;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <h2 className="font-display font-bold text-lg text-foreground">
          {isVi ? "Hiệu quả giữ chân khách hàng" : "Clinic retention & growth"}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {isVi
            ? "Tổng hợp các chỉ số tái khám và tuân thủ lịch tiêm trong 30 ngày qua qua sổ y bạ điện tử và nhắc hẹn tự động."
            : "Practice retention, follow-up frequency, and booster compliance metrics from the past 30 days."}
        </p>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isVi ? "Tỉ lệ khách quay lại" : "Returning client rate"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tabular-nums text-foreground">74.8%</span>
            <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">+12.4%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isVi ? "3 trong 4 chủ nuôi tiếp tục tái khám sau lần đầu." : "3 out of 4 clients return for follow-ups."}
          </p>
        </div>

        <div className="p-5 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isVi ? "Lượt khám / thú cưng" : "Annual visits / pet"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tabular-nums text-foreground">
              {isVi ? "3.4 lượt" : "3.4 visits"}
            </span>
            <span className="text-xs font-semibold tabular-nums text-primary">+0.6</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isVi ? "Bao gồm tiêm phòng, tẩy giun và khám định kỳ." : "Routine preventive visits and vaccines."}
          </p>
        </div>

        <div className="p-5 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isVi ? "Chuyển đổi từ ca SOS" : "SOS conversion"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tabular-nums text-foreground">62.0%</span>
            <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">+8.1%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isVi ? "Khách gọi SOS chọn phòng khám làm nơi theo dõi dài hạn." : "Emergency callers returning for ongoing care."}
          </p>
        </div>

        <div className="p-5 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isVi ? "Tuân thủ lịch tiêm nhắc" : "Booster compliance"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tabular-nums text-foreground">88.5%</span>
            <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">+15.2%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isVi ? "Nhờ nhắc lịch tiêm phòng định kỳ tự động." : "Supported by automated booster reminders."}
          </p>
        </div>
      </div>

      {/* Weekly Volume Bar Chart (Zero SVG) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              {isVi ? "Lượt khám & tiêm chủng theo tuần" : "Weekly patient & vaccination volume"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isVi ? "Số liệu 8 tuần gần nhất" : "Last 8 weeks"}
            </p>
          </div>
          <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
            {isVi ? "+23.5% tăng trưởng" : "+23.5% growth"}
          </span>
        </div>

        <div className="grid grid-cols-8 items-end gap-2 sm:gap-3 h-40 pt-4 border-b border-border pb-2">
          {weeklyVolume.map((pt, i) => {
            const heightPct = Math.round((pt.val / maxVal) * 100);
            const isLatest = i === weeklyVolume.length - 1;
            return (
              <div key={pt.label} className="flex flex-col items-center justify-end h-full gap-1.5">
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {pt.val}
                </span>
                <div
                  className={`w-full max-w-10 rounded-t-md transition-all ${
                    isLatest ? "bg-primary" : "bg-primary/35"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  aria-label={`${pt.label}: ${pt.val}`}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-8 gap-2 sm:gap-3 text-center text-[11px] text-muted-foreground font-medium">
          {weeklyVolume.map((pt, i) => (
            <span
              key={pt.label}
              className={i === weeklyVolume.length - 1 ? "font-semibold text-foreground" : ""}
            >
              {pt.label}
            </span>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-display font-bold text-base text-foreground">
          {isVi ? "Gợi ý chăm sóc khách hàng tuần này" : "Practice action items this week"}
        </h3>

        <div className="divide-y divide-border text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0">
            <span className="text-foreground">
              {isVi
                ? "14 thú cưng đến hạn tiêm nhắc vắc-xin Dại & 7 bệnh trong 7 ngày tới"
                : "14 pets due for annual rabies or 7-in-1 boosters in the next 7 days"}
            </span>
            <Link
              href={`/${locale}/clinic/appointments`}
              className="inline-flex min-h-8 items-center justify-center rounded-lg bg-primary px-3 font-semibold text-primary-foreground hover:brightness-95 self-start sm:self-auto shrink-0"
            >
              {isVi ? "Xem lịch nhắc" : "Review schedule"}
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 last:pb-0">
            <span className="text-foreground">
              {isVi
                ? "8 hồ sơ y bạ được chủ nuôi chia sẻ qua QR đang chờ xác nhận"
                : "8 shared passports awaiting clinic verification"}
            </span>
            <Link
              href={`/${locale}/clinic/records`}
              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-border bg-background px-3 font-semibold text-foreground hover:bg-secondary self-start sm:self-auto shrink-0"
            >
              {isVi ? "Xem hồ sơ" : "Review records"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
