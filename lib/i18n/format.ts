import type {AppLocale} from "@/i18n/routing";

export function formatDate(value: Date | string, locale: AppLocale, options: Intl.DateTimeFormatOptions = {dateStyle: "medium"}) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatVnd(amount: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, {style: "currency", currency: "VND", maximumFractionDigits: 0}).format(amount);
}

export function formatWeightKg(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, {style: "unit", unit: "kilogram", unitDisplay: "short", maximumFractionDigits: 1}).format(value);
}
