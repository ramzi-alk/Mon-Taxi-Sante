import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Combines a "YYYY-MM-DD" date and "HH:MM" time — both picked by the user
// in their browser's local time (Europe/Paris in practice) — into a real
// UTC instant for a TIMESTAMPTZ column. Building the ISO string by naive
// concatenation (`${date}T${time}:00`) omits the UTC offset, so Postgres
// interprets it as UTC instead of Europe/Paris: every booking ends up
// stored 1-2h later than the time the patient actually picked (visible as
// a shifted pickup/return time everywhere it's later displayed).
export function combineLocalDateTimeToIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

export function formatDateFr(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatTimeFr(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatReferenceCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "Maintenant";
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h < 24) return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  return `${Math.floor(h / 24)}j`;
}
