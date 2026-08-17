import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import * as profilesRepository from "~/repositories/profilesRepository";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { sendBookingConfirmationEmail } from "./email";
import { sendPushToAllDrivers } from "./pushSend";
import { logger, withServerFnLogging } from "~/lib/logger";
import { captureServerEvent } from "~/lib/posthogServer";

interface SubmitBookingPayload {
  patient_id: string;
  patient_full_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_birth_date: string | null;
  booking_for_other: boolean;
  booker_full_name: string | null;
  booker_phone: string | null;
  booker_email: string | null;
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
  vehicle_type: Database["public"]["Tables"]["bookings"]["Row"]["vehicle_type"];
  trip_type: Database["public"]["Tables"]["bookings"]["Row"]["trip_type"];
  is_hospitalization: boolean;
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  cpam_status: Database["public"]["Tables"]["bookings"]["Row"]["cpam_status"];
  mutual_name: string | null;
  pmt_declared: boolean;
  pmt_file_url: string | null;
  medical_notes: string | null;
  consent_accepted_at: string;
  status: Database["public"]["Tables"]["bookings"]["Row"]["status"];
}

interface SubmitBookingInput {
  accessToken: string;
  payloads: SubmitBookingPayload[];
}

export const submitBookingServerFn = createServerFn({ method: "POST" })
  .validator((input: SubmitBookingInput) => input)
  .handler(async ({ data }) =>
    withServerFnLogging(
      "submitBooking",
      { patientId: data.payloads[0]?.patient_id, ridesCount: data.payloads.length },
      async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
          auth: { persistSession: false },
        });

        const [firstPayload] = data.payloads;

        // bookings.patient_id is a NOT NULL FK to profiles — self-heal a missing
        // profile row (same known trigger-reliability issue as driver signups,
        // see migration 017) before inserting, instead of letting the FK
        // violation surface to the patient mid-booking.
        const admin = getSupabaseAdminClient();
        const profile = await profilesRepository.ensureProfile(admin, firstPayload.patient_id);
        if (!profile) {
          throw new Error("Impossible de finaliser la réservation (profil introuvable). Réessayez.");
        }

        const isSeries = data.payloads.length > 1;
        const seriesId = isSeries ? crypto.randomUUID() : null;

        const bookings: { id: string; reference_code: string }[] = [];
        for (const [index, payload] of data.payloads.entries()) {
          const booking = await bookingsRepository.insertBooking(supabase, {
            ...payload,
            series_id: seriesId,
            series_index: isSeries ? index + 1 : null,
            series_total: isSeries ? data.payloads.length : null,
          });
          await bookingsRepository.publishBooking(supabase, booking.id);
          bookings.push(booking);
        }

        const [firstBooking] = bookings;

        // Événement métier fiable (indépendant d'un éventuel bloqueur de pub
        // côté navigateur) — aucune donnée d'identité ou de santé (nom,
        // téléphone, adresse, medical_notes) dans les properties, seulement
        // des caractéristiques de la course. Fire-and-forget : ne doit pas
        // retarder la confirmation de réservation.
        captureServerEvent(firstPayload.patient_id, "booking_created", {
          vehicle_type: firstPayload.vehicle_type,
          trip_type: firstPayload.trip_type,
          is_hospitalization: firstPayload.is_hospitalization,
          requires_wheelchair: firstPayload.requires_wheelchair,
          requires_stretcher: firstPayload.requires_stretcher,
          requires_oxygen: firstPayload.requires_oxygen,
          passenger_count: firstPayload.passenger_count,
          cpam_status: firstPayload.cpam_status,
          pmt_declared: firstPayload.pmt_declared,
          pickup_municipality: firstPayload.pickup_municipality,
          distance_km: firstPayload.distance_km,
          booking_for_other: firstPayload.booking_for_other,
          is_series: isSeries,
          series_total: isSeries ? data.payloads.length : undefined,
        }).catch(() => {
          // Best-effort — voir captureServerEvent, déjà loggé en interne.
        });

        const confirmationEmail =
          firstPayload.booking_for_other && firstPayload.booker_email
            ? firstPayload.booker_email
            : firstPayload.patient_email;

        if (confirmationEmail) {
          await sendBookingConfirmationEmail({
            to: confirmationEmail,
            patientFullName: firstPayload.patient_full_name,
            bookerFullName: firstPayload.booking_for_other ? (firstPayload.booker_full_name ?? undefined) : undefined,
            referenceCode: firstBooking.reference_code,
            pickupAddress: firstPayload.pickup_address,
            dropoffAddress: firstPayload.dropoff_address,
            pickupDatetime: firstPayload.pickup_datetime,
            seriesTotal: isSeries ? data.payloads.length : undefined,
            seriesLastPickupDatetime: isSeries
              ? data.payloads[data.payloads.length - 1].pickup_datetime
              : undefined,
          });
        }

        // Notify all subscribed drivers of new pool ride — fire-and-forget
        sendPushToAllDrivers({
          title: "Nouvelle course disponible",
          body: isSeries
            ? `Série de ${data.payloads.length} séances — ${firstPayload.pickup_address}`
            : `${firstPayload.pickup_address} → ${firstPayload.dropoff_address}`,
          url: "/tableau-de-bord/chauffeur",
          tag: `new-ride-${firstBooking.id}`,
        }).catch((err: unknown) => {
          logger.error("booking.notifyDrivers failed", {
            error: err instanceof Error ? err.message : String(err),
            bookingId: firstBooking.id,
          });
        });

        return { ...firstBooking, seriesTotal: isSeries ? data.payloads.length : undefined };
      }
    )
  );
