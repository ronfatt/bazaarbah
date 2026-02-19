import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const APP_TIME_ZONE = "Asia/Kuala_Lumpur";
const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currencyFromCents(cents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export function generateOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `RYA-${random}`;
}

export function generateReceiptNo() {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `RCPT-${year}-${stamp}${random}`;
}

export function startOfTodayIso() {
  return startOfDayIsoOffset(0);
}

export function startOfDayIsoOffset(daysFromToday: number) {
  const utcNowMs = Date.now();
  const klClock = new Date(utcNowMs + GMT8_OFFSET_MS);
  klClock.setUTCDate(klClock.getUTCDate() + daysFromToday);
  klClock.setUTCHours(0, 0, 0, 0);
  return new Date(klClock.getTime() - GMT8_OFFSET_MS).toISOString();
}

export function formatDateTimeMY(value: string | Date, locale = "en-MY") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateMY(value: string | Date, locale = "en-MY") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatMonthDayGMT8(iso: string) {
  const klClock = new Date(new Date(iso).getTime() + GMT8_OFFSET_MS);
  return `${klClock.getUTCMonth() + 1}/${klClock.getUTCDate()}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}
