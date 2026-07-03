import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import type { Database } from "~/lib/database.types";
import type { PoolRide } from "~/components/driver/RideCard";

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export type DriverRideRow = Omit<PoolRide, "patient_first_name"> & {
  patient_full_name: string;
};

export type MyBookingRow = Pick<
  BookingRow,
  | "id"
  | "reference_code"
  | "pickup_address"
  | "pickup_lat"
  | "pickup_lng"
  | "pickup_municipality"
  | "dropoff_address"
  | "dropoff_lat"
  | "dropoff_lng"
  | "pickup_datetime"
  | "return_datetime"
  | "vehicle_type"
  | "trip_type"
  | "requires_wheelchair"
  | "requires_stretcher"
  | "requires_oxygen"
  | "passenger_count"
  | "estimated_price"
  | "status"
  | "created_at"
  | "patient_full_name"
  | "patient_phone"
  | "patient_email"
  | "patient_birth_date"
  | "cpam_status"
  | "mutual_name"
  | "medical_notes"
  | "series_id"
  | "series_index"
  | "series_total"
> & {
  driver_full_name: string | null;
  driver_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_registration: string | null;
  driver_rating_avg: number | null;
  patient_rating_given: number | null;
};

export interface LookupCredentials {
  referenceCode: string;
  phone: string;
}

export interface UpdateBookingPayload {
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_municipality: string | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  pickup_datetime: string;
  return_datetime: string | null;
  vehicle_type: BookingRow["vehicle_type"];
  trip_type: BookingRow["trip_type"];
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  cpam_status: BookingRow["cpam_status"];
  mutual_name: string | null;
  medical_notes: string | null;
}

/**
 * Bookings for the current session's patient (RLS-scoped — anonymous
 * booking sessions persist per browser, so this returns every reservation
 * made from this device/browser, not a cross-device account history).
 * Driver display info (name, phone, vehicle) is joined in server-side once
 * a driver is assigned, since patients have no direct RLS access to other
 * users' profile rows.
 */
