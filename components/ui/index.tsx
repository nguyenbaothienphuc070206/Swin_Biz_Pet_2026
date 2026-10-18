"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { Command } from "cmdk";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  LoaderCircle,
  MapPin,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold motion-safe focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-[0.97] active:translate-y-px",
        outline: "border border-input bg-card text-foreground hover:bg-muted active:translate-y-px",
        ghost: "bg-transparent text-foreground hover:bg-muted active:translate-y-px",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-95 active:translate-y-px",
        sos: "bg-destructive text-destructive-foreground hover:brightness-95 active:translate-y-px",
        link: "min-h-0 rounded-sm p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        sm: "min-h-9 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11 shrink-0 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type UIState = "default" | "loading" | "empty" | "error" | "disabled";

export function Button({
  className,
  variant,
  size,
  state = "default",
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { state?: UIState }) {
  const isLoading = state === "loading";
  return (
    <button
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || state === "disabled" || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
      {state === "empty" ? <CircleHelp className="size-4" aria-hidden="true" /> : null}
      {state === "error" ? <AlertCircle className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Input({
  className,
  state = "default",
  errorMessage,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  state?: UIState;
  errorMessage?: string;
}) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className="grid gap-1.5">
      <input
        id={inputId}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
          state === "error" && "border-destructive focus-visible:ring-destructive/25",
          className,
        )}
        disabled={state === "disabled" || props.disabled}
        aria-invalid={state === "error" || undefined}
        aria-describedby={state === "error" ? errorId : props["aria-describedby"]}
        {...props}
      />
      {state === "loading" ? <span className="text-xs text-muted-foreground">Checking…</span> : null}
      {state === "empty" ? <span className="text-xs text-muted-foreground">No value entered yet.</span> : null}
      {state === "error" ? (
        <span id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle size={14} aria-hidden="true" /> {errorMessage ?? "Please check this field."}
        </span>
      ) : null}
    </div>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

export function Select({
  label,
  placeholder = "Chọn một mục",
  options,
  state = "default",
  value,
  onValueChange,
}: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  state?: UIState;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = React.useId();
  const isDisabled = state === "disabled" || state === "loading";
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={isDisabled}>
        <SelectPrimitive.Trigger id={id} className="flex h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-input bg-card px-3.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:opacity-60">
          <SelectPrimitive.Value placeholder={state === "loading" ? "Đang tải…" : state === "empty" ? "Chưa có lựa chọn" : placeholder} />
          {state === "loading" ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <SelectPrimitive.Icon><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.Icon>}
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content position="popper" className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-auto rounded-[var(--radius-md)] border border-border bg-card p-1 text-card-foreground shadow-[var(--shadow-popover)]">
            <SelectPrimitive.Viewport>
              {options.length ? options.map((option) => (
                <SelectPrimitive.Item key={option.value} value={option.value} className="relative flex min-h-10 cursor-pointer select-none items-center rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <span className="absolute left-3 inline-flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check size={15} /></SelectPrimitive.ItemIndicator></span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              )) : <div className="px-3 py-2 text-sm text-muted-foreground">Chưa có lựa chọn</div>}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {state === "error" ? <span className="text-xs font-medium text-destructive">Không thể tải lựa chọn. Thử lại.</span> : null}
    </div>
  );
}

export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Tìm kiếm…",
  emptyText = "Không tìm thấy kết quả.",
  state = "default",
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  state?: UIState;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value)?.label;
  const disabled = state === "disabled" || state === "loading";
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal" disabled={disabled} aria-expanded={open}>
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{state === "loading" ? "Đang tải…" : selected ?? placeholder}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content align="start" className="z-50 w-[var(--radix-popover-trigger-width)] rounded-[var(--radius-md)] border border-border bg-card p-1 shadow-[var(--shadow-popover)]" onOpenAutoFocus={(event) => event.preventDefault()}>
            {state === "error" ? <p className="p-3 text-sm text-destructive">Không tải được danh sách. Thử lại.</p> : (
              <Command label={label} className="overflow-hidden rounded-lg bg-card text-foreground">
                <div className="flex items-center gap-2 border-b border-border px-3">
                  <Search size={16} className="text-muted-foreground" aria-hidden="true" />
                  <Command.Input placeholder={placeholder} className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                </div>
                <Command.List className="max-h-56 overflow-y-auto p-1">
                  <Command.Empty className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</Command.Empty>
                  {options.map((option) => (
                    <Command.Item key={option.value} value={option.label} onSelect={() => { onValueChange?.(option.value); setOpen(false); }} className="flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm aria-selected:bg-secondary">
                      {option.label}{value === option.value ? <Check size={15} aria-hidden="true" /> : null}
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

export function Dialog({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#12251f]/55 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[var(--radius-xl)] border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-popover)] sm:p-7">
          <div className="grid gap-1.5 pr-8">
            <DialogPrimitive.Title className="font-display text-xl font-semibold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : null}
          </div>
          <DialogPrimitive.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Sheet({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#12251f]/55" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(28rem,100vw)] flex-col gap-5 border-l border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-popover)] sm:p-7">
          <div className="grid gap-1.5 pr-8">
            <DialogPrimitive.Title className="font-display text-xl font-semibold">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : null}
          </div>
          <DialogPrimitive.Close aria-label="Close panel" className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Tabs({
  tabs,
  defaultValue,
}: {
  tabs: { value: string; label: string; content: React.ReactNode }[];
  defaultValue?: string;
}) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? tabs[0]?.value}>
      <TabsPrimitive.List className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-muted p-1" aria-label="Content sections">
        {tabs.map((tab) => <TabsPrimitive.Trigger key={tab.value} value={tab.value} className="min-h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">{tab.label}</TabsPrimitive.Trigger>)}
      </TabsPrimitive.List>
      {tabs.map((tab) => <TabsPrimitive.Content key={tab.value} value={tab.value} className="mt-4 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring">{tab.content}</TabsPrimitive.Content>)}
    </TabsPrimitive.Root>
  );
}

export function ToastDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <Button variant="secondary" onClick={() => setOpen(true)}>Show toast</Button>
      <ToastPrimitive.Root open={open} onOpenChange={setOpen} duration={5000} className="grid grid-cols-[1fr_auto] items-center gap-x-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-[var(--shadow-popover)] data-[state=open]:animate-in">
        <ToastPrimitive.Title className="text-sm font-semibold">Đã lưu thay đổi</ToastPrimitive.Title>
        <ToastPrimitive.Description className="col-start-1 text-sm text-muted-foreground">Bạn có thể tiếp tục chỉnh sửa hồ sơ.</ToastPrimitive.Description>
        <ToastPrimitive.Close aria-label="Close notification" className="col-start-2 row-span-2 row-start-1 rounded-lg p-2 hover:bg-muted"><X size={16} /></ToastPrimitive.Close>
      </ToastPrimitive.Root>
      <ToastPrimitive.Viewport className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 outline-none sm:left-auto sm:w-96" />
    </ToastPrimitive.Provider>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted motion-reduce:animate-none", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">{icon ?? <PawPrint size={22} aria-hidden="true" />}</div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  description = "Thông tin của bạn vẫn được giữ lại. Hãy thử lại hoặc quay về bước trước.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex min-h-40 flex-col items-start justify-center rounded-2xl border border-destructive/30 bg-[var(--sos-surface)] p-5">
      <div className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle size={18} aria-hidden="true" />{title}</div>
      <p className="mt-1 text-sm text-foreground">{description}</p>
      {onRetry ? <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Thử lại</Button> : null}
    </div>
  );
}

const badgeStyles = cva("inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", {
  variants: {
    variant: {
      default: "bg-secondary text-secondary-foreground",
      success: "bg-secondary text-[var(--success)]",
      warning: "bg-[var(--warning-surface)] text-[var(--warning)]",
      info: "bg-[var(--info-surface)] text-[var(--info)]",
      destructive: "bg-[var(--sos-surface)] text-[var(--sos)]",
      verified: "bg-secondary text-[var(--verified)] ring-1 ring-inset ring-[var(--verified)]/25",
      outline: "border border-border text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props}>{children}</span>;
}

export function VerifiedBadge() {
  return <Badge variant="verified"><ShieldCheck size={14} aria-hidden="true" />Đã xác minh</Badge>;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  state = "default",
  ariaLabel = "Bảng dữ liệu có thể cuộn ngang",
}: {
  columns: { key: keyof T; label: string }[];
  rows: T[];
  state?: UIState;
  ariaLabel?: string;
}) {
  if (state === "loading") return <div role="status" aria-label="Đang tải bảng" className="grid gap-2">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-11" />)}<span className="sr-only">Đang tải…</span></div>;
  if (state === "error") return <ErrorState title="Không tải được danh sách" />;
  if (state === "empty" || rows.length === 0) return <EmptyState title="Chưa có dữ liệu" description="Thông tin sẽ xuất hiện ở đây khi có bản ghi mới." />;
  return (
    <div role="region" aria-label={ariaLabel} tabIndex={0} className="w-full overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground"><tr>{columns.map((column) => <th key={String(column.key)} scope="col" className="px-4 py-3 font-semibold">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border bg-card">{rows.map((row) => <tr key={row.id} className="hover:bg-muted/50">{columns.map((column) => <td key={String(column.key)} className="whitespace-nowrap px-4 py-3">{String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  state = "default",
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  state?: UIState;
}) {
  const id = React.useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input id={id} type="date" value={value} onChange={(event) => onChange?.(event.target.value)} disabled={state === "disabled" || state === "loading"} className="h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3.5 pr-10 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:opacity-60" />
        <Clock3 size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
      {state === "error" ? <span className="text-xs font-medium text-destructive">Vui lòng chọn ngày hợp lệ.</span> : null}
      {state === "empty" ? <span className="text-xs text-muted-foreground">Chưa chọn ngày.</span> : null}
      {state === "loading" ? <span className="text-xs text-muted-foreground">Đang kiểm tra lịch trống…</span> : null}
    </div>
  );
}

export function Stepper({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <ol aria-label="Tiến trình" className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => {
        const number = index + 1;
        const done = number < currentStep;
        const current = number === currentStep;
        return <li key={step} aria-current={current ? "step" : undefined} className="min-w-0">
          <div className={cn("mb-2 h-1 rounded-full", done || current ? "bg-primary" : "bg-muted")} />
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold", done && "border-primary bg-primary text-primary-foreground", current && "border-primary text-primary", !done && !current && "border-border text-muted-foreground")}>
              {done ? <Check size={13} aria-hidden="true" /> : number}
            </span>
            <span className={cn("truncate", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{step}</span>
          </div>
        </li>;
      })}
    </ol>
  );
}

export function MapPanel({ state = "default" }: { state?: UIState }) {
  return (
    <div role="group" className="relative min-h-56 overflow-hidden rounded-2xl border border-border bg-[#e8ece2] text-[#20332e] dark:bg-[#24342d] dark:text-[#e7eee9]" aria-label="Map placeholder">
      <div className="absolute inset-0 opacity-65" aria-hidden="true">
        <svg viewBox="0 0 640 320" className="size-full" preserveAspectRatio="xMidYMid slice">
          <path d="M-20 48 660 275M-14 280 664 42M74-20l190 370M382-20 196 350M546-20 340 350" fill="none" stroke="currentColor" strokeWidth="18" opacity=".12" />
          <path d="M-20 104h690M-20 220h690M148-30v380M500-30v380" fill="none" stroke="currentColor" strokeWidth="2" opacity=".18" />
          <path d="M40 167c50-42 70-42 115 0s82 41 130 0 83-42 131 0 86 42 142 0 72-40 110-7" fill="none" stroke="#77a985" strokeWidth="24" opacity=".35" />
        </svg>
      </div>
      <div className="absolute left-[46%] top-[42%] grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card/70"><MapPin size={20} aria-hidden="true" /></div>
      <div className="absolute left-[25%] top-[30%] grid size-9 place-items-center rounded-full bg-card text-primary shadow-md"><PawPrint size={17} aria-hidden="true" /></div>
      <div className="absolute right-[18%] top-[58%] grid size-9 place-items-center rounded-full bg-card text-primary shadow-md"><PawPrint size={17} aria-hidden="true" /></div>
      {state === "loading" ? <div role="status" className="absolute inset-0 grid place-items-center bg-card/70 text-sm font-medium">Đang tải bản đồ…</div> : null}
      {state === "empty" ? <div className="absolute inset-0 grid place-items-center bg-card/75 text-sm font-medium">Chưa có phòng khám trong khu vực này</div> : null}
      {state === "error" ? <div role="alert" className="absolute inset-0 grid place-items-center bg-[var(--sos-surface)] px-5 text-center text-sm font-medium text-destructive">Không tải được bản đồ · thử lại</div> : null}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = "default",
}: {
  name: string;
  src?: string;
  size?: "default" | "sm" | "lg";
}) {
  const sizeClass = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  const initials = name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
  return (
    <AvatarPrimitive.Root className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground", sizeClass)}>
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={0} className="grid size-full place-items-center" aria-label={name}>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block group-focus-within:block">{label}</span>
    </span>
  );
}

export function SOSButton() {
  return <Button variant="sos" size="lg" aria-label="Gọi SOS thú cưng" className="fixed bottom-4 right-4 z-40 min-w-32 rounded-full shadow-lg sm:bottom-6 sm:right-6"><AlertCircle size={18} aria-hidden="true" />SOS thú cưng</Button>;
}

export function FeedbackSamples() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="grid gap-2"><span className="text-xs font-semibold text-muted-foreground">Loading</span><Skeleton className="h-16" /></div>
      <div className="grid gap-2"><span className="text-xs font-semibold text-muted-foreground">Empty</span><EmptyState title="Chưa có lịch hẹn" description="Khi bạn đặt lịch, thông tin sẽ hiển thị tại đây." action={<Button size="sm">Tìm phòng khám</Button>} /></div>
      <div className="grid gap-2"><span className="text-xs font-semibold text-muted-foreground">Error</span><ErrorState title="Chưa thể đồng bộ" description="Bản nháp vẫn được lưu trên thiết bị." onRetry={() => {}} /></div>
    </div>
  );
}

export function StateRow({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[7rem_1fr] sm:items-center"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><div className="flex flex-wrap items-center gap-3">{children}</div></div>;
}

export const sampleClinicOptions = [
  { value: "green", label: "Phòng khám Thú y Mầm Xanh" },
  { value: "river", label: "Phòng khám Bến Sông" },
  { value: "sun", label: "Phòng khám Nắng Mai" },
];

export const sampleTableRows = [
  { id: "1", pet: "Milo", service: "Tiêm vaccine", date: "12/06/2026", status: "Đã xác nhận" },
  { id: "2", pet: "Bông", service: "Khám định kỳ", date: "15/06/2026", status: "Chờ xác nhận" },
];

export const Icons = { CheckCircle2, ArrowUp, ArrowDown, Plus, ChevronLeft, ChevronRight };
