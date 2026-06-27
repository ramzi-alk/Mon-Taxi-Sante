import type { MyBookingRow } from "~/repositories/bookingsRepository";
import type { BookingSchema } from "~/components/booking/schema";

const STORAGE_KEY = "mts:booking_prefill";

export type BookingPrefillData = Pick<
  BookingSchema,
  | "patient_full_name"
  | "patient_phone"
  | "patient_email"
  | "patient_birth_date"
  | "pickup_address"
  | "pickup_lat"
  | "pickup_lng"
  | "dropoff_address"
  | "dropoff_lat"
  | "dropoff_lng"
  | "vehicle_type"
  | "requires_wheelchair"
  | "requires_stretcher"
  | "requires_oxygen"
  | "passenger_count"
  | "cpam_status"
  | "mutual_name"
>;

/** Identity/trip fields likely to repeat across a patient's bookings — dates, times and consent are deliberately excluded since they're specific to each trip. */
export function bookingToPrefillData(booking: MyBookingRow): BookingPrefillData {
  return {
    patient_full_name: booking.patient_full_name,
    patient_phone: booking.patient_phone,
    patient_email: booking.patient_email ?? "",
    patient_birth_date: booking.patient_birth_date ?? "",
    pickup_address: booking.pickup_address,
    pickup_lat: booking.pickup_lat,
    pickup_lng: booking.pickup_lng,
    dropoff_address: booking.dropoff_address,
    dropoff_lat: booking.dropoff_lat,
    dropoff_lng: booking.dropoff_lng,
    vehicle_type: booking.vehicle_type,
    requires_wheelchair: booking.requires_wheelchair,
    requires_stretcher: booking.requires_stretcher,
    requires_oxygen: booking.requires_oxygen,
    passenger_count: booking.passenger_count,
    cpam_status: booking.cpam_status,
    mutual_name: booking.mutual_name ?? "",
  };
}

/** Handed off via sessionStorage (not search params) so it survives the redirect to /reservation without exposing patient data in the URL. Consumed once. */
export function storeBookingPrefill(data: BookingPrefillData): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function consumeBookingPrefill(): BookingPrefillData | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as BookingPrefillData;
  } catch {
    return null;
  }
}
