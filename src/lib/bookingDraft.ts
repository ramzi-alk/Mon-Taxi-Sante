import type { BookingSchema } from "~/components/booking/schema";

const DRAFT_KEY = "mts:booking_draft";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface BookingDraft {
  step: number;
  savedAt: number;
  values: Partial<BookingSchema>;
}

/** pmt_file holds a File instance, which can't survive JSON serialization. */
function stripUnserializable(values: Partial<BookingSchema>): Partial<BookingSchema> {
  const { pmt_file: _pmt_file, ...rest } = values;
  return rest;
}

export function saveBookingDraft(step: number, values: Partial<BookingSchema>): void {
  if (typeof window === "undefined") return;
  const draft: BookingDraft = { step, savedAt: Date.now(), values: stripUnserializable(values) };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

/** Ignores drafts older than 24h or with no meaningful content (e.g. abandoned on load). */
export function readBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as BookingDraft;
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    const hasContent =
      !!draft.values.pickup_address ||
      !!draft.values.dropoff_address ||
      !!draft.values.patient_full_name;
    return hasContent ? draft : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