export async function fetchMyBookings(client: SupabaseClient): Promise<MyBookingRow[]> {
  const { data, error } = await client.rpc("get_my_bookings");

  if (error) {
    logger.error("bookings.fetchMyBookings failed", { error: error.message });
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Patient self-service cancellation. The only way a patient can change
 * their own booking's status — direct UPDATE on `bookings` is no longer
 * granted to patients (see migration 009).
 */
export async function cancelBooking(
  client: SupabaseClient,
  bookingId: string,
  reason?: string
): Promise<void> {
  const { error } = await client.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("booking_not_cancellable")) {
      throw new Error("Cette réservation ne peut plus être annulée (course déjà en cours ou terminée).");
    }
    logger.error("bookings.cancelBooking failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Patient rates the driver (1-5 stars + optional comment) for one of their
 * own completed bookings. See migration 033's rate_booking_as_patient RPC —
 * one rating per role per booking, not editable once submitted.
 */
export async function rateBookingAsPatient(
  client: SupabaseClient,
  bookingId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const { error } = await client.rpc("rate_booking_as_patient", {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) {
    if (error.message.includes("invalid_rating")) {
      throw new Error("La note doit être comprise entre 1 et 5 étoiles.");
    }
    if (error.message.includes("booking_not_completed")) {
      throw new Error("Cette course n'est pas encore terminée.");
    }
    if (error.message.includes("already_rated")) {
      throw new Error("Vous avez déjà noté cette course.");
    }
    if (error.message.includes("booking_not_found")) {
      throw new Error("Réservation introuvable.");
    }
    logger.error("bookings.rateBookingAsPatient failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Patient self-service edit. Only allowed while the booking is still
 * `pending` (see migration 010) — once confirmation/driver dispatch has
 * started, the patient must cancel and create a new reservation instead.
 */
export async function updateBooking(
  client: SupabaseClient,
  bookingId: string,
  payload: UpdateBookingPayload
): Promise<void> {
  // Cast: the generated Args type marks defaultless plpgsql params as
  // non-null (Postgres doesn't expose per-arg nullability), but the RPC
  // genuinely accepts NULL for these optional booking fields.
  const { error } = await client.rpc("update_booking", {
    p_booking_id: bookingId,
    p_pickup_address: payload.pickup_address,
    p_pickup_lat: payload.pickup_lat,
    p_pickup_lng: payload.pickup_lng,
    p_dropoff_address: payload.dropoff_address,
    p_dropoff_lat: payload.dropoff_lat,
    p_dropoff_lng: payload.dropoff_lng,
    p_pickup_datetime: payload.pickup_datetime,
    p_return_datetime: payload.return_datetime,
    p_vehicle_type: payload.vehicle_type,
    p_trip_type: payload.trip_type,
    p_requires_wheelchair: payload.requires_wheelchair,
    p_requires_stretcher: payload.requires_stretcher,
    p_requires_oxygen: payload.requires_oxygen,
    p_passenger_count: payload.passenger_count,
    p_cpam_status: payload.cpam_status,
    p_mutual_name: payload.mutual_name,
    p_medical_notes: payload.medical_notes,
    p_distance_km: payload.distance_km,
    p_pickup_municipality: payload.pickup_municipality,
  } as Database["public"]["Functions"]["update_booking"]["Args"]);

  if (error) {
    if (error.message.includes("booking_not_editable")) {
      throw new Error("Cette réservation ne peut plus être modifiée (déjà en cours de traitement). Annulez-la et créez-en une nouvelle si besoin.");
    }
    logger.error("bookings.updateBooking failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Same as cancelBooking, but proves ownership via reference_code + phone
 * instead of the live auth.uid() session — for the lost-session recovery
 * flow (see lookupBookingByReference). Shares its rate-limit lockout.
 */
export async function cancelBookingByReference(
  client: SupabaseClient,
  referenceCode: string,
  phone: string,
  reason?: string
): Promise<void> {
  const { data, error } = await client.rpc("cancel_booking_by_reference", {
    p_reference_code: referenceCode,
    p_phone: phone,
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("too_many_attempts")) {
      throw new Error("Trop de tentatives pour cette référence. Réessayez dans 15 minutes ou contactez-nous directement.");
    }
    logger.error("bookings.cancelBookingByReference failed", { error: error.message });
    throw new Error(error.message);
  }

  if (data === "booking_not_found") {
    throw new Error("Réservation introuvable pour cette référence et ce numéro.");
  }
  if (data === "booking_not_cancellable") {
    throw new Error("Cette réservation ne peut plus être annulée (course déjà en cours ou terminée).");
  }
}

/**
 * Same as updateBooking, but proves ownership via reference_code + phone
 * instead of the live auth.uid() session — for the lost-session recovery
 * flow (see lookupBookingByReference). Shares its rate-limit lockout.
 */
export async function updateBookingByReference(
  client: SupabaseClient,
  referenceCode: string,
  phone: string,
  payload: UpdateBookingPayload
): Promise<void> {
  // See update_booking's cast comment above — same plpgsql nullability quirk.
  const { data, error } = await client.rpc("update_booking_by_reference", {
    p_reference_code: referenceCode,
    p_phone: phone,
    p_pickup_address: payload.pickup_address,
    p_pickup_lat: payload.pickup_lat,
    p_pickup_lng: payload.pickup_lng,
    p_dropoff_address: payload.dropoff_address,
    p_dropoff_lat: payload.dropoff_lat,
    p_dropoff_lng: payload.dropoff_lng,
    p_pickup_datetime: payload.pickup_datetime,
    p_return_datetime: payload.return_datetime,
    p_vehicle_type: payload.vehicle_type,
    p_trip_type: payload.trip_type,
    p_requires_wheelchair: payload.requires_wheelchair,
    p_requires_stretcher: payload.requires_stretcher,
    p_requires_oxygen: payload.requires_oxygen,
    p_passenger_count: payload.passenger_count,
    p_cpam_status: payload.cpam_status,
    p_mutual_name: payload.mutual_name,
    p_medical_notes: payload.medical_notes,
    p_distance_km: payload.distance_km,
    p_pickup_municipality: payload.pickup_municipality,
  } as Database["public"]["Functions"]["update_booking_by_reference"]["Args"]);

  if (error) {
    if (error.message.includes("too_many_attempts")) {
      throw new Error("Trop de tentatives pour cette référence. Réessayez dans 15 minutes ou contactez-nous directement.");
    }
    logger.error("bookings.updateBookingByReference failed", { error: error.message });
    throw new Error(error.message);
  }

  if (data === "booking_not_found") {
    throw new Error("Réservation introuvable pour cette référence et ce numéro.");
  }
  if (data === "booking_not_editable") {
    throw new Error("Cette réservation ne peut plus être modifiée (déjà en cours de traitement). Annulez-la et créez-en une nouvelle si besoin.");
  }
}

/**
 * Recovers a single booking by its human-friendly reference_code + phone
 * number, for when the anonymous browser session backing RLS access (see
 * fetchMyBookings) is lost — cleared cookies, private tab, different device.
 */
export async function lookupBookingByReference(
  client: SupabaseClient,
  referenceCode: string,
  phone: string
): Promise<MyBookingRow | null> {
  const { data, error } = await client.rpc("lookup_booking_by_reference", {
    p_reference_code: referenceCode,
    p_phone: phone,
  });

  if (error) {
    if (error.message.includes("too_many_attempts")) {
      throw new Error("Trop de tentatives pour cette référence. Réessayez dans 15 minutes ou contactez-nous directement.");
    }
    logger.error("bookings.lookupBookingByReference failed", { error: error.message });
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
}

/**
 * Same as rateBookingAsPatient, but proves ownership via reference_code +
 * phone instead of the live auth.uid() session — for the lost-session
 * recovery flow (see lookupBookingByReference). Shares its rate-limit
 * lockout. See migration 033's rate_booking_as_patient_by_reference RPC.
 */
export async function rateBookingAsPatientByReference(
  client: SupabaseClient,
  referenceCode: string,
  phone: string,
  rating: number,
  comment?: string
): Promise<void> {
  const { data, error } = await client.rpc("rate_booking_as_patient_by_reference", {
    p_reference_code: referenceCode,
    p_phone: phone,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) {
    if (error.message.includes("invalid_rating")) {
      throw new Error("La note doit être comprise entre 1 et 5 étoiles.");
    }
    if (error.message.includes("too_many_attempts")) {
      throw new Error("Trop de tentatives pour cette référence. Réessayez dans 15 minutes ou contactez-nous directement.");
    }
    logger.error("bookings.rateBookingAsPatientByReference failed", { error: error.message });
    throw new Error(error.message);
  }

  if (data === "booking_not_found") {
    throw new Error("Réservation introuvable pour cette référence et ce numéro.");
  }
  if (data === "booking_not_completed") {
    throw new Error("Cette course n'est pas encore terminée.");
  }
  if (data === "already_rated") {
    throw new Error("Vous avez déjà noté cette course.");
  }
}

/**
 * Aggregated server-side via the get_booking_status_counts RPC (GROUP BY in
 * Postgres) rather than fetching every row and reducing client-side — keeps
 * this cheap as the bookings table grows (see migration 042).
 */
export async function fetchBookingStatusCounts(
  client: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await client.rpc("get_booking_status_counts");
  if (error) {
    logger.error("bookings.fetchBookingStatusCounts failed", { error: error.message });
    throw new Error(error.message);
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
}

export async function fetchRidePool(client: SupabaseClient): Promise<PoolRide[]> {
  const { data, error } = await client
    .from("bookings_pool_for_drivers")
    .select("*")
    .eq("status", "available")
    .order("pickup_datetime", { ascending: true });

  if (error) {
    logger.error("bookings.fetchRidePool failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as PoolRide[];
}

export async function fetchDriverRides(
  client: SupabaseClient,
  driverId: string
): Promise<DriverRideRow[]> {
  const { data, error } = await client
    .from("bookings_active_for_driver")
    .select(
      "id, driver_id, patient_full_name, patient_phone, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, pickup_datetime, return_datetime, vehicle_type, trip_type, requires_wheelchair, requires_stretcher, requires_oxygen, passenger_count, estimated_price, status, created_at, distance_to_driver_km, driver_rating_given, patient_rating_received, patient_rating_avg, pmt_declared, is_hospitalization, series_index, series_total, series_id"
    )
    .eq("driver_id", driverId)
    .in("status", ["accepted", "in_progress", "completed"])
    .order("pickup_datetime", { ascending: false })
    .limit(20);

  if (error) {
    logger.error("bookings.fetchDriverRides failed", { error: error.message, driverId });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as DriverRideRow[];
}

/**
 * Single ride for the driver detail page (/tableau-de-bord/chauffeur/course/$id)
 * — same columns and view as fetchDriverRides, scoped to one id. The view's
 * "WHERE driver_id = auth.uid()" (see migration 039) already guarantees a
 * driver can't fetch another driver's ride by guessing its id.
 */
export async function fetchDriverRideById(
  client: SupabaseClient,
  rideId: string
): Promise<DriverRideRow | null> {
  const { data, error } = await client
    .from("bookings_active_for_driver")
    .select(
      "id, driver_id, patient_full_name, patient_phone, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, pickup_datetime, return_datetime, vehicle_type, trip_type, requires_wheelchair, requires_stretcher, requires_oxygen, passenger_count, estimated_price, status, created_at, distance_to_driver_km, driver_rating_given, patient_rating_received, patient_rating_avg, pmt_declared, is_hospitalization, series_index, series_total, series_id"
    )
    .eq("id", rideId)
    .maybeSingle();

  if (error) {
    logger.error("bookings.fetchDriverRideById failed", { error: error.message, rideId });
    throw new Error(error.message);
  }
  return data as unknown as DriverRideRow | null;
}

function mapRideLifecycleError(error: { message: string }, rideId: string, action: string): Error {
  if (error.message.includes("vehicle_not_compatible")) {
    return new Error("Votre véhicule n'est pas équipé pour cette course (fauteuil/brancard/oxygène).");
  }
  if (error.message.includes("booking_already_taken")) {
    return new Error("Cette course vient d'être acceptée par un autre chauffeur.");
  }
  if (error.message.includes("booking_priority_reserved")) {
    return new Error(
      "Cette course est temporairement réservée en priorité au chauffeur qui a accepté une autre séance de la même série."
    );
  }
  if (error.message.includes("booking_not_available")) {
    return new Error("Cette course n'est plus disponible.");
  }
  if (error.message.includes("driver_profile_incomplete")) {
    return new Error("Votre profil chauffeur est incomplet (véhicule non renseigné).");
  }
  if (error.message.includes("driver_pool_suspended")) {
    return new Error(
      "Votre accès au pool de courses est temporairement suspendu suite à des annulations répétées juste après acceptation."
    );
  }
  if (error.message.includes("not_a_driver")) {
    return new Error("Action réservée aux chauffeurs.");
  }
  if (error.message.includes("booking_not_startable")) {
    return new Error("Cette course ne peut pas être démarrée (elle n'est pas/plus acceptée).");
  }
  if (error.message.includes("booking_not_completable")) {
    return new Error("Cette course ne peut pas être terminée (elle n'est pas/plus en cours).");
  }
  if (error.message.includes("booking_not_found")) {
    return new Error("Course introuvable.");
  }
  if (error.message.includes("booking_not_cancellable_by_driver")) {
    return new Error("Cette course ne peut pas être annulée (elle n'est pas/plus affectée).");
  }
  if (error.message.includes("invalid_rating")) {
    return new Error("La note doit être comprise entre 1 et 5 étoiles.");
  }
  if (error.message.includes("booking_not_completed")) {
    return new Error("Cette course n'est pas encore terminée.");
  }
  if (error.message.includes("already_rated")) {
    return new Error("Vous avez déjà noté cette course.");
  }
  logger.error(`bookings.${action} failed`, { error: error.message, rideId });
  return new Error(error.message);
}

/**
 * Driver acceptance of a pool ride, via the accept_ride RPC (see migration
 * 018) — direct UPDATE is no longer granted to drivers, the RPC re-checks
 * vehicle/equipment compatibility server-side before locking the ride.
 */
export async function acceptRide(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("accept_ride", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "acceptRide");
  }
}

/**
 * Driver marks their own accepted ride as started (status -> in_progress,
 * picked_up_at stamped). See migration 018's start_ride RPC.
 */
export async function startRide(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("start_ride", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "startRide");
  }
}

/**
 * Driver marks their own in_progress ride as completed (status ->
 * completed, completed_at stamped). See migration 018's complete_ride RPC.
 */
export async function completeRide(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("complete_ride", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "completeRide");
  }
}

/**
 * Driver rates the patient (1-5 stars + optional comment) for one of their
 * own completed rides. See migration 033's rate_booking_as_driver RPC — one
 * rating per role per booking, not editable once submitted (already_rated).
 */
export async function rateBookingAsDriver(
  client: SupabaseClient,
  rideId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const { error } = await client.rpc("rate_booking_as_driver", {
    p_booking_id: rideId,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "rateBookingAsDriver");
  }
}

/**
 * Accepts all available rides in the same series as p_booking_id in one call
 * (migration 037). Returns the number of rides accepted.
 */
export async function acceptSeriesRides(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("accept_series", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "acceptSeriesRides");
  }
}

/**
 * Flips a freshly inserted booking from pending to available, putting it in
 * the driver pool — see migration 019. Called once, right after insertBooking
 * succeeds, since the patient insert RLS policy only allows status='pending'
 * on INSERT.
 */
export async function publishBooking(client: SupabaseClient, bookingId: string): Promise<void> {
  const { error } = await client.rpc("publish_booking", { p_booking_id: bookingId });

  if (error) {
    if (error.message.includes("booking_not_publishable")) {
      throw new Error("Impossible de publier la réservation auprès des chauffeurs.");
    }
    logger.error("bookings.publishBooking failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Driver backs out of their own accepted ride, via cancel_ride_by_driver
 * (see migration 020) — returns it to the pool (available, driver_id
 * cleared) rather than cancelling the patient's reservation outright.
 */
export async function cancelRideByDriver(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("cancel_ride_by_driver", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "cancelRideByDriver");
  }
}

/**
 * Driver refuses a pool ride (see migration 041's refuse_ride RPC) — hides it
 * from this driver's own pool (card + list views) only. The ride stays
 * 'available' and visible to every other compatible driver.
 */
export async function refuseRide(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("refuse_ride", { p_booking_id: rideId });

  if (error) {
    throw mapRideLifecycleError(error, rideId, "refuseRide");
  }
}

/**
 * Driver backs out of all accepted rides in the same series as rideId
 * (migration 038). Counts as a single suspicious-cancellation event.
 */
export async function cancelSeriesRides(client: SupabaseClient, rideId: string): Promise<void> {
  const { error } = await client.rpc("cancel_series" as never, { p_booking_id: rideId } as never);

  if (error) {
    throw mapRideLifecycleError(error, rideId, "cancelSeriesRides");
  }
}

export type ReminderTokenBooking = Database["public"]["Functions"]["resolve_reminder_token"]["Returns"][number];

/**
 * Read-only resolution of a day-before reminder token for the
 * /confirmer-trajet page (see migration 020's resolve_reminder_token).
 * Single-use, high-entropy token — the only proof of ownership needed here,
 * deliberately separate from the lower-entropy reference_code + phone flow.
 */
export async function resolveReminderToken(
  client: SupabaseClient,
  token: string
): Promise<ReminderTokenBooking | null> {
  const { data, error } = await client.rpc("resolve_reminder_token", { p_token: token });

  if (error) {
    if (error.message.includes("token_invalid")) {
      return null;
    }
    logger.error("bookings.resolveReminderToken failed", { error: error.message });
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
}

/**
 * Patient explicit confirmation from /confirmer-trajet — marks the token
 * used, stamps reminder_confirmed_at. Does not touch booking status.
 */
export async function confirmReminderToken(client: SupabaseClient, token: string): Promise<void> {
  const { error } = await client.rpc("confirm_reminder", { p_token: token });

  if (error) {
    if (error.message.includes("token_invalid")) {
      throw new Error("Ce lien de confirmation n'est plus valide.");
    }
    logger.error("bookings.confirmReminderToken failed", { error: error.message });
    throw new Error(error.message);
  }
}

/**
 * Patient explicit cancellation from /confirmer-trajet (double-confirmation
 * already happened client-side). Returns the booking_id so the caller can
 * trigger notifyBookingCancelledServerFn (also emails the assigned driver).
 */
export async function cancelBookingViaReminder(client: SupabaseClient, token: string): Promise<string> {
  const { data, error } = await client.rpc("cancel_via_reminder", { p_token: token });

  if (error) {
    if (error.message.includes("token_invalid")) {
      throw new Error("Ce lien de confirmation n'est plus valide.");
    }
    if (error.message.includes("booking_not_cancellable")) {
      throw new Error("Cette réservation ne peut plus être annulée (course déjà en cours ou terminée).");
    }
    logger.error("bookings.cancelBookingViaReminder failed", { error: error.message });
    throw new Error(error.message);
  }
  return data;
}

export async function insertBooking(
  client: SupabaseClient,
  payload: BookingInsert
): Promise<{ id: string; reference_code: string }> {
  const { data, error } = await client
    .from("bookings")
    .insert(payload)
    .select("id, reference_code")
    .single();

  if (error) {
    logger.error("bookings.insertBooking failed", {
      error: error.message,
      vehicle_type: payload.vehicle_type,
      cpam_status: payload.cpam_status,
    });
    throw new Error(error.message);
  }

  return data;
}
