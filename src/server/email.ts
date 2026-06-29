import { createServerFn } from "@tanstack/react-start";
import { getResendClient, EMAIL_FROM, ADMIN_NOTIFICATION_EMAIL } from "~/lib/resend";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";
import {
  bookingConfirmationEmail,
  bookingCancellationEmail,
  bookingAcceptedEmail,
  bookingUpdatedDriverEmail,
  rideUnassignedByDriverEmail,
  bookingCancelledDriverEmail,
  driverApprovedEmail,
  adminNewDriverApplicationEmail,
} from "./emailTemplates";

// All sends here are best-effort: a Resend failure must never break the
// booking/cancellation/approval flow it's attached to, so every function
// catches and logs rather than throwing.

export async function sendBookingConfirmationEmail(params: {
  to: string;
  patientFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
}): Promise<void> {
  try {
    const { subject, html } = bookingConfirmationEmail(params);
    const { error } = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html,
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    logger.error("email.sendBookingConfirmationEmail failed", {
      error: error instanceof Error ? error.message : String(error),
      referenceCode: params.referenceCode,
    });
  }
}

export const notifyBookingCancelledServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        "patient_full_name, patient_email, reference_code, pickup_datetime, cancellation_reason, status, driver_id"
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "cancelled") {
      return;
    }

    if (booking.patient_email) {
      try {
        const { subject, html } = bookingCancellationEmail({
          patientFullName: booking.patient_full_name,
          referenceCode: booking.reference_code,
          pickupDatetime: booking.pickup_datetime,
          cancellationReason: booking.cancellation_reason,
        });
        const { error: sendApiError } = await getResendClient().emails.send({
          from: EMAIL_FROM,
          to: booking.patient_email,
          subject,
          html,
        });
        if (sendApiError) {
          throw new Error(sendApiError.message);
        }
      } catch (sendError) {
        logger.error("email.notifyBookingCancelled failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: data.bookingId,
        });
      }
    }

    // A driver may already have accepted this ride before the patient
    // cancelled — they otherwise have no way of knowing it disappeared.
    // Independent of the patient email above: one failing must not skip the other.
    if (booking.driver_id) {
      try {
        const { data: driverProfile } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", booking.driver_id)
          .single();

        if (driverProfile?.email) {
          const { subject, html } = bookingCancelledDriverEmail({
            driverFullName: driverProfile.full_name,
            referenceCode: booking.reference_code,
            pickupDatetime: booking.pickup_datetime,
          });
          const { error: sendApiError } = await getResendClient().emails.send({
            from: EMAIL_FROM,
            to: driverProfile.email,
            subject,
            html,
          });
          if (sendApiError) {
            throw new Error(sendApiError.message);
          }
        }
      } catch (sendError) {
        logger.error("email.notifyBookingCancelled (driver) failed", {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          bookingId: data.bookingId,
        });
      }
    }
  });

