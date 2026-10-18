"use client";

import * as React from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  HeartPulse,
  Languages,
  Leaf,
  MapPin,
  Moon,
  ShieldCheck,
  Sun,
  Syringe,
  X,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  DataTable,
  DatePicker,
  Dialog,
  ErrorState,
  FeedbackSamples,
  Input,
  Label,
  MapPanel,
  sampleClinicOptions,
  sampleTableRows,
  Select,
  Sheet,
  Skeleton,
  SOSButton,
  StateRow,
  Stepper,
  Tabs,
  ToastDemo,
  Tooltip,
  VerifiedBadge,
} from "@/components/ui";

const sections = [
  { id: "foundations", label: "Nền tảng" },
  { id: "components", label: "Thành phần" },
  { id: "patterns", label: "Trạng thái & UX" },
];

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

function ShowcaseCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  );
}

export function DesignSystem() {
  const [dark, setDark] = React.useState(false);
  const [locale, setLocale] = React.useState<"vi" | "en">("vi");
  const [clinic, setClinic] = React.useState("");
  const [pet, setPet] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [undoVisible, setUndoVisible] = React.useState(false);
  const labels = locale === "vi" ? {
    kicker: "Bộ nhận diện sản phẩm",
    title: "Chăm sóc dịu dàng. Quyết định rõ ràng.",
    subtitle: "Hệ thống giao diện của PawCare — ấm áp khi đồng hành, bình tĩnh khi cần hành động nhanh.",
    components: "Thư viện thành phần",
    patterns: "Trạng thái & quy tắc UX",
    foundations: "Nền tảng thị giác",
    sos: "SOS thú cưng",
    primary: "Đặt lịch khám",
    secondary: "Xem hồ sơ",
    input: "Tên thú cưng",
    name: "Tên của bé",
    clinic: "Phòng khám",
    date: "Ngày hẹn",
    notes: "Một hệ thống rõ ràng, từ hồ sơ đến cấp cứu.",
  } : {
    kicker: "Product design system",
    title: "Gentle care. Clear decisions.",
    subtitle: "PawCare’s interface system — warm for everyday care, calm when fast action matters.",
    components: "Component library",
    patterns: "States & UX rules",
    foundations: "Visual foundations",
    sos: "Pet SOS",
    primary: "Book a visit",
    secondary: "View passport",
    input: "Pet name",
    name: "Pet’s name",
    clinic: "Clinic",
    date: "Appointment date",
    notes: "A clear system, from passport to urgent care.",
  };

  return (
    <div className={dark ? "dark min-h-screen bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex min-h-11 items-center gap-2.5 rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><PawMark /></span>
            <span className="font-display text-lg font-bold tracking-tight">pawcare<span className="text-primary">.</span></span>
            <Badge className="hidden sm:inline-flex">Design system</Badge>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{section.label}</a>)}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label={locale === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"} onClick={() => setLocale(locale === "vi" ? "en" : "vi")}><Languages size={18} aria-hidden="true" /></Button>
            <Button variant="ghost" size="icon" aria-label={dark ? "Use light theme" : "Use dark theme"} onClick={() => setDark((value) => !value)}>{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</Button>
            <Button variant="sos" size="sm" className="hidden rounded-full sm:inline-flex" aria-label={labels.sos}><HeartPulse size={16} aria-hidden="true" />SOS</Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
        <section id="top" className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10 lg:p-14">
          <div className="absolute -right-16 -top-28 -z-10 size-80 rounded-full border-[48px] border-secondary/80 sm:size-[28rem]" aria-hidden="true" />
          <div className="absolute right-20 top-10 -z-10 hidden text-primary/15 lg:block" aria-hidden="true"><Leaf size={100} strokeWidth={1} /></div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><span className="size-2 rounded-full bg-primary" />{labels.kicker}</div>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">{labels.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{labels.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg"><CalendarDays size={18} aria-hidden="true" />{labels.primary}<ArrowRight size={16} aria-hidden="true" /></Button>
              <Button size="lg" variant="outline">{labels.secondary}</Button>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} className="text-primary" aria-hidden="true" />{labels.notes}</div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5 sm:max-w-lg sm:gap-7">
            {[{ icon: <Syringe size={17} />, label: locale === "vi" ? "Hồ sơ sức khỏe" : "Health passport" }, { icon: <MapPinIcon />, label: locale === "vi" ? "Phòng khám gần bạn" : "Nearby clinics" }, { icon: <Activity size={17} />, label: locale === "vi" ? "Hỗ trợ khẩn cấp" : "Urgent support" }].map((item) => <div key={item.label} className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm"><span className="text-primary">{item.icon}</span>{item.label}</div>)}
          </div>
        </section>

        <section id="foundations" className="scroll-mt-24 py-14 sm:py-20">
          <SectionHeading eyebrow="01 / Foundations" title={labels.foundations} description="Ba lớp ngôn ngữ thị giác: bảng màu thực vật, chữ rõ dấu tiếng Việt và chuyển động vừa đủ." />
          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <Card>
              <CardHeader><CardTitle>Color tokens</CardTitle><p className="text-sm text-muted-foreground">Semantic pairings · Light and dark</p></CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{[{ color: "bg-primary", name: "Forest" }, { color: "bg-secondary", name: "Sage" }, { color: "bg-accent", name: "Clay" }, { color: "bg-destructive", name: "SOS" }, { color: "bg-[var(--warning)]", name: "Caution" }, { color: "bg-card border border-border", name: "Paper" }].map((swatch) => <div key={swatch.name}><div className={`h-16 rounded-xl ${swatch.color}`} /><span className="mt-1.5 block text-xs text-muted-foreground">{swatch.name}</span></div>)}</div>
                <div className="rounded-xl bg-muted p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="success"><Check size={13} />Đã hoàn tất</Badge><Badge variant="warning"><Clock3 size={13} />Đang chờ</Badge><Badge variant="destructive"><HeartPulse size={13} />SOS</Badge><VerifiedBadge /></div>
                  <p className="mt-3 text-muted-foreground">Màu trạng thái luôn đi kèm nhãn hoặc biểu tượng, không dùng màu làm tín hiệu duy nhất.</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Typography</CardTitle><p className="text-sm text-muted-foreground">DM Sans + Be Vietnam Pro</p></CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold tracking-tight">Chăm sóc khỏe mạnh</p>
                <p className="mt-2 text-base">Bé Bông đã tiêm mũi phòng dại — hãy lưu lại sổ sức khỏe nhé.</p>
                <p className="mt-3 text-sm text-muted-foreground">Phòng khám thú y · Thứ Ba, 09:30 · 12 tháng 6</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs"><Badge variant="outline">12 / 16 / 24 / 32</Badge><Badge variant="outline">4px base spacing</Badge><Badge variant="outline">8–24px radius</Badge><Badge variant="outline">100–240ms motion</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card><CardContent className="pt-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><ShieldCheck size={19} /></div><h3 className="font-semibold">Rõ ràng, không phán xét</h3><p className="mt-1 text-sm text-muted-foreground">“Thiếu ngày sinh của bé” thay vì “Dữ liệu không hợp lệ”.</p></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[var(--warning-surface)] text-[var(--warning)]"><Bell size={19} /></div><h3 className="font-semibold">Bình tĩnh khi khẩn cấp</h3><p className="mt-1 text-sm text-muted-foreground">Nêu hành động tiếp theo; không hứa thời gian phản hồi.</p></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[var(--info-surface)] text-[var(--info)]"><HeartPulse size={19} /></div><h3 className="font-semibold">AI hỗ trợ, bác sĩ xác nhận</h3><p className="mt-1 text-sm text-muted-foreground">AI không chẩn đoán, kê đơn hay tự quyết định mức độ khẩn cấp.</p></CardContent></Card>
          </div>
        </section>

        <section id="components" className="scroll-mt-24 border-t border-border py-14 sm:py-20">
          <SectionHeading eyebrow="02 / Components" title={labels.components} description="Các khối dùng chung cho chủ nuôi và phòng khám. Bắt đầu từ màn hình 360px, thao tác chính nằm trong tầm với ngón cái." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ShowcaseCard title="Button" description="Primary, secondary, outline, SOS · 44px minimum touch target">
              <StateRow label="Default"><Button>{labels.primary}</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button></StateRow>
              <StateRow label="Loading"><Button state="loading">Đang lưu</Button></StateRow>
              <StateRow label="Empty / Error"><Button state="empty" variant="outline">Chưa có dữ liệu</Button><Button state="error" variant="outline">Thử lại</Button></StateRow>
              <StateRow label="Disabled"><Button disabled>Không khả dụng</Button></StateRow>
              <StateRow label="Focus"><Button className="ring-[3px] ring-ring ring-offset-2 ring-offset-background">Focus rõ ràng</Button></StateRow>
            </ShowcaseCard>

            <ShowcaseCard title="Input" description="Inline validation, preserved values, visible labels">
              <Label htmlFor="pet-name">{labels.input} <span className="text-destructive">*</span></Label>
              <Input id="pet-name" aria-label={labels.name} placeholder={labels.name} value={pet} onChange={(event) => setPet(event.target.value)} aria-required="true" />
              <Input aria-label="Trạng thái tải" placeholder="Đang kiểm tra…" state="loading" />
              <Input aria-label="Trạng thái trống" placeholder="Chưa nhập thông tin" state="empty" />
              <Input aria-label="Trạng thái lỗi" value="012" state="error" errorMessage="Số điện thoại cần đủ 10 chữ số." readOnly />
              <Input aria-label="Trạng thái khóa" value="Không thể chỉnh sửa" state="disabled" readOnly />
              <Input aria-label="Trạng thái focus" placeholder="Dùng Tab để xem focus" />
            </ShowcaseCard>

            <ShowcaseCard title="Select & Combobox" description="Arrow keys, Home/End, type-to-search, Enter, Escape">
              <Select label="Loài thú cưng" placeholder="Chọn loài" options={[{ value: "dog", label: "Chó" }, { value: "cat", label: "Mèo" }, { value: "other", label: "Khác" }]} />
              <Select label="Đang tải danh sách" options={[]} state="loading" />
              <Select label="Danh sách trống" options={[]} state="empty" />
              <Select label="Lỗi tải dữ liệu" options={[]} state="error" />
              <Select label="Đã khóa" options={sampleClinicOptions} state="disabled" />
              <Combobox label={labels.clinic} options={sampleClinicOptions} value={clinic} onValueChange={setClinic} />
              <Combobox label="Không có kết quả" options={[]} placeholder="Tìm dịch vụ" emptyText="Không tìm thấy dịch vụ phù hợp." state="empty" />
            </ShowcaseCard>

            <ShowcaseCard title="Dialog & Sheet" description="Focus trap, Escape to close, restore focus to trigger">
              <div className="flex flex-wrap gap-2">
                <Dialog title="Lưu hồ sơ thú cưng?" description="Bạn có thể cập nhật thông tin này bất cứ lúc nào." trigger={<Button variant="outline">Mở Dialog</Button>}>
                  <div className="flex justify-end gap-2"><Button variant="outline">Để sau</Button><Button>Lưu hồ sơ</Button></div>
                </Dialog>
                <Sheet title="Thông tin phòng khám" description="Lối đi, giờ làm việc và dịch vụ." trigger={<Button variant="secondary">Mở Sheet</Button>}>
                  <div className="grid gap-4"><Badge variant="success">Đang mở cửa</Badge><p className="text-sm text-muted-foreground">Nội dung cuộn được, nút chính luôn ở cuối trên mobile.</p><Button className="mt-auto">Đặt lịch</Button></div>
                </Sheet>
              </div>
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Loading, empty, error và disabled của nội dung bên trong dùng đúng các khối trạng thái ở mục kế tiếp.</div>
            </ShowcaseCard>

            <ShowcaseCard title="Tabs & Toast" description="Keyboard arrow navigation and non-blocking feedback">
              <Tabs tabs={[{ value: "upcoming", label: "Sắp tới", content: <p className="rounded-xl bg-muted p-4 text-sm">2 lịch hẹn đã được xác nhận.</p> }, { value: "past", label: "Đã qua", content: <p className="rounded-xl bg-muted p-4 text-sm">Các lần khám đã hoàn tất.</p> }, { value: "draft", label: "Bản nháp", content: <p className="rounded-xl bg-muted p-4 text-sm">Bản nháp được tự động lưu.</p> }]} />
              <div className="pt-2"><ToastDemo /></div>
            </ShowcaseCard>

            <ShowcaseCard title="Badge & Verified clinic" description="Status always includes text, not color alone">
              <StateRow label="Status"><Badge>Thông tin</Badge><Badge variant="success">Đã hoàn tất</Badge><Badge variant="warning">Đang chờ</Badge><Badge variant="info">Đã lên lịch</Badge><Badge variant="destructive">Cần chú ý</Badge></StateRow>
              <StateRow label="Verified"><VerifiedBadge /></StateRow>
              <StateRow label="Disabled"><Badge variant="outline" aria-disabled="true" className="opacity-50">Không khả dụng</Badge></StateRow>
              <StateRow label="Loading"><span className="inline-flex items-center gap-2"><Skeleton className="h-6 w-24 rounded-full" /><span className="sr-only">Đang tải nhãn</span></span></StateRow>
              <StateRow label="Error"><Badge variant="destructive"><CircleHelp size={13} />Chưa xác minh</Badge></StateRow>
            </ShowcaseCard>

            <ShowcaseCard title="Card & Avatar" description="Soft depth, clear hierarchy, useful fallback initials">
              <Card><CardHeader className="flex grid-cols-[auto_1fr] items-center gap-3"><Avatar name="Bông Nguyễn" size="lg" /><div><CardTitle className="text-base">Bông</CardTitle><p className="text-sm text-muted-foreground">Mèo · 3 tuổi</p></div></CardHeader><CardContent className="flex items-center justify-between"><Badge variant="success">Đã tiêm phòng</Badge><Button size="sm" variant="outline">Xem hồ sơ</Button></CardContent></Card>
              <div className="flex items-center gap-2"><Avatar name="Bông Nguyễn" size="sm" /><Avatar name="Bông Nguyễn" /><Avatar name="Bông Nguyễn" size="lg" /><span className="text-sm text-muted-foreground">Avatar fallback: BN</span></div>
              <div className="grid grid-cols-3 gap-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
              <div className="flex flex-wrap gap-2"><Badge variant="outline">Empty</Badge><Badge variant="destructive">Error</Badge><Badge variant="outline" aria-disabled="true" className="opacity-50">Disabled</Badge><Tooltip label="Focus with Tab"><Button size="icon" variant="ghost" aria-label="More information"><CircleHelp size={18} /></Button></Tooltip></div>
            </ShowcaseCard>

            <ShowcaseCard title="DataTable" description="Horizontal scroll on narrow viewports; semantic headers">
              <DataTable columns={[{ key: "pet", label: "Thú cưng" }, { key: "service", label: "Dịch vụ" }, { key: "status", label: "Trạng thái" }]} rows={sampleTableRows} />
              <DataTable columns={[{ key: "pet", label: "Thú cưng" }]} rows={[]} state="empty" />
              <div role="status" className="grid gap-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><span className="sr-only">Đang tải bảng</span></div>
              <ErrorState title="Không tải được lịch hẹn" description="Lịch hẹn của bạn vẫn được giữ lại." onRetry={() => {}} />
            </ShowcaseCard>

            <ShowcaseCard title="DatePicker & Stepper" description="Native date input keeps the browser’s accessible keyboard behavior">
              <DatePicker label={labels.date} value="2026-06-12" onChange={() => {}} />
              <DatePicker label="Ngày chưa chọn" state="empty" />
              <DatePicker label="Lỗi ngày hẹn" state="error" />
              <DatePicker label="Đang kiểm tra slot" state="loading" />
              <DatePicker label="Ngày đã khóa" state="disabled" />
              <Stepper steps={["Thú cưng", "Phòng khám", "Xác nhận"]} currentStep={2} />
            </ShowcaseCard>

            <ShowcaseCard title="MapPanel placeholder" description="Neighborhood grid only; no third-party map calls">
              <MapPanel />
              <div className="grid gap-2 sm:grid-cols-2"><MapPanel state="loading" /><MapPanel state="empty" /><MapPanel state="error" /><div className="relative"><MapPanel /><Button className="absolute bottom-3 right-3" size="sm" variant="outline">Tìm quanh đây</Button></div></div>
            </ShowcaseCard>
          </div>
        </section>

        <section id="patterns" className="scroll-mt-24 border-t border-border py-14 sm:py-20">
          <SectionHeading eyebrow="03 / Interaction patterns" title={labels.patterns} description="Trạng thái có nội dung tiếp theo, lỗi không làm mất dữ liệu và thao tác thường dùng không chặn luồng." />
          <div className="grid gap-4 lg:grid-cols-[1fr_.75fr]">
            <Card><CardHeader><CardTitle>Loading, empty, error</CardTitle><p className="text-sm text-muted-foreground">Không có ngõ cụt: mỗi trạng thái đưa ra một bước tiếp theo.</p></CardHeader><CardContent><FeedbackSamples /></CardContent></Card>
            <Card><CardHeader><CardTitle>Draft autosave & undo</CardTitle><p className="text-sm text-muted-foreground">Phản hồi nhẹ, có thể phục hồi khi hành động bị hoàn tác.</p></CardHeader>
              <CardContent className="grid gap-3">
                <Label htmlFor="draft-name">Tên hồ sơ</Label>
                <Input id="draft-name" defaultValue="Bông" onChange={() => { setSaved(false); window.setTimeout(() => setSaved(true), 450); }} />
                <div aria-live="polite" className="min-h-5 text-xs text-muted-foreground">{saved ? "Đã lưu bản nháp trên thiết bị" : "Bản nháp được lưu tự động khi bạn tạm dừng"}</div>
                <div className="flex flex-wrap items-center gap-2"><Button variant="destructive" size="sm" onClick={() => setUndoVisible(true)}><X size={15} />Lưu trữ hồ sơ</Button>{undoVisible ? <div role="status" className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"><span>Đã lưu trữ</span><Button variant="link" size="sm" onClick={() => setUndoVisible(false)}>Hoàn tác</Button></div> : null}</div>
                <p className="text-xs text-muted-foreground">Demo UI: thao tác chỉ thay đổi trạng thái trình diễn, không lưu dữ liệu thật.</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card><CardHeader><CardTitle>Emergency disclaimer</CardTitle></CardHeader><CardContent><div className="rounded-xl border border-[var(--sos)]/25 bg-[var(--sos-surface)] p-4"><div className="flex items-center gap-2 font-semibold text-[var(--sos)]"><HeartPulse size={18} aria-hidden="true" />Hỗ trợ khẩn cấp</div><p className="mt-2 text-sm text-foreground">PawCare giúp kết nối và sàng lọc thông tin, không thay thế chẩn đoán hoặc điều trị của bác sĩ thú y.</p><Button variant="sos" className="mt-4">Gửi yêu cầu SOS</Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Clinic workflow</CardTitle><p className="text-sm text-muted-foreground">Thông tin quan trọng trước, thao tác ít bước.</p></CardHeader><CardContent className="grid gap-3"><div className="flex items-center gap-3 rounded-xl bg-muted p-3"><Avatar name="Bông Nguyễn" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">Bông · Mèo · 3 tuổi</p><p className="text-xs text-muted-foreground">Quyền xem hồ sơ còn hiệu lực</p></div><VerifiedBadge /></div><Button variant="outline" className="justify-between">Lưu mũi vaccine <ArrowRight size={16} /></Button><div className="text-xs text-muted-foreground">Mọi truy cập hồ sơ đều cần consent và được audit-log.</div></CardContent></Card>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground"><p>PawCare · Botanical clinic design system · Vietnamese first</p><p className="mt-1">WCAG AA contrast pairs · keyboard-first controls · reduced motion respected</p></footer>
      </main>
      <SOSButton />
    </div>
  );
}

function PawMark() {
  return <span aria-hidden="true" className="relative block size-5"><span className="absolute left-[7px] top-0 size-2 rounded-full bg-current" /><span className="absolute left-[1px] top-[5px] size-[7px] rounded-full bg-current" /><span className="absolute right-[1px] top-[5px] size-[7px] rounded-full bg-current" /><span className="absolute bottom-0 left-[4px] h-2.5 w-3 rounded-[70%_70%_55%_55%] bg-current" /></span>;
}

function MapPinIcon() {
  return <span className="inline-flex items-center" aria-hidden="true"><MapPin size={17} /></span>;
}