export const notifyBookingAcceptedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select(
        "patient_full_name, patient_email, reference_code, pickup_address, dropoff_address, pickup_datetime, status, driver_id"
      )
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "accepted" || !booking.patient_email || !booking.driver_id) {
      return;
    }

    const [{ data: driverProfile }, { data: driverDetails }] = await Promise.all([
      admin.from("profiles").select("full_name, phone").eq("id", booking.driver_id).single(),
      admin
        .from("drivers_details")
        .select("vehicle_brand, vehicle_model, vehicle_registration")
        .eq("profile_id", booking.driver_id)
        .single(),
    ]);

    if (!driverProfile) {
      return;
    }

    try {
      const { subject, html } = bookingAcceptedEmail({
        patientFullName: booking.patient_full_name,
        referenceCode: booking.reference_code,
        pickupAddress: booking.pickup_address,
        dropoffAddress: booking.dropoff_address,
        pickupDatetime: booking.pickup_datetime,
        driverFullName: driverProfile.full_name,
        driverPhone: driverProfile.phone,
        vehicleBrand: driverDetails?.vehicle_brand ?? null,
        vehicleModel: driverDetails?.vehicle_model ?? null,
        vehicleRegistration: driverDetails?.vehicle_registration ?? null,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: booking.patient_email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyBookingAccepted failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyBookingUpdatedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("reference_code, pickup_address, dropoff_address, pickup_datetime, status, driver_id")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "accepted" || !booking.driver_id) {
      return;
    }

    try {
      const { data: driverProfile } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", booking.driver_id)
        .single();

      if (!driverProfile?.email) {
        return;
      }

      const { subject, html } = bookingUpdatedDriverEmail({
        driverFullName: driverProfile.full_name,
        referenceCode: booking.reference_code,
        pickupAddress: booking.pickup_address,
        dropoffAddress: booking.dropoff_address,
        pickupDatetime: booking.pickup_datetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: driverProfile.email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyBookingUpdated failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyRideUnassignedServerFn = createServerFn({ method: "POST" })
  .validator((input: { bookingId: string }) => input)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("patient_full_name, patient_email, reference_code, pickup_datetime, status")
      .eq("id", data.bookingId)
      .single();

    if (error || !booking || booking.status !== "available" || !booking.patient_email) {
      return;
    }

    try {
      const { subject, html } = rideUnassignedByDriverEmail({
        patientFullName: booking.patient_full_name,
        referenceCode: booking.reference_code,
        pickupDatetime: booking.pickup_datetime,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: booking.patient_email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyRideUnassigned failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        bookingId: data.bookingId,
      });
    }
  });

export const notifyAdminNewDriverApplicationServerFn = createServerFn({ method: "POST" })
  .validator((input: { driverDetailsId: string }) => input)
  .handler(async ({ data: input }) => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("drivers_details")
      .select("vehicle_type, vehicle_registration, siret, company_name, profiles:profile_id(full_name, email, phone)")
      .eq("id", input.driverDetailsId)
      .single();

    const driver = data as unknown as {
      vehicle_type: string;
      vehicle_registration: string;
      siret: string;
      company_name: string | null;
      profiles: { full_name: string; email: string | null; phone: string | null } | null;
    } | null;

    if (error || !driver || !driver.profiles?.email) {
      return;
    }

    try {
      const { subject, html } = adminNewDriverApplicationEmail({
        driverFullName: driver.profiles.full_name,
        driverEmail: driver.profiles.email,
        driverPhone: driver.profiles.phone,
        vehicleType: driver.vehicle_type,
        vehicleRegistration: driver.vehicle_registration,
        siret: driver.siret,
        companyName: driver.company_name,
      });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: ADMIN_NOTIFICATION_EMAIL,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyAdminNewDriverApplication failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        driverDetailsId: input.driverDetailsId,
      });
    }
  });

export const notifyDriverApprovedServerFn = createServerFn({ method: "POST" })
  .validator((input: { driverDetailsId: string }) => input)
  .handler(async ({ data: input }) => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("drivers_details")
      .select("approved_at, profiles:profile_id(full_name, email)")
      .eq("id", input.driverDetailsId)
      .single();

    const driver = data as unknown as {
      approved_at: string | null;
      profiles: { full_name: string; email: string | null } | null;
    } | null;
    const profile = driver?.profiles;

    if (error || !driver || !driver.approved_at || !profile?.email) {
      return;
    }

    try {
      const { subject, html } = driverApprovedEmail({ driverFullName: profile.full_name });
      const { error: sendApiError } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: profile.email,
        subject,
        html,
      });
      if (sendApiError) {
        throw new Error(sendApiError.message);
      }
    } catch (sendError) {
      logger.error("email.notifyDriverApproved failed", {
        error: sendError instanceof Error ? sendError.message : String(sendError),
        driverDetailsId: input.driverDetailsId,
      });
    }
  });
